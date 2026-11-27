# Operational Runbook: Disaster Recovery & Backup Restoration (OP-RUN-02)

**System:** Jarvis Autonomous Engineering Platform  
**RPO Target:** $< 24\text{ hours}$ (Daily Encrypted Snapshot Cadence)  
**RTO Target:** $< 15\text{ minutes}$ (Automated Parity Restoration)  
**Data Loss Tolerance:** 0.00% Zero-Loss Invariant (`REQ-OPS-01`)  
**Last Updated:** 2026-11-23  

---

## 1. Overview & Architecture

The Disaster Recovery (DR) system guarantees complete recovery of all stateful database tables in the event of hardware failure, catastrophic database corruption, or environment compromise.

### Key Capabilities
- **Automated Snapshots (`BackupSnapshotRunner`):** Exports all application data to structured JSON datasets.
- **AES-256-GCM Encryption:** All snapshot files are encrypted with authenticated encryption using `BACKUP_ENCRYPTION_KEY`.
- **Cryptographic Integrity:** Each backup bundle includes a SHA-256 checksum file to detect bit-rot or tampering before restoration.
- **Topological FK Dependency Restoration:** Enforces exact parent-to-child insertion order to satisfy database foreign key constraints.
- **Automated Recovery Drills (`DisasterRecoveryDrill`):** Tests end-to-end recovery regularly to prove zero data loss.

---

## 2. Backup Datasets & Schema Tables

The snapshot runner captures all core database tables:
1. `projects`: Workspaces, repositories, and root metadata.
2. `tasks`: All backlog items, state machines, and dependencies.
3. `approvals`: Cryptographic decision records and authorization states.
4. `agent_runs`: Execution telemetry, exit codes, and failure summaries.
5. `cost_records`: INR metered AI inference records and daily tallies.
6. `memories`: Pgvector semantic memory items and embedding metadata.
7. `audit_events`: Tamper-evident hash-chained audit blocks.

---

## 3. Creating a Backup Snapshot

### Automated CLI Execution
Run the backup runner script:
```bash
npm run backup:snapshot
```
Or execute programmatically:
```bash
npx tsx scripts/backup-runner.ts
```

### Artifact Outputs
Snapshots are written to `backups/snapshots/`:
- `snapshot-<timestamp>.enc`: AES-256-GCM encrypted backup dataset.
- `snapshot-<timestamp>.checksum`: SHA-256 cryptographic digest.

---

## 4. Step-by-Step Disaster Recovery Procedure

In the event of total database loss or corruption, follow this exact restoration sequence:

### Step 1: Provision Clean Database Instance
1. Start clean Supabase PostgreSQL instance:
   ```bash
   npx supabase db reset
   ```
2. Verify all 14 tables and RLS policies are applied from migrations:
   ```bash
   npx supabase migration list
   ```

### Step 2: Validate Checksum & Decrypt Snapshot
1. Locate the latest snapshot bundle in `backups/snapshots/`.
2. Compute SHA-256 digest of `snapshot-<timestamp>.enc` and verify matching `.checksum`:
   ```bash
   # PowerShell verification
   Get-FileHash -Algorithm SHA256 ./backups/snapshots/snapshot-<timestamp>.enc
   ```
3. Decrypt payload using the secret `BACKUP_ENCRYPTION_KEY`.

### Step 3: Execute Restoration in Topological Order
The restoration script restores tables in exact topological order to satisfy foreign keys:
```text
1. projects
   └── 2. tasks
       ├── 3. approvals
       ├── 4. agent_runs
       ├── 5. cost_records
       ├── 6. memories
       └── 7. audit_events
```

### Step 4: Verify Zero-Loss Parity
Run the recovery drill validator:
```bash
npm test tests/integration/resilience-recovery.test.ts
```
Verify that:
- Total records restored equals baseline snapshot record count.
- `zeroLossAchieved === true`.
- Missing row count is strictly $0$.
- Hash-chained audit ledger head matches pre-disaster checksum.
