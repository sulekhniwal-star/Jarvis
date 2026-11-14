# Backup and Recovery

## Data to protect

-   PostgreSQL database.
-   Project and decision memory.
-   Task metadata and audit events.
-   Important artifacts and test evidence.
-   Configuration documentation (not secrets).
-   Infrastructure/deployment definitions.
-   Git repositories (also protected by GitHub history).

## Backup policy and SLAs

-   **Backup frequency:** Automated daily logical backup (`pg_dump`) executed at 02:00 UTC.
-   **Retention period:** 30 daily snapshots; 12 monthly archives.
-   **Storage provider:** Client-side encrypted snapshots stored in GitHub Actions encrypted artifacts / private cloud storage.
-   **Encryption standard:** Fernet (AES-128-CBC with HMAC-SHA256 authenticated encryption) using `MASTER_ENCRYPTION_KEY`.
-   **Recovery point objective (RPO):** Maximum 24 hours of task metadata.
-   **Recovery time objective (RTO):** Maximum 2 hours to provision a clean database and restore schema/data.

Do not claim backup coverage until automated jobs and restore tests
exist.

## Recovery procedure

1.  Trigger emergency stop if compromise is suspected.
2.  Isolate affected services.
3.  Identify last known-good backup.
4.  Restore into a separate recovery environment.
5.  Validate schema, row counts, task state, and audit integrity.
6.  Rotate credentials if exposure is possible.
7.  Reconnect integrations with least privilege.
8.  Resume queue only after owner approval.
9.  Document recovery and data loss window.

## Test requirements

-   Periodic database restore to separate environment.
-   Validate artifacts and references.
-   Test recovery after interrupted worker.
-   Verify no secrets are included in backups unintentionally.
-   Record restore duration and outcome.

## Retention and deletion

Set explicit retention for logs, task artifacts, and memory. Deletion
from active database does not necessarily remove backup copies
immediately; document retention behavior and honour applicable privacy
obligations.
