import { NextResponse } from 'next/server';
import { taskCoordinator, taskRepo, DEFAULT_ADMIN_USER_ID } from '@/lib/services';
import type { TaskStatus } from '@jarvis/database';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, reason } = body;

    const task = await taskRepo.getById(id, DEFAULT_ADMIN_USER_ID);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    let updated;
    switch (action) {
      case 'DISPATCH':
        updated = await taskCoordinator.dispatchTask(id, DEFAULT_ADMIN_USER_ID);
        break;

      case 'CANCEL':
        updated = await taskCoordinator.cancelTask(
          id,
          DEFAULT_ADMIN_USER_ID,
          reason || 'Cancelled via Dashboard'
        );
        break;

      case 'EMERGENCY_ABORT':
        updated = await taskCoordinator.transitionTask(
          id,
          DEFAULT_ADMIN_USER_ID,
          'EMERGENCY_ABORTED',
          task.version
        );
        break;

      case 'TRANSITION':
        const targetStatus = body.targetStatus as TaskStatus;
        if (!targetStatus) {
          return NextResponse.json({ error: 'targetStatus required' }, { status: 400 });
        }
        updated = await taskCoordinator.transitionTask(
          id,
          DEFAULT_ADMIN_USER_ID,
          targetStatus,
          task.version
        );
        break;

      default:
        return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, task: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Transition failed' }, { status: 500 });
  }
}
