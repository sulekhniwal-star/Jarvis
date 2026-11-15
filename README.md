# Jarvis UI/UX and Build Prompt Package

This package contains the approved UI/UX direction and a fresh master prompt for Antigravity.

## Files

1. `UI_UX_SPECIFICATION.md` — Full product UI/UX specification.
2. `UI_SCREEN_INVENTORY.md` — Screen list, user journeys and responsive behaviour.
3. `UI_DESIGN_SYSTEM.md` — Colour tokens, motion, typography, accessibility and component standards.
4. `ANTIGRAVITY_FRESH_PROJECT_PROMPT.md` — Fresh project build prompt incorporating product, architecture, security, UI/UX and the main-only GitHub policy.

## How to use

1. Put these files in the Jarvis repository, preferably under `docs/` (the master prompt can be kept in the repository root or `docs/`).
2. Open the repository in Antigravity.
3. Provide `ANTIGRAVITY_FRESH_PROJECT_PROMPT.md` as the governing instruction.
4. Ask Antigravity to begin with Milestone 0 only.
5. Do not allow substantial implementation until the architecture, documentation and acceptance criteria are reviewed.

## Important GitHub policy note

The prompt prohibits all branches except `main` and prohibits pull requests. It also requires explicit approval before pushing to `origin/main`, unless the owner separately configures standing permission for automatic main pushes.

Direct-to-main development is riskier than feature branches and pull requests. The prompt compensates with serialized coding, tests before commits, diff review, no force-push and strict branch-protection compliance. It must never bypass GitHub repository rules.
