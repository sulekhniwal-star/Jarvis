import { NextResponse } from 'next/server';
import { validateWebhookSecret } from '@jarvis/telegram-integration';
import { telegramRouter } from '@/lib/services';

export async function POST(req: Request) {
  try {
    const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || 'dev-secret';

    // Verify secret token
    if (!validateWebhookSecret(incomingSecret, expectedSecret)) {
      return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
    }

    const update = await req.json();
    await telegramRouter.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error handling Telegram webhook:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
