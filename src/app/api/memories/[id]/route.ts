import { NextRequest, NextResponse } from "next/server";
import { MemoryRepository } from "@/lib/repositories/memory-repository";
import { requireApiAuth } from "@/lib/auth/require-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "MEMORY_ID_REQUIRED", message: "Memory ID parameter is missing" },
        { status: 400 }
      );
    }

    const memoryRepo = new MemoryRepository(auth.supabase);
    await memoryRepo.deleteMemory(id, auth.user.id);

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
