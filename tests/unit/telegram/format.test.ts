import { describe, it, expect } from "vitest";
import { escapeMarkdownV2, bold, italic, code, pre, link } from "@/lib/telegram/format";

describe("Telegram MarkdownV2 Formatter", () => {
  describe("escapeMarkdownV2", () => {
    it("handles empty and nullish strings", () => {
      expect(escapeMarkdownV2("")).toBe("");
    });

    it("escapes all 18 MarkdownV2 reserved characters", () => {
      const special = "_*[]()~`>#+-=|{}.!\\";
      const escaped = escapeMarkdownV2(special);
      expect(escaped).toBe("\\_\\*\\[\\]\\(\\)\\~\\`\\>\\#\\+\\-\\=\\|\\{\\}\\.\\!\\\\");
    });

    it("leaves normal alphanumeric text untouched", () => {
      expect(escapeMarkdownV2("Hello world 123")).toBe("Hello world 123");
    });

    it("properly escapes mixed text and punctuation", () => {
      const input = "Task #42: [Fix] Error (code -1) -> 100% done!";
      const expected = "Task \\#42: \\[Fix\\] Error \\(code \\-1\\) \\-\\> 100% done\\!";
      expect(escapeMarkdownV2(input)).toBe(expected);
    });
  });

  describe("typography helpers", () => {
    it("formats bold text correctly with escaped inner content", () => {
      expect(bold("Plan 8.1")).toBe("*Plan 8\\.1*");
      expect(bold("Warning!")).toBe("*Warning\\!*");
    });

    it("formats italic text correctly with escaped inner content", () => {
      expect(italic("Pending review...")).toBe("_Pending review\\.\\.\\._");
    });

    it("formats inline code correctly escaping only backtick and backslash", () => {
      expect(code("git status")).toBe("`git status`");
      expect(code("foo`bar\\baz")).toBe("`foo\\`bar\\\\baz`");
      // Other punctuation like . or - must NOT be escaped in code block
      expect(code("file-name.ts")).toBe("`file-name.ts`");
    });

    it("formats pre blocks correctly", () => {
      const snippet = 'console.log("Hello, world!");';
      expect(pre(snippet, "typescript")).toBe("```typescript\nconsole.log(\"Hello, world!\");\n```");
    });

    it("formats links correctly", () => {
      expect(link("Dashboard", "https://example.com/tasks?id=1")).toBe(
        "[Dashboard](https://example.com/tasks?id=1)"
      );
    });
  });
});
