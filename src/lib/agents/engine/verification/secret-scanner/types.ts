export type SecretType =
  | "private_key"
  | "openai_key"
  | "anthropic_key"
  | "openrouter_key"
  | "google_gemini_key"
  | "github_token"
  | "slack_token"
  | "jwt"
  | "database_connection"
  | "aws_access_key"
  | "aws_secret_key"
  | "telegram_token"
  | "generic_high_entropy"
  | "hardcoded_secret";

export type SecretSeverity = "blocker" | "warning";

export interface SecretFinding {
  secretType: SecretType;
  name?: string;
  line: number;
  file?: string;
  description: string;
  redactedSnippet: string;
  fingerprint: string;
  entropyScore?: number;
  severity: SecretSeverity;
  isOverridden?: boolean;
}

export interface SecretScanOptions {
  minEntropyThreshold?: number;
  allowedFingerprints?: string[];
  allowPlaceholders?: boolean;
}

export interface SecretScanReport {
  passed: boolean;
  findings: SecretFinding[];
  scannedLinesCount: number;
  secretsCount: number;
  markdownSummary: string;
}
