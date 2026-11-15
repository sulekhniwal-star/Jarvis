/**
 * Utility functions for Telegram MarkdownV2 formatting and character escaping.
 *
 * Per Telegram Bot API documentation, in MarkdownV2 mode the following characters
 * must be escaped with a preceding backslash when used in regular text:
 *   _ * [ ] ( ) ~ ` > # + - = | { } . ! \
 */

const MARKDOWN_V2_SPECIAL_CHARS = /([_*\[\]()~`>#+\-=|{}.!\\])/g;

/**
 * Escapes all reserved characters in regular text for Telegram MarkdownV2 formatting.
 */
export function escapeMarkdownV2(text: string): string {
  if (!text) return "";
  return text.replace(MARKDOWN_V2_SPECIAL_CHARS, "\\$1");
}

/**
 * Formats text as bold in MarkdownV2 (*text*).
 */
export function bold(text: string): string {
  return `*${escapeMarkdownV2(text)}*`;
}

/**
 * Formats text as italic in MarkdownV2 (_text_).
 */
export function italic(text: string): string {
  return `_${escapeMarkdownV2(text)}_`;
}

/**
 * Formats text as inline monospace code (`code`).
 * Inside inline code, only ` and \ must be escaped with a backslash.
 */
export function code(text: string): string {
  const escaped = text.replace(/([`\\])/g, "\\$1");
  return `\`${escaped}\``;
}

/**
 * Formats text as a multiline pre-formatted code block (```lang\ncode\n```).
 * Inside a pre block, only ` and \ must be escaped with a backslash.
 */
export function pre(text: string, language = ""): string {
  const escaped = text.replace(/([`\\])/g, "\\$1");
  return `\`\`\`${language}\n${escaped}\n\`\`\``;
}

/**
 * Formats a clickable URL link ([text](url)).
 */
export function link(text: string, url: string): string {
  const escapedText = escapeMarkdownV2(text);
  const escapedUrl = url.replace(/([)\\])/g, "\\$1");
  return `[${escapedText}](${escapedUrl})`;
}
