import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MemoryRepository } from "@/lib/repositories/memory-repository";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "MEMORY_ID_REQUIRED", message: "Memory ID parameter is missing" },
        { status: 400 }
      );
    }

    let supabase;
    let userId = "00000000-0000-0000-0000-000000000001";

    try {
      supabase = await createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch {
      supabase = createAdminClient();
    }

    const memoryRepo = new MemoryRepository(supabase);
    await memoryRepo.deleteMemory(id, userId);

    return NextResponse.json(
      { success: true, message: `Memory '${id}' deleted successfully` },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: error?.message || "Failed to delete memory",
      },
      { status: 500 }
    );
  }
}
