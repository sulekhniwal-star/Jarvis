# Backup & Recovery Specification: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** Staff Backend & Database Architect  
**Date:** November 14, 2026  

---

## 1. Backup Strategy & Tiers

Jarvis maintains a dual-layer backup policy combining automated cloud snapshots with portable logical dumps to guarantee resilience against platform outages or data corruption.

| Layer | Type | Frequency | Retention | Target Destination |
|---|---|---|---|---|
| **Tier 1: Cloud Snapshots** | Supabase Automated Physical Backup | Daily | 7 Days | Supabase Cloud Infrastructure |
| **Tier 2: Logical Dumps** | Automated `pg_dump` (Schema + Data) | Weekly / Pre-Migration | 30 Days | Encrypted S3-compatible cold storage |
| **Tier 3: Git State** | Version-Controlled Migrations & Code | Continuous (per commit) | Permanent | GitHub Remote Repository |

---

## 2. Disaster Recovery Scenarios & Procedures

### Scenario A: Supabase Platform Outage
1. **Detection:** Health probes detect consecutive connection timeouts to Supabase endpoints.
2. **Action:**
   - Ingress webhooks return `503 Service Unavailable` with retry headers.
   - For prolonged outages, deploy self-hosted Docker Compose stack on an emergency server using the latest logical `pg_dump`.
   - Update DNS / environment variables to resume control plane operations.

### Scenario B: Accidental Destructive Migration
1. **Mitigation:** Migrations are tested in local Docker environments prior to remote deployment.
2. **Recovery:**
   - Execute corresponding `*_down.sql` rollback migration.
   - If rollback fails, restore the pre-migration logical snapshot.

### Scenario C: Runner VM Termination Mid-Task
1. **Mitigation:** Task state is locked via `pgmq` visibility timeout.
2. **Recovery:**
   - Upon timeout expiration, the task is re-queued.
   - The orchestrator checks if a task branch exists on GitHub. If incomplete, the branch is reset to the base commit and the task is re-dispatched.

---

## 3. Routine Restoration Testing

Backups that cannot be restored are not backups. Once per quarter, the DevSecOps workflow executes an automated restoration drill:
1. Spins up an isolated local PostgreSQL container.
2. Restores the latest logical backup file.
3. Runs the test suite against the restored database to verify schema integrity and data completeness.
