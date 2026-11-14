# Database Schema --- Initial Logical Model

This is a logical starting point. Convert to reviewed SQL migrations
before implementation.

## Core tables

### users

-   id (UUID, PK)
-   display_name
-   auth_subject (unique external identity)
-   password_hash (VARCHAR(255), nullable for external auth, hashed with Argon2id)
-   status
-   created_at, updated_at

MVP should support one owner but avoid hardcoding owner identity in
business logic.

### projects

-   id (UUID, PK)
-   name
-   description
-   github_installation_id (nullable)
-   repository_owner
-   repository_name
-   default_branch
-   status
-   created_at, updated_at

### tasks

-   id (UUID, PK)
-   project_id (FK)
-   created_by (FK)
-   title, description
-   status
-   priority
-   idempotency_key (unique where applicable)
-   requested_scope (JSON)
-   resource_limits (JSON)
-   created_at, started_at, completed_at, updated_at

### task_steps

-   id (UUID, PK)
-   task_id (FK)
-   sequence
-   name, description
-   status
-   attempt_count
-   started_at, completed_at
-   result_summary

### executions

-   id (UUID, PK)
-   task_id (FK)
-   worker_reference
-   environment_digest
-   status
-   started_at, ended_at
-   exit_code
-   resource_usage (JSON)
-   cleanup_status

### artifacts

-   id (UUID, PK)
-   task_id (FK)
-   execution_id (FK)
-   type
-   storage_reference
-   checksum
-   metadata (JSON)
-   created_at

### approvals

-   id (UUID, PK)
-   task_id (FK)
-   action_type
-   canonical_action_payload
-   payload_hash
-   requested_by_agent
-   status
-   expires_at
-   decided_by
-   decided_at
-   decision_reason

Approval must bind to exact action parameters; changing payload
invalidates approval.

### audit_events

-   id (UUID, PK)
-   actor_type, actor_id
-   action
-   target_type, target_id
-   decision
-   correlation_id
-   metadata (redacted JSON)
-   prev_event_hash (VARCHAR(64), nullable for genesis event, SHA-256 link)
-   event_hash (VARCHAR(64), SHA-256 of prev_event_hash + canonical record)
-   created_at

### memories

-   id (UUID, PK)
-   scope_type (shared/project)
-   scope_id (nullable for shared)
-   category
-   content
-   source_task_id (nullable)
-   confidence
-   status (active/superseded/archived)
-   valid_from, valid_to
-   created_at, updated_at

Do not store secrets or sensitive authentication material.

### decisions

-   id (UUID, PK)
-   project_id (nullable)
-   title
-   decision
-   rationale
-   status (proposed/accepted/superseded/rejected)
-   supersedes_decision_id (nullable)
-   decided_by
-   decided_at

### provider_usage

-   id (UUID, PK)
-   task_id
-   provider
-   model
-   input_tokens
-   output_tokens
-   estimated_cost
-   currency
-   billing_mode
-   created_at

### integration_credentials

Do not store raw credentials here. Store provider references or
encrypted secret-manager references, rotation metadata, and scopes only.

### checkpoints (LangGraph State Saver)

Managed via `langgraph-checkpoint-postgres` (`AsyncPostgresSaver`):
-   thread_id (TEXT, PK)
-   checkpoint_ns (TEXT, PK, default empty string)
-   checkpoint_id (TEXT, PK)
-   parent_checkpoint_id (TEXT, nullable)
-   type (TEXT)
-   checkpoint (BYTEA / JSONB, serialized graph state)
-   metadata (JSONB)

### checkpoint_blobs (LangGraph Large Object Storage)

-   thread_id (TEXT, PK)
-   checkpoint_ns (TEXT, PK)
-   channel (TEXT, PK)
-   version (TEXT, PK)
-   type (TEXT)
-   blob (BYTEA)

### checkpoint_writes (LangGraph Pending Node Writes)

-   thread_id (TEXT, PK)
-   checkpoint_ns (TEXT, PK)
-   checkpoint_id (TEXT, PK)
-   task_id (TEXT, PK)
-   idx (INTEGER, PK)
-   channel (TEXT)
-   type (TEXT)
-   blob (BYTEA)

*Note on LangGraph Persistence:* Tables are provisioned via `checkpointer.setup()` with `autocommit=True` and `row_factory=dict_row`. Deserialization enforces `LANGGRAPH_STRICT_MSGPACK=true`.

## Data rules

-   Use UTC timestamps in storage.
-   Apply foreign keys and indexes.
-   Use migrations; never modify production schema manually.
-   Add row-level security only after threat-model review; do not assume
    RLS alone secures privileged service operations.
-   Redact secrets before logs.
-   Define retention and deletion rules before launch.
-   Back up database and test restore.
