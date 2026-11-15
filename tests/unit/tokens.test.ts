import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Design Tokens & Palette Invariants", () => {
  const globalsCssPath = path.resolve(process.cwd(), "src/app/globals.css");
  const globalsCssContent = fs.readFileSync(globalsCssPath, "utf-8");

  const requiredTokens = [
    "--background: #07111F",
    "--surface-1: #0B1728",
    "--surface-2: #101D30",
    "--surface-3: #17263A",
    "--text-primary: #EAF4FF",
    "--text-secondary: #9FB0C5",
    "--accent-cyan: #22D3EE",
    "--accent-ice: #60A5FA",
    "--success: #34D399",
    "--warning: #FBBF24",
    "--danger: #FB7185",
    "--info: #60A5FA",
  ];

  for (const token of requiredTokens) {
    it(`defines required design token ${token}`, () => {
      const normalizedCss = globalsCssContent.replace(/\s+/g, " ");
      expect(normalizedCss.toLowerCase()).toContain(token.toLowerCase());
    });
  }

  it("ensures dark scheme defaults are present", () => {
    expect(globalsCssContent).toContain("background: var(--background)");
    expect(globalsCssContent).toContain("color: var(--text-primary)");
  });
});
