# JARVIS — Changelog

All notable changes to the Jarvis platform are documented in this file.

## [Unreleased] — 2026-11-27 (Milestone 0 Re-Baseline & Build Verification)
### Added
- Restored `CURRENT_STATE.md` and `PROGRESS.md` to reflect empirical repository status.
- Updated `docs/RESEARCH_LOG.md` with 2026-11-27 official quota/pricing checks (Supabase, OpenRouter 50 RPD free-tier cap, GitHub Actions, Vercel Hobby).
- Updated `docs/RISKS_AND_ISSUES.md` with newly discovered issues (`ISS-002` through `ISS-006`).

### Fixed & Updated
- Fixed all 14 ESLint errors (`react-hooks/refs`, `react/no-unescaped-entities`, `prefer-const`) across hooks, UI components, and `storage-pruner.ts`.
- Synced `VERSION` (`10.0.0`) with `package.json`.
- Updated compatible npm dependencies (`@supabase/supabase-js` 2.119.2, `tailwind-merge` 2.6.2, `@testing-library/user-event` 14.6.13, `@types/node` 22.20.7, `@types/react` 19.3.3, `autoprefixer` 10.7.0, etc.).
- Verified clean `tsc --noEmit` (0 errors), `eslint . --quiet` (0 errors), and `next build --webpack` (57 routes compiled).

## [10.0.0] — 2026-11-23
### Changed
- `012d176`: Removed deprecated `.planning/`, `.agent/`, `.agents/`, `.gsd/` artifacts and legacy state files.
- `eaf32e3` / `aa35ab2`: Completed v10.0.0 hardening, operational runbooks (`docs/runbooks/`), accessibility/security suites, and release verification scripts.
