import { NextResponse } from "next/server";
import { SystemHealthDiagnosticService } from "@/lib/ops/health-checker";

export const dynamic = "force-dynamic";

export async function GET() {
  const service = new SystemHealthDiagnosticService();
  const report = await service.getHealthReport({ timeoutMs: 180 });

  const statusCode = report.status === "unhealthy" ? 503 : 200;

  return NextResponse.json(report, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "X-Response-Time-Ms": String(report.durationMs),
    },
  });
}
