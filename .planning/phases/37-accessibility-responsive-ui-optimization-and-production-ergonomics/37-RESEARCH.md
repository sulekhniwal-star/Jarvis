# Phase 37 Research: Accessibility, Responsive UI Optimization & Production Ergonomics

## Executive Summary
Phase 37 focuses on achieving WCAG 2.1 AA accessibility compliance, responsive cross-device layout optimization (from 375px mobile viewports to 1440px wide desktop monitors), and complete production ergonomics across all 10 core views of the Jarvis Command Centre (`REQ-UI-01`, `NFR-A11Y-01`).

---

## 1. Accessibility & Responsive Requirements Analysis

### 1.1 WCAG 2.1 AA Compliance Standards
- **Color Contrast (Criterion 1.4.3):**
  - Minimum contrast ratio of 4.5:1 for normal body text (<18pt / <14pt bold).
  - Minimum contrast ratio of 3:1 for large text ($\ge 18$pt or $\ge 14$pt bold) and user interface components/graphical objects (Criterion 1.4.11).
  - Background: Deep navy/slate `#07111F`, `#0B172B`.
  - Primary text: White `#FFFFFF` (21:1 contrast ratio).
  - Secondary/muted text: Must maintain $\ge 4.5:1$ against surface backgrounds (e.g. `#94A3B8` on `#0B172B` provides 6.2:1 contrast).
- **Keyboard Navigation & Visible Focus (Criterion 2.4.7):**
  - All interactive elements (`<button>`, `<a>`, `<input>`, `<select>`, tab triggers) must have high-visibility focus indicators (`focus-visible:ring-2 focus-visible:ring-accent-cyan`).
  - No keyboard traps: user must be able to Tab through components, dialogs, drawers, and escape modals cleanly with `Escape`.
  - Skip to main content link: `<a href="#main-content">` present and accessible on Tab.
- **Semantic Structure & ARIA Landmarks (Criterion 1.3.1):**
  - Header: `<header role="banner">` or `<nav aria-label="...">`.
  - Navigation: `<nav aria-label="Sidebar Navigation">` and `<nav aria-label="Mobile Navigation">`.
  - Main: `<main id="main-content" role="main">`.
  - Status Indicators: Must not rely on color alone (`role="status"`, accompanying text or symbols alongside status pill colors).
- **Reduced Motion (Criterion 2.3.3):**
  - CSS rule honoring `prefers-reduced-motion: reduce` by disabling transitions and animations for users with vestibular sensitivities.
- **Touch Target Dimensions (Criterion 2.5.5):**
  - Minimum touch target size of $44 \times 44$ CSS pixels on touch devices or sufficient spacing between interactive targets.

---

## 2. Inventory of Views & Routes

| View Route | Page File | Status | Notes |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Active | Overview dashboard with metric cards, active runs, recommendations card, and health diagnostics |
| `/projects` | `src/app/projects/page.tsx` | Active | Project portfolio Kanban view |
| `/projects/[id]` | `src/app/projects/[id]/page.tsx` | Active | Individual project detail and task list |
| `/agents` | `src/app/agents/page.tsx` | Active | Agent console, active runs, engine selector |
| `/agents/runs/[id]` | `src/app/agents/runs/[id]/page.tsx` | Active | Run execution telemetry drill-down |
| `/approvals` | `src/app/approvals/page.tsx` | Active | Unified Approval Centre with status tabs & filters |
| `/deployments` | `src/app/deployments/page.tsx` | Active | Multi-environment deployment dashboard |
| `/audit` | `src/app/audit/page.tsx` | Active | Tamper-evident audit ledger viewer |
| `/memory` | `src/app/memory/page.tsx` | Active | Semantic memory store viewer & search |
| `/settings` | `src/app/settings/page.tsx` | Active | Settings, storage pruning, branch hygiene controls |
| `/tasks` | `src/app/tasks/page.tsx` | **To Create** | Tasks backlog view to resolve sidebar link navigation |
| `/tasks/[id]/plan` | `src/app/tasks/[id]/plan/page.tsx` | Active | Interactive Plan Review UI & DAG visualizer |

---

## 3. Plan Architecture for Phase 37

### Plan 37.1: WCAG 2.1 AA Accessibility Standards, Focus Rings & Navigation Ergonomics
- Implement `/tasks` page (`src/app/tasks/page.tsx`) with accessible backlog list, search, status filters, and ARIA labels.
- Audit and enhance `AppShell`, `Sidebar`, `Topbar`, `MobileNav`, and common UI components (`Button`, `Badge`, `Card`, `Input`):
  - Add `aria-label` to all icon buttons (e.g. mobile menu trigger, close drawer, refresh buttons).
  - Add global `prefers-reduced-motion` stylesheet rules in `src/app/globals.css`.
  - Ensure $44 \times 44$px minimum touch targets on mobile interactions.
- Create unit test suite `tests/unit/components/accessibility-standards.test.tsx`.

### Plan 37.2: Cross-Device Responsive Layouts, Contrast Verification & Accessibility Audit Report
- Implement `src/lib/ui/accessibility-auditor.ts` (`AccessibilityAuditor`):
  - Computes relative luminance and contrast ratio between foreground and background hex colors.
  - Verifies WCAG AA minimum thresholds ($4.5:1$ normal, $3:1$ large).
  - Audits ARIA attribute integrity.
- Create integration test suite `tests/integration/responsive-accessibility.test.tsx` verifying viewport responsiveness and color contrast.
- Generate `docs/ACCESSIBILITY-AUDIT.md`.
