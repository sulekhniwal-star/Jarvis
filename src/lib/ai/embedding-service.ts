export interface EmbeddingServiceOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  dimension?: number;
  timeoutMs?: number;
}

export class EmbeddingService {
  public static readonly DEFAULT_DIMENSION = 1536;
  public static readonly DEFAULT_MODEL = "text-embedding-3-small";
  public static readonly DEFAULT_BASE_URL =
    "https://openrouter.ai/api/v1/embeddings";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly dimension: number;
  private readonly timeoutMs: number;

  constructor(options: EmbeddingServiceOptions = {}) {
    this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY || "";
    this.baseUrl = options.baseUrl || EmbeddingService.DEFAULT_BASE_URL;
    this.model = options.model || EmbeddingService.DEFAULT_MODEL;
    this.dimension = options.dimension || EmbeddingService.DEFAULT_DIMENSION;
    this.timeoutMs = options.timeoutMs || 10000;
  }

  /**
   * Generates a 1536-dimensional vector embedding for the input text.
   * Uses OpenRouter / OpenAI embeddings API if available, falling back
   * seamlessly to a deterministic unit-normalized local generator if offline or unconfigured.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    const trimmed = text.trim();
    if (!trimmed) {
      return this.deterministicLocalEmbedding("");
    }

    if (this.apiKey) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://jarvis.internal",
            "X-Title": "Jarvis Semantic Memory",
          },
          body: JSON.stringify({
            model: this.model,
            input: trimmed,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (response.ok) {
          const json = await response.json();
          const embedding = json?.data?.[0]?.embedding;
          if (Array.isArray(embedding) && embedding.length > 0) {
            return this.normalizeVector(embedding, this.dimension);
          }
        }
      } catch {
        // Fallback to deterministic local generator
      }
    }

    return this.deterministicLocalEmbedding(trimmed, this.dimension);
  }

  /**
   * Generates a deterministic, reproducible unit-normalized vector of specified dimension
   * using a seeded token-frequency and n-gram hash projection algorithm.
   */
  public deterministicLocalEmbedding(
    text: string,
    dimension: number = this.dimension
  ): number[] {
    const vector = new Array<number>(dimension).fill(0);
    const normalizedText = text.toLowerCase().trim();

    if (!normalizedText) {
      // Return zero unit vector with first dimension set to 1
      vector[0] = 1.0;
      return vector;
    }

    // Tokenize words and character n-grams
    const tokens = normalizedText.split(/\s+/).filter(Boolean);
    const ngrams: string[] = [];

    // Extract 2-grams and 3-grams
    for (let i = 0; i < normalizedText.length - 2; i++) {
      ngrams.push(normalizedText.substring(i, i + 3));
    }

    const allFeatures = [...tokens, ...ngrams];

    for (const feature of allFeatures) {
      const hash = this.hashString(feature);

      // Distribute feature across multiple vector indices using deterministic pseudo-random seeds
      let seed = hash;
      for (let step = 0; step < 4; step++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const index = seed % dimension;
        const sign = (seed & 1) === 0 ? 1.0 : -1.0;
        const weight = 1.0 / (step + 1);

        vector[index] = (vector[index] ?? 0) + sign * weight;
      }
    }

    return this.normalizeVector(vector, dimension);
  }

  /**
   * Normalizes a vector to unit Euclidean norm ($L_2$ norm = 1.0) and pads/truncates to dimension.
   */
  public normalizeVector(raw: number[], targetDim: number = this.dimension): number[] {
    const out = new Array<number>(targetDim).fill(0);

    for (let i = 0; i < Math.min(raw.length, targetDim); i++) {
      out[i] = raw[i] ?? 0;
    }

    // Compute Euclidean norm
    let sumSq = 0;
    for (let i = 0; i < targetDim; i++) {
      const val = out[i] ?? 0;
      sumSq += val * val;
    }

    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      for (let i = 0; i < targetDim; i++) {
        out[i] = (out[i] ?? 0) / norm;
      }
    } else {
      out[0] = 1.0;
    }

    return out;
  }

  /**
   * Computes the cosine similarity between two unit-normalized vectors:
   * $\cos(\theta) = \sum A_i \cdot B_i$
   * Returns a value between -1.0 and 1.0 (or 0.0 to 1.0 for positive spaces).
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length === 0 || vecB.length === 0) return 0;
    const len = Math.min(vecA.length, vecB.length);

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      const a = vecA[i] ?? 0;
      const b = vecB[i] ?? 0;
      dot += a * b;
      normA += a * a;
      normB += b * b;
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0) return 0;

    const similarity = dot / denom;
    // Bound precision errors to [-1, 1]
    return Math.max(-1, Math.min(1, similarity));
  }

  /**
   * 32-bit FNV-1a string hash algorithm
   */
  private hashString(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }
}
