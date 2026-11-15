# Phase 1 Research: Environment & Project Foundation

**Phase:** 1 - Environment & Project Foundation  
**Target Milestone:** v1.0 - Core Platform Foundation & Architecture  
**Document Status:** Complete  
**Last Updated:** 2026-11-15  

---

## 1. Executive Summary & Phase Objectives

Phase 1 establishes the bedrock for Jarvis. It delivers a modern, robust, and reproducible development baseline along with strict Git repository governance. Specifically, Phase 1 satisfies:
- **REQ-ENV-01:** Repository tooling initialization with Next.js 15+ App Router, React 19, TypeScript, Tailwind CSS, ESLint, Prettier, and Vitest test harness.
- **REQ-ENV-02:** Git safety guard utility enforcing the mandatory `main`-only policy and blocking creation or checkout of non-`main` branches.
- **NFR-SEC-01:** Main-Only Branch Lock (no tool, agent, or script may create or check out a non-`main` branch or perform force pushes).
- **NFR-SEC-02:** Zero Secret Leakage (no credentials committed to Git or exposed in browser bundles).

---

## 2. Technology & Dependency Architecture

### 2.1 Next.js 15+ (App Router) & React 19
- **Core Packages:**
  - `next`: `^15.0.3` (or latest 15.x)
  - `react`: `^19.0.0`
  - `react-dom`: `^19.0.0`
- **Architecture Notes:**
  - Standard App Router directory structure located in `src/app/`.
  - Server Components by default for security, reducing client JavaScript overhead.
  - Root layout (`src/app/layout.tsx`) wraps the app in HTML `lang="en"`, loads global CSS variables, and sets default viewport/metadata.
  - `next.config.ts`: Configured with React strict mode enabled and security headers placeholder.

### 2.2 Styling & Jarvis Theme Design Tokens
- **Core Packages:**
  - `tailwindcss`: `^3.4.15`
  - `postcss`: `^8.4.49`
  - `autoprefixer`: `^10.4.20`
  - `tailwind-merge`: `^2.5.4`
  - `clsx`: `^2.1.1`
- **Design Tokens Specification (derived from `UI_DESIGN_SYSTEM.md`):**
  The theme tokens represent the Jarvis cinematic dark aesthetic:
  ```css
  :root {
    --background: #07111f;
    --surface-1: #0b1728;
    --surface-2: #101d30;
    --surface-3: #17263a;
    --text-primary: #eaf4ff;
    --text-secondary: #9fb0c5;
    --accent-cyan: #22d3ee;
    --accent-ice: #60a5fa;
    --success: #34d399;
    --warning: #fbbf24;
    --danger: #fb7185;
    --info: #60a5fa;
  }
  ```
- **Tailwind Integration:**
  - `tailwind.config.ts` extends `theme.colors` with semantic token aliases mapping to CSS variables (e.g. `bg-background`, `bg-surface-1`, `text-primary`, `border-surface-3`).
  - Dark mode is fixed default (`dark` class or standard dark palette).

### 2.3 TypeScript Configuration
- **Core Packages:**
  - `typescript`: `^5.6.3`
  - `@types/node`: `^22.9.0`
  - `@types/react`: `^19.0.0`
  - `@types/react-dom`: `^19.0.0`
- **Compiler Options (`tsconfig.json`):**
  - `"target": "ES2022"`
  - `"module": "ESNext"`
  - `"moduleResolution": "Bundler"`
  - `"jsx": "preserve"`
  - `"strict": true`
  - `"noUncheckedIndexedAccess": true`
  - `"paths": { "@/*": ["./src/*"] }`

### 2.4 Code Quality & Secret Hygiene
- **Core Packages:**
  - `eslint`: `^9.14.0`
  - `eslint-config-next`: `^15.0.3`
  - `prettier`: `^3.3.3`
  - `prettier-plugin-tailwindcss`: `^0.6.9`
- **Secret Hygiene & Isolation (NFR-SEC-02):**
  - `.gitignore` must strictly exclude:
    - `.env`, `.env.local`, `.env.*.local`, `.env.production`
    - `node_modules/`, `.next/`, `out/`, `build/`, `dist/`
    - `coverage/`, `.turbo/`
    - OS artifacts (`Thumbs.db`, `.DS_Store`)
    - Temporary dumps, scratchpads (`*.pem`, `*.key`)
  - `.env.example` committed with placeholder definitions (e.g., `NEXT_PUBLIC_APP_URL=http://localhost:3000`).

