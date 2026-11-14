# Project Jarvis — Technical Debt Register

**Document Version:** 1.0.0  
**Status:** Monitored & Managed  

---

## 1. Tracked Technical Debt Items

| Debt ID | Component | Description | Impact | Remediation Plan | Priority |
|---|---|---|---|---|---|
| **DEBT-01** | Frontend Architecture | `frontend/src/app/page.tsx` is a monolithic file (~1320 lines) containing multiple modals, hud audio, and polling loops. | Low runtime impact, moderate maintainability overhead | Modularize into `components/hud/` subcomponents (`TelemetryHUD`, `MissionManifest`, `FleetAuditor`, `LogViewerModal`) | P2 |
| **DEBT-02** | Database Driver in Dev | SQLite with `aiosqlite` is used for local zero-cost development; production uses PostgreSQL with `psycopg`. Minor dialect differences in JSON querying. | Low impact; SQLAlchemy ORM abstracts dialect differences | Maintain unified migration scripts via Alembic for both dialects | P3 |
| **DEBT-03** | Telegram Long-Polling | Telegram service uses manual `getUpdates` polling loop rather than serverless webhooks in local dev. | Negligible in dev; webhook preferred in serverless cloud | Configure webhook endpoint when deployed to Render/Vercel/Fly.io | P3 |
| **DEBT-04** | Sandbox Containerization | `LocalSandboxRunner` currently isolates via subprocess timeouts and directory sandbox on the host OS rather than Docker/gVisor. | Safe for single-tenant trusted repos, but multi-tenant execution would require microVM isolation | Integrate Docker / Podman / Firecracker runner for untrusted community repos | P2 |

