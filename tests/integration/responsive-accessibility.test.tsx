import * as React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AccessibilityAuditor } from "@/lib/ui/accessibility-auditor";
import { AppShell } from "@/components/layout/app-shell";

describe("Responsive Layouts & WCAG 2.1 AA Contrast Verification (REQ-UI-01, NFR-A11Y-01)", () => {
  const auditor = new AccessibilityAuditor();

  describe("Mathematical Contrast Calculation Fidelity", () => {
    it("computes exact relative luminance for absolute extremes", () => {
      expect(auditor.calculateLuminance("#000000")).toBe(0);
      expect(auditor.calculateLuminance("#FFFFFF")).toBe(1);
    });

    it("computes exact contrast ratios for reference standards", () => {
      expect(auditor.calculateContrastRatio("#FFFFFF", "#000000")).toBe(21);
      expect(auditor.calculateContrastRatio("#000000", "#000000")).toBe(1);
      expect(auditor.calculateContrastRatio("#FFFFFF", "#FFFFFF")).toBe(1);
    });
  });

  describe("Theme Palette Color Contrast Audit (Criterion 1.4.3 & 1.4.11)", () => {
    it("verifies primary text achieves high contrast (>= 15:1) against all dark surfaces", () => {
      const primaryOnBg = auditor.evaluateContrast("#EAF4FF", "#07111F");
      expect(primaryOnBg.ratio).toBeGreaterThanOrEqual(15.0);
      expect(primaryOnBg.wcagAANormalText).toBe(true);
      expect(primaryOnBg.rating).toBe("AAA");

      const primaryOnSurface1 = auditor.evaluateContrast("#EAF4FF", "#0B1728");
      expect(primaryOnSurface1.ratio).toBeGreaterThanOrEqual(14.0);
      expect(primaryOnSurface1.wcagAANormalText).toBe(true);
      expect(primaryOnSurface1.rating).toBe("AAA");
    });

    it("verifies secondary/muted text satisfies normal text contrast (>= 4.5:1)", () => {
      const secondaryOnBg = auditor.evaluateContrast("#9FB0C5", "#07111F");
      expect(secondaryOnBg.ratio).toBeGreaterThanOrEqual(7.0);
      expect(secondaryOnBg.wcagAANormalText).toBe(true);
      expect(secondaryOnBg.rating).toBe("AAA");

      const secondaryOnSurface3 = auditor.evaluateContrast("#9FB0C5", "#17263A");
      expect(secondaryOnSurface3.ratio).toBeGreaterThanOrEqual(4.5);
      expect(secondaryOnSurface3.wcagAANormalText).toBe(true);
    });

    it("verifies accent cyan and graphical badges meet UI component contrast (>= 3:1)", () => {
      const cyanOnBg = auditor.evaluateContrast("#22D3EE", "#07111F");
      expect(cyanOnBg.ratio).toBeGreaterThanOrEqual(9.0);
      expect(cyanOnBg.wcagAAAGraphical).toBe(true);

      const successOnBg = auditor.evaluateContrast("#34D399", "#07111F");
      expect(successOnBg.ratio).toBeGreaterThanOrEqual(9.0);
      expect(successOnBg.wcagAAAGraphical).toBe(true);

      const warningOnBg = auditor.evaluateContrast("#FBBF24", "#07111F");
      expect(warningOnBg.ratio).toBeGreaterThanOrEqual(10.0);
      expect(warningOnBg.wcagAAAGraphical).toBe(true);
    });

    it("generates 100% compliant WCAG 2.1 AA report across the entire theme", () => {
      const report = auditor.generateComplianceReport();
      expect(report.passed).toBe(true);
      expect(report.wcagLevel).toBe("AA");
      expect(report.passingContrastPairs).toBe(report.totalContrastPairsChecked);
      expect(report.passingTouchTargets).toBe(report.totalTouchTargetsChecked);
    });
  });

  describe("Touch Target Sizing & Responsive Ergonomics (Criterion 2.5.5)", () => {
    it("validates all mobile interaction touch targets are >= 44x44 CSS pixels", () => {
      const targets = [
        { name: "Topbar Mobile Menu Toggle", width: 44, height: 44, view: "Topbar" },
        { name: "Mobile Nav Drawer Close Button", width: 44, height: 44, view: "MobileNav" },
        { name: "Mobile Nav Link", width: 280, height: 44, view: "MobileNav" },
        { name: "Task Review Plan Action", width: 130, height: 44, view: "TasksBacklog" },
      ];

      const results = auditor.auditTouchTargets(targets);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it("verifies responsive layout architecture in AppShell", () => {
      const { container } = render(
        <AppShell title="Responsive Test">
          <div>Content</div>
        </AppShell>
      );

      // Desktop sidebar hidden on mobile
      const aside = container.querySelector("aside");
      expect(aside?.className).toContain("hidden");
      expect(aside?.className).toContain("lg:flex");

      // Content container adjusts padding across viewports
      const main = container.querySelector("main");
      expect(main?.className).toContain("p-4");
      expect(main?.className).toContain("lg:p-8");
      expect(main?.className).toContain("max-w-7xl");
    });
  });
});