### 2.5 Vitest Test Harness
- **Core Packages:**
  - `vitest`: `^2.1.5`
  - `@vitejs/plugin-react`: `^4.3.3`
  - `jsdom`: `^25.0.1`
  - `@testing-library/react`: `^16.0.1`
  - `@testing-library/jest-dom`: `^6.6.3`
  - `@testing-library/user-event`: `^14.5.2`
- **Vitest Configuration (`vitest.config.ts`):**
  - Uses `vite-tsconfig-paths` or alias `{ '@': path.resolve(__dirname, './src') }`.
  - Test environment: `jsdom`.
  - Setup file: `vitest.setup.ts` importing `@testing-library/jest-dom/vitest`.
  - Globals enabled for standard test assertions (`describe`, `it`, `expect`, `beforeEach`, `vi`).

### 2.6 Git Safety Guard Architecture (REQ-ENV-02, NFR-SEC-01)
- **Requirement Source:**
  `ANTIGRAVITY_FRESH_PROJECT_PROMPT.md` §1 and `PRD.md` §7.7 (FR-GH-001 through FR-GH-010).
- **Core Governance Invariants:**
  1. The only permitted working branch is `main`.
  2. No feature branches, dev branches, release branches, or temporary branches.
  3. No checkout of non-`main` branches.
  4. Disallow `git push --force`, `git push --force-with-lease`, history rewriting, or destructive resets.
  5. Inspect working tree status before write actions; detect uncommitted/unexplained modifications.
  6. Inspect diffs for accidental credentials or secret patterns (`NEXT_PUBLIC_` misuse, private keys, JWTs).
- **Implementation Strategy:**
  - TypeScript module located at `src/lib/git/guard.ts` and `src/lib/git/diff.ts`.
  - Execution via `node:child_process` using `execFileSync('git', args)` (avoids shell injection vulnerabilities).
  - Standalone CLI runner in `scripts/git-guard.ts` executable via `npx tsx scripts/git-guard.ts`.
  - Can be hooked into npm scripts (`npm run git:verify`, `npm run git:diff`).

---

## 3. Potential Gotchas & Mitigation Strategies

| Risk / Gotcha | Impact | Mitigation Strategy |
|---|---|---|
| **Windows PowerShell vs Bash chaining (`&&`)** | Windows PowerShell 5.1 throws parse errors on `&&` or `||` | All verification and script commands must be single commands or run via cross-platform npm scripts / `tsx` runners. |
| **React 19 & Testing Library Compatibility** | Potential peer dependency mismatch with older `@testing-library/react` | Use `@testing-library/react@^16.0.0` which natively supports React 19. |
| **Vitest resolving Next.js path aliases** | Vitest fails to resolve `@/lib/...` imports | Explicitly define `resolve.alias` in `vitest.config.ts` mapping `@` to `path.resolve(__dirname, './src')`. |
| **Git CLI differences on Windows** | Line ending differences (`CRLF` vs `LF`) causing dirty diffs | Configure `.gitattributes` to enforce consistent `eol=lf` for text files and TypeScript files. |
| **ChildProcess hanging on interactive git prompts** | Commands like `git push` or `git pull` hanging waiting for credentials | Pass `{ env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, stdio: ['pipe', 'pipe', 'pipe'] }` to ensure fail-fast non-interactive execution. |

---

## 4. Verification Commands

The following commands will be used by the executor to verify Phase 1:
```bash
# 1. Typecheck and compilation
npm run build

# 2. Linter & formatting checks
npm run lint
npx prettier --check .

# 3. Unit test suite execution
npm test

# 4. Git safety guard verification
npx tsx scripts/git-guard.ts check-branch
npx tsx scripts/git-guard.ts check-clean
```

---

## 5. Plan Decomposition Overview

- **Plan 1.1 (Wave 1):** Next.js 15+ App Router initialization, TypeScript config, Tailwind tokens, and Vitest test suite.
  - Task 1: Scaffolding package.json, TypeScript config, Tailwind tokens, CSS variables, and layout.
  - Task 2: Vitest test harness setup with jsdom, testing library, and smoke tests.
- **Plan 1.2 (Wave 2):** Git safety guard utility enforcing strict `main`-only policy and commit diff inspection tools.
  - Task 1: Core Git guard module with branch enforcement and command validation.
  - Task 2: Diff inspection utility and CLI runner script.
