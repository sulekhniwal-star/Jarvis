# Database Schema --- Initial Logical Model

This is a logical starting point. Convert to reviewed SQL migrations
before implementation.

## Core tables

### users

-   id (UUID, PK)
-   display_name
-   auth_subject (unique external identity)
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

## Data rules

-   Use UTC timestamps in storage.
-   Apply foreign keys and indexes.
-   Use migrations; never modify production schema manually.
-   Add row-level security only after threat-model review; do not assume
    RLS alone secures privileged service operations.
-   Redact secrets before logs.
-   Define retention and deletion rules before launch.
-   Back up database and test restore.
