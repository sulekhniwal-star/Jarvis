# JARVIS — Autonomous AI Engineering & Operations Platform

[![Version](https://img.shields.io/badge/version-10.0.0-blue.svg)](https://github.com/jsk/javis)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-821%20passing-brightgreen.svg)]()
[![RLS Coverage](https://img.shields.io/badge/database%20RLS-100%25-brightgreen.svg)]()
[![Security Audit](https://img.shields.io/badge/security%20audit-0%20P0%2FP1-brightgreen.svg)](docs/SECURITY-AUDIT.md)
[![Accessibility](https://img.shields.io/badge/accessibility-WCAG%202.1%20AA-brightgreen.svg)](docs/ACCESSIBILITY-AUDIT.md)
[![Branch Discipline](https://img.shields.io/badge/git-main--only-blueviolet.svg)]()

JARVIS is an autonomous software engineering and operations platform designed to orchestrate specifications, planning, code execution, automated verification, deployment gating, and proactive maintenance with enterprise-grade guardrails, strict cost limits, and human-in-the-loop approvals.

---

## Key Capabilities & Architecture

```
                  ┌─────────────────────────────────────────┐
                  │          Human Approval Gates           │
                  │       (Web UI & Telegram Gateway)       │
                  └─────────────▲───────────────────────────┘
                                │ HMAC-SHA256 Signed Tokens
┌───────────────────────────────┴─────────────────────────────────────────┐
│                           JARVIS Core Platform                          │
│                                                                         │
│  ┌───────────────────────┐   ┌───────────────────┐   ┌───────────────┐  │
│  │ Specifier & Clarifier │──►│   Planner Agent   │──►│ Coding Runner │  │
│  └───────────────────────┘   └───────────────────┘   └───────┬───────┘  │
│                                                              ▼          │
│  ┌───────────────────────┐   ┌───────────────────┐   ┌───────────────┐  │
│  │   Production Gate     │◄──│ Deployment Engine │◄──│ Verification  │  │
│  │  & Health Diagnostics │   │  & Preview URLs   │   │ & Diff Guard  │  │
│  └───────────────────────┘   └───────────────────┘   └───────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Safety & Control Layer:                                           │  │
│  │ • Sub-second Emergency Kill Switch (<1000ms process abort)         │  │
│  │ • Hard INR Cost Tracker & OpenRouter Circuit Breaker              │  │
│  │ • Immutable SHA-256 Hash-Chained Audit Ledger                     │  │
│  │ • AES-256-GCM Encrypted Automated Snapshot Backups                │  │
│  │ • Continuous Main-Only Git Branch Enforcement                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1. Specification & Autonomous Planning
- **Specifier & Socratic Clarification:** Clarifies ambiguous goals, validates technical constraints, and establishes structured user stories.
- **Planner Agent:** Decomposes features into atomic, dependency-sequenced plans with wave assignments and verification gates.

### 2. Execution & Multi-Stage Quality Verification
- **Headless Coding Sandbox:** Standardized agent runner interface isolating execution.
- **Multi-Stage Verification Harness:** Continuous typecheck, lint, unit test, and integration verification.
- **Semantic Diff Inspector & Secret Scanner:** Blocks path traversal, entropy anomalies, and unauthorized external connections.
- **Bounded Self-Repair:** 3-strike automated diagnostic and remediation loop with git rollback upon budget exhaustion.

### 3. Human-in-the-Loop Approvals & Operations
- **Unified Approval Centre:** Single-owner HMAC-SHA256 decision engine synchronizing Web and Telegram interfaces.
- **Strict INR Budgeting:** Live cost tracking with automatic circuit-breaker triggers preventing model inference runaway.
- **Sub-Second Kill Switch:** Global abort cancelling in-flight database transactions and killing operating system process trees in $<1,000$ms.

### 4. Telemetry, Maintenance & Resilience
- **System Health Diagnostics:** Sub-200ms non-blocking status probes monitoring database, redis, disk, memory, and runner health.
- **Proactive Maintenance Engine:** Analyzes database indices, disk pressure, and rate-limit warnings with 1-click remediation.
- **Continuous Branch Safety Guard:** Enforces strict `main`-only commits, blocking feature branches and PR drift.
- **Disaster Recovery:** Hash-chained audit logs, AES-256 encrypted automated backups, and non-destructive drill simulator.

---

## Production Certifications & Benchmarks

| Pillar | Metric / Standard | Verified Value | Status |
|---|---|---|---|
| **Security Audit** | 0 P0 / 0 P1 Vulnerabilities | 0 issues found | Certified |
| **Database Security** | Row Level Security (RLS) Coverage | 14 of 14 tables (100%) | Certified |
| **Accessibility** | WCAG 2.1 Level AA Compliance | Contrast $\ge 4.5:1$, touch targets $\ge 44$px | Certified |
| **Emergency Abort** | Kill Switch Trigger to Process Death | $< 1,000$ms | Certified |
| **System Diagnostics** | System Health Diagnostic Probes | $< 200$ms latency | Certified |
| **Git Discipline** | Trunk-Based Development | `main`-only branch discipline | Certified |
| **Build & Tests** | Vitest Test Suite & Next.js Build | 132 files / 821 tests passed (0 errors) | Certified |

---

## Operational Commands Reference

```bash
# Run unit & integration tests
npm run test

# Run full release verification (validates branch, security, a11y, health, version)
npm run release:verify

# Create encrypted AES-256-GCM database & artifact backup snapshot
npm run backup:snapshot

# Prune audit logs and build artifacts older than 30 days
npm run maintenance:prune

# Next.js production build
npm run build

# Start production server
npm run start
```

---

## Operational Runbooks & Documentation

- [Master Engineering Audit](docs/MASTER_ENGINEERING_AUDIT.md) — Comprehensive 38-phase architecture retrospective and requirements traceability.
- [Emergency Operations Runbook](docs/runbooks/EMERGENCY_OPERATIONS.md) — Protocols for kill switch activation, security incidents, and runaway costs.
- [Disaster Recovery Runbook](docs/runbooks/DISASTER_RECOVERY.md) — Backup snapshot restore, database recovery, and data integrity verification.
- [Production Release Guide](docs/runbooks/PRODUCTION_RELEASE_GUIDE.md) — Deployment checklist, staging verification, and rollback procedures.
- [System Security Audit](docs/SECURITY-AUDIT.md) — Penetration testing, crypto verification, and boundary validation report.
- [Accessibility Audit](docs/ACCESSIBILITY-AUDIT.md) — WCAG 2.1 AA audit findings, touch targets, and contrast measurements.
- [Changelog](docs/CHANGELOG.md) — Full release history from v0.1.0 to v10.0.0.

---

## License

Private and proprietary. Built for high-reliability autonomous engineering.
