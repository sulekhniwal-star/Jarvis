/**
 * TypeScript type definitions for the Telegram Bot API.
 */

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  reply_markup?: InlineKeyboardMarkup;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  inline_message_id?: string;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface SendMessageOptions {
  parse_mode?: "MarkdownV2" | "HTML" | "Markdown";
  reply_markup?: InlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
}

export interface EditMessageOptions {
  parse_mode?: "MarkdownV2" | "HTML" | "Markdown";
  reply_markup?: InlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
}

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export class TelegramApiError extends Error {
  public readonly statusCode?: number;
  public readonly errorCode?: number;
  public readonly description?: string;

  constructor(message: string, options?: { statusCode?: number; errorCode?: number; description?: string }) {
    super(message);
    this.name = "TelegramApiError";
    this.statusCode = options?.statusCode;
    this.errorCode = options?.errorCode;
    this.description = options?.description;
  }
}
