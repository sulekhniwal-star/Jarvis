import { NextRequest, NextResponse } from "next/server";
import { RepoSyncMonitor } from "@/lib/github/sync-monitor";

const monitor = new RepoSyncMonitor();

export async function GET(_request: NextRequest) {
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

export async function POST(_request: NextRequest) {
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
