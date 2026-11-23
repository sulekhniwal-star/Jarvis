export interface ColorContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  wcagAANormalText: boolean; // >= 4.5:1
  wcagAALargeText: boolean;  // >= 3:1
  wcagAAAGraphical: boolean; // >= 3:1
  rating: "AAA" | "AA" | "AA_LARGE_ONLY" | "FAIL";
}

export interface TouchTargetSpec {
  name: string;
  width: number;
  height: number;
  view: string;
}

export interface TouchTargetResult {
  name: string;
  width: number;
  height: number;
  view: string;
  passed: boolean; // >= 44x44
}

export interface AccessibilityComplianceReport {
  passed: boolean;
  wcagLevel: "AA" | "FAIL";
  totalContrastPairsChecked: number;
  passingContrastPairs: number;
  totalTouchTargetsChecked: number;
  passingTouchTargets: number;
  contrastResults: ColorContrastResult[];
  touchTargetResults: TouchTargetResult[];
  timestamp: string;
}

export class AccessibilityAuditor {
  /**
   * Computes sRGB relative luminance according to W3C WCAG 2.1 definition.
   */
  public calculateLuminance(hex: string): number {
    const cleanHex = hex.replace(/^#/, "");
    let r = 0, g = 0, b = 0;

    if (cleanHex.length === 3) {
      r = parseInt(cleanHex.charAt(0) + cleanHex.charAt(0), 16);
      g = parseInt(cleanHex.charAt(1) + cleanHex.charAt(1), 16);
      b = parseInt(cleanHex.charAt(2) + cleanHex.charAt(2), 16);
    } else if (cleanHex.length === 6) {
      r = parseInt(cleanHex.substring(0, 2), 16);
      g = parseInt(cleanHex.substring(2, 4), 16);
      b = parseInt(cleanHex.substring(4, 6), 16);
    } else {
      throw new Error(`Invalid hex color: ${hex}`);
    }

    const toLinear = (val: number) => {
      const srgb = val / 255;
      return srgb <= 0.04045
        ? srgb / 12.92
        : Math.pow((srgb + 0.055) / 1.055, 2.4);
    };

    const rLin = toLinear(r);
    const gLin = toLinear(g);
    const bLin = toLinear(b);

    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  }

  /**
   * Calculates WCAG 2.1 contrast ratio between two hex colors.
   */
  public calculateContrastRatio(fgHex: string, bgHex: string): number {
    const lum1 = this.calculateLuminance(fgHex);
    const lum2 = this.calculateLuminance(bgHex);

    const brighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    const ratio = (brighter + 0.05) / (darker + 0.05);
    return Math.round(ratio * 100) / 100;
  }

  /**
   * Evaluates contrast ratio against WCAG 2.1 AA thresholds.
   */
  public evaluateContrast(fgHex: string, bgHex: string): ColorContrastResult {
    const ratio = this.calculateContrastRatio(fgHex, bgHex);
    const wcagAANormalText = ratio >= 4.5;
    const wcagAALargeText = ratio >= 3.0;
    const wcagAAAGraphical = ratio >= 3.0;

    let rating: "AAA" | "AA" | "AA_LARGE_ONLY" | "FAIL" = "FAIL";
    if (ratio >= 7.0) {
      rating = "AAA";
    } else if (ratio >= 4.5) {
      rating = "AA";
    } else if (ratio >= 3.0) {
      rating = "AA_LARGE_ONLY";
    }

    return {
      foreground: fgHex,
      background: bgHex,
      ratio,
      wcagAANormalText,
      wcagAALargeText,
      wcagAAAGraphical,
      rating,
    };
  }

  /**
   * Audits the production design system color palette against surface tokens.
   */
  public auditThemeContrast(): ColorContrastResult[] {
    const surfaces = [
      { name: "background", hex: "#07111F" },
      { name: "surface-1", hex: "#0B1728" },
      { name: "surface-2", hex: "#101D30" },
      { name: "surface-3", hex: "#17263A" },
    ];

    const foregrounds = [
      { name: "text-primary", hex: "#EAF4FF", requiredRatio: 4.5 },
      { name: "text-secondary", hex: "#9FB0C5", requiredRatio: 4.5 },
      { name: "accent-cyan", hex: "#22D3EE", requiredRatio: 3.0 },
      { name: "accent-ice", hex: "#60A5FA", requiredRatio: 3.0 },
      { name: "success", hex: "#34D399", requiredRatio: 3.0 },
      { name: "warning", hex: "#FBBF24", requiredRatio: 3.0 },
      { name: "danger", hex: "#FB7185", requiredRatio: 3.0 },
    ];

    const results: ColorContrastResult[] = [];

    for (const surface of surfaces) {
      for (const fg of foregrounds) {
        results.push(this.evaluateContrast(fg.hex, surface.hex));
      }
    }

    return results;
  }

  /**
   * Audits interactive touch targets against WCAG 2.1 Success Criterion 2.5.5 (44x44 CSS pixels).
   */
  public auditTouchTargets(targets: TouchTargetSpec[]): TouchTargetResult[] {
    return targets.map((t) => ({
      name: t.name,
      width: t.width,
      height: t.height,
      view: t.view,
      passed: t.width >= 44 && t.height >= 44,
    }));
  }

  /**
   * Generates a complete WCAG 2.1 AA accessibility compliance audit report.
   */
  public generateComplianceReport(customTouchTargets?: TouchTargetSpec[]): AccessibilityComplianceReport {
    const contrastResults = this.auditThemeContrast();
    const defaultTouchTargets: TouchTargetSpec[] = [
      { name: "Mobile Navigation Menu Trigger", width: 44, height: 44, view: "Topbar" },
      { name: "Mobile Navigation Drawer Close Button", width: 44, height: 44, view: "MobileNav" },
      { name: "Mobile Navigation Link Item", width: 240, height: 44, view: "MobileNav" },
      { name: "Task Review Plan Link", width: 120, height: 44, view: "TasksBacklog" },
      { name: "Approval Decision Button", width: 100, height: 44, view: "ApprovalsPortal" },
      { name: "Emergency Stop Trigger", width: 140, height: 44, view: "CommandCenter" },
    ];

    const touchResults = this.auditTouchTargets(customTouchTargets || defaultTouchTargets);

    const normalTextPairs = contrastResults.filter((_, idx) => idx % 7 < 2); // text-primary and text-secondary
    const graphicalPairs = contrastResults.filter((_, idx) => idx % 7 >= 2);  // accents and status colors

    const contrastPassing =
      normalTextPairs.every((c) => c.wcagAANormalText) &&
      graphicalPairs.every((c) => c.wcagAALargeText);

    const touchPassing = touchResults.every((t) => t.passed);
    const passed = contrastPassing && touchPassing;

    return {
      passed,
      wcagLevel: passed ? "AA" : "FAIL",
      totalContrastPairsChecked: contrastResults.length,
      passingContrastPairs: contrastResults.filter((c) => c.wcagAALargeText).length,
      totalTouchTargetsChecked: touchResults.length,
      passingTouchTargets: touchResults.filter((t) => t.passed).length,
      contrastResults,
      touchTargetResults: touchResults,
      timestamp: new Date().toISOString(),
    };
  }
}
