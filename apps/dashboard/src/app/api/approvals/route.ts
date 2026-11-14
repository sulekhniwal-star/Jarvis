import { NextResponse } from 'next/server';
import { permissionEngine, DEFAULT_ADMIN_USER_ID } from '@/lib/services';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { approvalId, decision, comment } = body;

    if (!approvalId || !['APPROVED', 'REJECTED'].includes(decision)) {
      return NextResponse.json(
        { error: 'approvalId and valid decision (APPROVED or REJECTED) are required' },
        { status: 400 }
      );
    }

    const resolved = await permissionEngine.resolveApproval(
      approvalId,
      DEFAULT_ADMIN_USER_ID,
      decision,
      comment
    );

    return NextResponse.json({ ok: true, resolved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resolve approval' }, { status: 500 });
  }
}
