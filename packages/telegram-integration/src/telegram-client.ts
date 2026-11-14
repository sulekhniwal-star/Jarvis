import type {
  SendMessageOptions,
  EditMessageTextOptions,
  AnswerCallbackQueryOptions,
  TelegramMessage,
} from './types.js';

export interface ITelegramClient {
  sendMessage(options: SendMessageOptions): Promise<TelegramMessage>;
  editMessageText(options: EditMessageTextOptions): Promise<TelegramMessage | boolean>;
  answerCallbackQuery(options: AnswerCallbackQueryOptions): Promise<boolean>;
}

export class TelegramBotClient implements ITelegramClient {
  private readonly baseUrl: string;

  constructor(
    private readonly botToken: string,
    customApiUrl = 'https://api.telegram.org'
  ) {
    this.baseUrl = `${customApiUrl}/bot${this.botToken}`;
  }

  async sendMessage(options: SendMessageOptions): Promise<TelegramMessage> {
    const res = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    const json = (await res.json()) as { ok: boolean; result: TelegramMessage; description?: string };
    if (!json.ok) {
      throw new Error(`Telegram sendMessage failed: ${json.description || 'Unknown error'}`);
    }
    return json.result;
  }

  async editMessageText(options: EditMessageTextOptions): Promise<TelegramMessage | boolean> {
    const res = await fetch(`${this.baseUrl}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    const json = (await res.json()) as { ok: boolean; result: TelegramMessage | boolean; description?: string };
    if (!json.ok) {
      throw new Error(`Telegram editMessageText failed: ${json.description || 'Unknown error'}`);
    }
    return json.result;
  }

  async answerCallbackQuery(options: AnswerCallbackQueryOptions): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    const json = (await res.json()) as { ok: boolean; result: boolean; description?: string };
    if (!json.ok) {
      throw new Error(`Telegram answerCallbackQuery failed: ${json.description || 'Unknown error'}`);
    }
    return json.result;
  }
}
