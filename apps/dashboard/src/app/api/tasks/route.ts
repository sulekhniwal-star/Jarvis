import { NextResponse } from 'next/server';
import { taskCoordinator, taskRepo, DEFAULT_ADMIN_USER_ID } from '@/lib/services';
import { CreateTaskInputSchema } from '@jarvis/shared-contracts';

export async function GET() {
  try {
    const tasks = await taskRepo.listByUser(DEFAULT_ADMIN_USER_ID);
    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list tasks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = CreateTaskInputSchema.parse(body);

    const task = await taskCoordinator.createTask(validated, DEFAULT_ADMIN_USER_ID);
    return NextResponse.json({ ok: true, task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid task input' }, { status: 400 });
  }
}
