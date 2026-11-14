# Project Jarvis — Industry Standards Register

**Document Version:** 1.0.0  
**Status:** Active Compliance Baseline  

---

## 1. Adopted Industry & Engineering Standards

| Standard / Framework | Governing Body | Core Principles Applied in Jarvis | Status in Jarvis |
|---|---|---|---|
| **OWASP Top 10 for LLM Applications (2025)** | OWASP Foundation | Defense against Prompt Injection (LLM01), Insecure Output Handling (LLM02), Supply Chain (LLM05), Excessive Agency (LLM08) | **COMPLIANT** (Keyword gating, command allowlist, human-in-the-loop) |
| **STRIDE Threat Modeling** | Microsoft Security | Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege | **COMPLIANT** (`THREAT_MODEL.md` fully mapped) |
| **Semantic Versioning 2.0.0** | Tom Preston-Werner | MAJOR.MINOR.PATCH structure for API contracts and releases | **COMPLIANT** (v0.1.0 -> v1.0.0 milestone lifecycle) |
| **Conventional Commits 1.0.0** | Conventional Commits Org | Structured commit messages (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`) | **COMPLIANT** (Enforced across git services and PR authoring) |
| **Twelve-Factor App Methodology** | Adam Wiggins / Heroku | Codebase, dependencies, config in environment, backing services, stateless processes | **COMPLIANT** (Pydantic Settings, environment variables, stateless API) |
| **Web Content Accessibility Guidelines (WCAG 2.1 AA)** | W3C / WAI | Contrast ratios, keyboard navigation, clear aria-labels on HUD buttons | **COMPLIANT** (Tailwind HUD maintains high contrast #00e5ff on dark backdrops) |

