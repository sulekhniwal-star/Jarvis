import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AuditLedgerService } from "@/lib/audit/audit-ledger";

const CreateAuditEventSchema = z.object({
  eventType: z.string().min(1, "Event type is required"),
  resourceType: z.string().min(1, "Resource type is required"),
  resourceId: z.string().min(1, "Resource ID is required"),
  details: z.record(z.string(), z.unknown()).optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      return NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "User is not authenticated" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get("eventType") || undefined;
    const resourceType = searchParams.get("resourceType") || undefined;
    const resourceId = searchParams.get("resourceId") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 50;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!, 10)
      : 0;

    const auditService = new AuditLedgerService(supabase);
    const result = await auditService.listEvents(user.id, {
      eventType,
      resourceType,
      resourceId,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: "AUDIT_QUERY_FAILED", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      return NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "User is not authenticated" },
        { status: 401 }
      );
    }

    const json = await request.json();
    const validated = CreateAuditEventSchema.safeParse(json);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid audit event input",
          issues: validated.error.issues,
        },
        { status: 400 }
      );
    }

    const auditService = new AuditLedgerService(supabase);
    const record = await auditService.recordEvent({
      userId: user.id,
      eventType: validated.data.eventType,
      resourceType: validated.data.resourceType,
      resourceId: validated.data.resourceId,
      details: validated.data.details,
      ipAddress: validated.data.ipAddress,
      userAgent: validated.data.userAgent,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: "AUDIT_RECORD_FAILED", message: error.message },
      { status: 500 }
    );
  }
}
