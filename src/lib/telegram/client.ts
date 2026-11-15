import {
  TelegramMessage,
  TelegramUpdate,
  TelegramUser,
  SendMessageOptions,
  EditMessageOptions,
  TelegramApiResponse,
  TelegramApiError,
} from "./types";

export interface TelegramClientOptions {
  botToken?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class TelegramClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options?: TelegramClientOptions) {
    const token = options?.botToken ?? process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      // In dev/test, token may be injected later or mocked, but in real use it must exist
      this.token = "";
    } else {
      this.token = token;
    }
    this.baseUrl = options?.baseUrl ?? "https://api.telegram.org";
    this.timeoutMs = options?.timeoutMs ?? 30000;
  }

  private getEndpointUrl(method: string): string {
    if (!this.token) {
      throw new TelegramApiError("TELEGRAM_BOT_TOKEN is not configured.");
    }
    return `${this.baseUrl}/bot${this.token}/${method}`;
  }

  private async request<T>(method: string, payload?: Record<string, unknown>): Promise<T> {
    const url = this.getEndpointUrl(method);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });

      let data: TelegramApiResponse<T>;
      try {
        data = (await response.json()) as TelegramApiResponse<T>;
      } catch (err) {
        throw new TelegramApiError(`Failed to parse Telegram API response: ${(err as Error).message}`, {
          statusCode: response.status,
        });
      }

      if (!response.ok || !data.ok) {
        throw new TelegramApiError(data.description ?? `Telegram API error (${response.status})`, {
          statusCode: response.status,
          errorCode: data.error_code,
          description: data.description,
        });
      }

      return data.result as T;
    } catch (err) {
      if (err instanceof TelegramApiError) {
        throw err;
      }
      if ((err as Error).name === "AbortError") {
        throw new TelegramApiError(`Telegram API request timed out after ${this.timeoutMs}ms.`);
      }
      throw new TelegramApiError(`Network failure while contacting Telegram API: ${(err as Error).message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Verifies the bot's auth token and returns information about the bot.
   */
  public async getMe(): Promise<TelegramUser> {
    return this.request<TelegramUser>("getMe");
  }

  /**
   * Sends a text message to a specified chat or channel.
   */
  public async sendMessage(
    chatId: number | string,
    text: string,
    options?: SendMessageOptions
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode ?? "MarkdownV2",
      reply_markup: options?.reply_markup,
      disable_web_page_preview: options?.disable_web_page_preview,
    });
  }

  /**
   * Edits an existing message's text (and optionally inline keyboard markup).
   */
  public async editMessageText(
    chatId: number | string,
    messageId: number,
    text: string,
    options?: EditMessageOptions
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options?.parse_mode ?? "MarkdownV2",
      reply_markup: options?.reply_markup,
      disable_web_page_preview: options?.disable_web_page_preview,
    });
  }

  /**
   * Responds to an incoming callback query from an inline keyboard.
   */
  public async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert = false
  ): Promise<boolean> {
    return this.request<boolean>("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    });
  }

  /**
   * Retrieves pending updates via long-polling (used for local development).
   */
  public async getUpdates(options?: {
    offset?: number;
    limit?: number;
    timeout?: number;
    allowedUpdates?: string[];
  }): Promise<TelegramUpdate[]> {
    return this.request<TelegramUpdate[]>("getUpdates", {
      offset: options?.offset,
      limit: options?.limit,
      timeout: options?.timeout ?? 0,
      allowed_updates: options?.allowedUpdates,
    });
  }

  /**
   * Registers a webhook URL for receiving Telegram updates in production.
   */
  public async setWebhook(
    url: string,
    options?: {
      secretToken?: string;
      dropPendingUpdates?: boolean;
      allowedUpdates?: string[];
    }
  ): Promise<boolean> {
    return this.request<boolean>("setWebhook", {
      url,
      secret_token: options?.secretToken,
      drop_pending_updates: options?.dropPendingUpdates,
      allowed_updates: options?.allowedUpdates,
    });
  }

  /**
   * Removes webhook integration, allowing polling mode to take over.
   */
  public async deleteWebhook(options?: { dropPendingUpdates?: boolean }): Promise<boolean> {
    return this.request<boolean>("deleteWebhook", {
      drop_pending_updates: options?.dropPendingUpdates,
    });
  }
}
