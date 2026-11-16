import * as crypto from "crypto";
import { SecretType } from "./types";

export interface SecretPatternDefinition {
  type: SecretType;
  name: string;
  regex: RegExp;
  description: string;
}

export const KNOWN_SECRET_PATTERNS: SecretPatternDefinition[] = [
  {
    type: "private_key",
    name: "Private Key",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    description: "Cryptographic private key file header or certificate block",
  },
  {
    type: "anthropic_key",
    name: "Anthropic API Key",
    regex: /\bsk-ant-api[0-9]{2}-[a-zA-Z0-9_\-]{80,}\b/,
    description: "Anthropic Claude API secret key",
  },
  {
    type: "openrouter_key",
    name: "OpenRouter API Key",
    regex: /\bsk-or-v1-[a-f0-9]{64}\b/,
    description: "OpenRouter API key",
  },
  {
    type: "openai_key",
    name: "OpenAI API Key",
    regex: /\bsk-(?:live-|proj-)?[a-zA-Z0-9]{20,T3BlbkFJ[a-zA-Z0-9]{20,}\b|\bsk-[a-zA-Z0-9]{48,}\b/,
    description: "OpenAI API authentication token",
  },
  {
    type: "google_gemini_key",
    name: "Google / Gemini API Key",
    regex: /\bAIzaSy[a-zA-Z0-9_-]{33}\b/,
    description: "Google AI / Gemini developer API key",
  },
  {
    type: "github_token",
    name: "GitHub Personal Access Token",
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}\b|\bgithub_pat_[a-zA-Z0-9_]{82}\b/,
    description: "GitHub Personal Access Token or OAuth secret",
  },
  {
    type: "slack_token",
    name: "Slack Token",
    regex: /\bxox[baprs]-[0-9a-zA-Z]{10,48}\b/,
    description: "Slack Bot or User API token",
  },
  {
    type: "telegram_token",
    name: "Telegram Bot Token",
    regex: /\b[0-9]{8,10}:[a-zA-Z0-9_-]{35}\b/,
    description: "Telegram Bot API token",
  },
  {
    type: "aws_access_key",
    name: "AWS Access Key ID",
    regex: /\bAKIA[0-9A-Z]{16}\b/,
    description: "Amazon Web Services Access Key ID",
  },
  {
    type: "jwt",
    name: "JSON Web Token (JWT)",
    regex: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/,
    description: "Signed JWT credential / bearer token",
  },
  {
    type: "database_connection",
    name: "Database Connection URI",
    regex: /(?:postgres|postgresql|mysql|mongodb\+srv|redis):\/\/[^\s:]+:[^\s@]+@[^\s\/]+/,
    description: "Database connection URI with embedded credentials",
  },
  {
    type: "hardcoded_secret",
    name: "Hardcoded Secret Assignment",
    regex: /(?:SUPABASE_SERVICE_ROLE_KEY|OPENROUTER_API_KEY|TELEGRAM_BOT_TOKEN|SECRET_KEY|API_SECRET)\s*=\s*['"]?[a-zA-Z0-9_\-\.]{16,}['"]?/i,
    description: "Direct variable or environment assignment of sensitive secret",
  },
];

/**
 * Deterministically computes a 16-character SHA-256 fingerprint for a secret token.
 * This fingerprint is safe to store, log, and pass to human approval cards.
 */
export function generateSecretFingerprint(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token.trim())
    .digest("hex")
    .slice(0, 16);
}

/**
 * Masks a secret token, keeping at most first 2 and last 2 characters.
 * Example: `sk-ant-api03-...1a` -> `[REDACTED_SECRET:sk...1a]`
 */
export function redactSecretToken(token: string): string {
  const trimmed = token.trim();
  if (trimmed.length <= 6) {
    return "[REDACTED_SECRET]";
  }
  const prefix = trimmed.slice(0, 2);
  const suffix = trimmed.slice(-2);
  return `[REDACTED_SECRET:${prefix}...${suffix}]`;
}
