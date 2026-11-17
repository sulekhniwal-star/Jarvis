# JARVIS — Audit Ledger & Backup Recovery Architecture Guide

**Document:** `docs/AUDIT_AND_BACKUP_GUIDE.md`  
**Milestone:** v8.0 Approvals, Security & Cost Controls  
**Requirements Satisfied:** `REQ-AUD-01`, `REQ-OPS-01`  
**Status:** Approved Standard  

---

## 1. Tamper-Evident Cryptographic Audit Ledger (`REQ-AUD-01`)

### 1.1 Architecture & Design Principles
Jarvis implements a blockchain-style append-only cryptographic hash chain for security-critical actions (task intake, plan approvals, code modifications, git operations, emergency kill-switch activations, and disaster recovery runs).

All records are written to `public.audit_events`, which is locked down with strict Postgres Row Level Security (RLS):
- **Allowed:** `INSERT`, `SELECT`
- **Forbidden:** `UPDATE`, `DELETE` (no policies defined, rejecting any write mutation)

### 1.2 Cryptographic Chaining Specification
Each event $k$ stores an audit metadata envelope `_audit` inside its `details` JSONB payload:

```json
{
  "_audit": {
    "sequence": 42,
    "prev_hash": "a1b2c3d4...",
    "hash": "e5f6g7h8..."
  },
  "action": "remote_git_push",
  "target_resource": "origin/main",
  "commit_sha": "7f8e9d0"
}
```

- **Genesis Block:** When no events exist, the chain initializes with `prev_hash = "0".repeat(64)` and `sequence = 1`.
- **Canonical Serialization:** All payload fields are serialized with deterministically sorted keys to ensure that identical objects produce identical hashes regardless of runtime environment.
- **Preimage Formulation:**
  $$\text{Preimage}_k = \text{sequence}_k + ":" + \text{prev\_hash}_k + ":" + \text{event\_type}_k + ":" + \text{resource\_type}_k + ":" + \text{resource\_id}_k + ":" + \text{canonicalJson}(\text{payload}) + ":" + \text{timestampIso}$$
- **Block Hash:**
  $$\text{Hash}_k = \text{SHA256}(\text{Preimage}_k)$$

### 1.3 Verification API & UI
- **API Endpoint:** `GET /api/audit/verify` returns cryptographic validation status across all blocks.
- **Web Portal:** Accessible at `/audit`, featuring live visual integrity indicators (`AuditChainBadge`) and full event history exploration (`AuditLedgerTable`).

---

## 2. Automated Database Backup Runner & Disaster Recovery (`REQ-OPS-01`)

### 2.1 Backup Snapshot Pipeline
Automated snapshots can be triggered via CLI (`npm run backup:snapshot`) or scheduled automation.

```
Database Tables ─► Extraction ─► Gzip Compression ─► AES-256-GCM ─► Snapshot (.enc.gz)
                                                                 └► Checksum (.sha256)
```

1. **Table Extraction:** Exports core critical tables:
   - `projects`
   - `tasks`
   - `approvals`
   - `agent_runs`
   - `cost_records`
   - `memories`
   - `audit_events`
2. **Compression:** Compresses structured dataset with `zlib.gzipSync`.
3. **Encryption:** Encrypts with AES-256-GCM using 256-bit key, 96-bit random IV, and 128-bit authentication tag.
   - File format: `[12-byte IV][16-byte AuthTag][Ciphertext]`
4. **Integrity Digest:** Calculates SHA-256 checksum and saves alongside as `<filename>.sha256`.
5. **Retention Rotation:** Automatically retains the newest 7 daily snapshots and prunes older backups.

### 2.2 Disaster Recovery Drill & Zero-Loss Verification
The automated disaster recovery drill can be executed via `npm run backup:drill`.

It performs a 7-stage end-to-end verification:
1. **Pre-Backup Baseline:** Captures exact record counts and field checksums.
2. **Snapshot Creation:** Runs full encrypted snapshot.
3. **Checksum Verification:** Validates `.sha256` file match.
4. **Simulated Outage:** Simulates data loss/corruption scenario.
5. **Decryption & Topological Restoration:** Restores tables respecting foreign key order:
   `projects` → `tasks` → `approvals` → `agent_runs` → `cost_records` → `memories` → `audit_events`.
6. **Zero-Loss Parity Check:** Asserts 100% record count and column equivalence.
7. **RTO/RPO Compliance:**
   - **RTO:** Recovery Time Objective < 1 Hour (Drill executes in < 15 seconds).
   - **RPO:** Recovery Point Objective < 24 Hours.
