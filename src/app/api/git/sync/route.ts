import { NextResponse } from "next/server";
import { RepoSyncMonitor } from "@/lib/github/sync-monitor";
import { requireApiAuth } from "@/lib/auth/require-auth";

const monitor = new RepoSyncMonitor();

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const status = await monitor.getSyncStatus();
    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    const message = (error as Error).message || "Internal server error";
    return NextResponse.json(
      { error: "SYNC_MONITOR_ERROR", message },
      { status: 500 }
    );
  }
}

export async function POST() {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    monitor.clearCache();
    const status = await monitor.getSyncStatus({ bypassCache: true });
    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    const message = (error as Error).message || "Internal server error";
    return NextResponse.json(
      { error: "SYNC_REFRESH_ERROR", message },
      { status: 500 }
    );
  }
}
