import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { secretScanner } from "@/lib/agents/engine/verification";

const SecretScanRequestSchema = z.object({
  content: z.string({ message: "content must be a string" }),
  isDiff: z.boolean().optional(),
  filePath: z.string().optional(),
  allowedFingerprints: z.array(z.string()).optional(),
  minEntropyThreshold: z.number().optional(),
  allowPlaceholders: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json(
    {
      description:
        "Pre-Commit Entropy & Secret Scanner API endpoint (REQ-VR-03, NFR-SEC-02). Inspects code additions and unified git diffs for credentials and high-entropy secrets.",
      entropyThreshold: 4.3,
      hexEntropyThreshold: 3.2,
      supportedSecretTypes: [
        "private_key",
        "openai_key",
        "anthropic_key",
        "openrouter_key",
        "google_gemini_key",
        "github_token",
        "slack_token",
        "jwt",
        "database_connection",
        "aws_access_key",
        "aws_secret_key",
        "telegram_token",
        "generic_high_entropy",
        "hardcoded_secret",
      ],
      overrideInstructions:
        "To allow an intentional test fixture or token, approve the finding's fingerprint via Telegram approval card or pass the fingerprint in allowedFingerprints.",
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = SecretScanRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      content,
      isDiff,
      filePath,
      allowedFingerprints,
      minEntropyThreshold,
      allowPlaceholders,
    } = parseResult.data;

    const report = isDiff
      ? secretScanner.scanDiff(content, {
          allowedFingerprints,
          minEntropyThreshold,
          allowPlaceholders,
        })
      : secretScanner.scanText(content, filePath, {
          allowedFingerprints,
          minEntropyThreshold,
          allowPlaceholders,
        });

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    const message = (error as Error).message || "Internal server error";
    return NextResponse.json(
      { error: "SECRET_SCAN_ERROR", message },
      { status: 500 }
    );
  }
}
