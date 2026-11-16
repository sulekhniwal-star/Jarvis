/**
 * Shannon Entropy and High-Entropy Token Extractor (REQ-VR-03, NFR-SEC-02).
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_SHA_REGEX = /^[0-9a-f]{40}$/i;
const DATA_URI_REGEX = /^data:[a-zA-Z0-9\/\+]+;base64,/i;

const PLACEHOLDER_PREFIXES = [
  "placeholder-",
  "sk-xxx",
  "sk-test-",
  "test-token-",
  "mock-secret-",
  "example-key-",
  "changeme",
  "your-api-key",
];

/**
 * Calculates Shannon Information Entropy for a string in bits per character.
 * H(X) = - sum( P(x) * log2(P(x)) )
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;

  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

export interface EntropyTokenFinding {
  token: string;
  entropy: number;
}

/**
 * Extracts candidate high-entropy tokens from a single text line.
 * Filters out common non-secret tokens such as UUIDs, git commit SHAs, and test placeholders.
 */
export function extractHighEntropyTokens(
  line: string,
  minEntropy: number = 4.3,
  allowPlaceholders: boolean = false
): EntropyTokenFinding[] {
  if (!line || line.trim().length === 0) {
    return [];
  }

  // Tokenize line by whitespace, quotes, delimiters, and common code syntax
  const rawTokens = line
    .split(/[\s"',;:=()<>{}[\]`|\\]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 20);

  const findings: EntropyTokenFinding[] = [];
  const seenTokens = new Set<string>();

  for (const token of rawTokens) {
    if (seenTokens.has(token)) continue;
    seenTokens.add(token);

    // Filter UUIDs
    if (UUID_REGEX.test(token)) continue;

    // Filter Git SHAs
    if (HEX_SHA_REGEX.test(token)) continue;

    // Filter Data URIs
    if (DATA_URI_REGEX.test(token)) continue;

    // Filter Placeholders
    if (
      !allowPlaceholders &&
      PLACEHOLDER_PREFIXES.some((prefix) =>
        token.toLowerCase().startsWith(prefix)
      )
    ) {
      continue;
    }

    // Filter common URLs/domains without embedded credentials
    if (
      token.includes("://") &&
      !token.includes("@") &&
      !token.includes("token=") &&
      !token.includes("key=")
    ) {
      continue;
    }

    const entropy = calculateShannonEntropy(token);

    // Pure hex strings have maximum possible entropy of log2(16) = 4.0
    const isPureHex = /^[0-9a-fA-F]+$/.test(token);
    const effectiveThreshold = isPureHex ? Math.min(3.2, minEntropy * 0.75) : minEntropy;

    if (entropy >= effectiveThreshold) {
      findings.push({ token, entropy });
    }
  }

  return findings;
}
