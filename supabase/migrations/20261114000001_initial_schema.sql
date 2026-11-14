-- ==============================================================================
-- Migration: 20261114000001_initial_schema.sql
-- Description: Core extensions, schema entities, foreign keys, and indexes
-- ==============================================================================

-- Enable mandatory extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";
create extension if not exists "pgmq";

-- Global trigger function for timestamp auditing
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql security invoker;

-- 1. User Preferences Table
create table public.user_preferences (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade unique,
    auto_approve_low_risk boolean not null default false,
    prefer_free_models boolean not null default true,
    default_coding_model text not null default 'openrouter/free',
    default_coding_adapter text not null default 'AiderCliAdapter',
    monthly_budget_cap_inr numeric(10, 4) not null default 750.0000,
    daily_budget_cap_inr numeric(10, 4) not null default 25.0000,
    emergency_reserve_inr numeric(10, 4) not null default 250.0000,
    emergency_reserve_approved boolean not null default false,
    telegram_chat_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger tr_user_preferences_updated_at
    before update on public.user_preferences
    for each row execute function public.set_updated_at();

-- 2. Projects Table
create table public.projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    slug text not null,
    github_repo_full_name text not null,
    github_installation_id bigint not null default 0,
    default_branch text not null default 'main',
    status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'ARCHIVED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_projects_user_slug unique (user_id, slug)
);

create index idx_projects_user_id on public.projects(user_id);
create index idx_projects_status on public.projects(status);

create trigger tr_projects_updated_at
    before update on public.projects
    for each row execute function public.set_updated_at();

-- 3. Milestones Table
create table public.milestones (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    sequence_order int not null default 1,
    status text not null default 'PLANNED' check (status in ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED')),
    target_completion timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_milestones_project_id on public.milestones(project_id);
create index idx_milestones_user_id on public.milestones(user_id);

create trigger tr_milestones_updated_at
    before update on public.milestones
    for each row execute function public.set_updated_at();

-- 4. Tasks Table
create table public.tasks (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    milestone_id uuid references public.milestones(id) on delete set null,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    prompt_raw text not null,
    specification jsonb not null default '{}'::jsonb,
    implementation_plan jsonb not null default '{}'::jsonb,
    status text not null default 'INTAKE' check (
        status in (
            'INTAKE', 'SPECIFYING', 'PLANNING', 'PENDING_APPROVAL', 
            'DISPATCHED', 'RUNNING', 'TESTING', 'SELF_HEALING', 
            'PR_CREATED', 'COMPLETED', 'ESCALATED', 'CANCELLED', 'EMERGENCY_ABORTED'
        )
    ),
    priority text not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    retry_count int not null default 0,
    max_retries int not null default 3,
    target_branch text,
    pr_number int,
    version int not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_tasks_project_id on public.tasks(project_id);
create index idx_tasks_milestone_id on public.tasks(milestone_id);
create index idx_tasks_user_id on public.tasks(user_id);
create index idx_tasks_status on public.tasks(status);

create trigger tr_tasks_updated_at
    before update on public.tasks
    for each row execute function public.set_updated_at();

-- 5. Agent Runs Table
create table public.agent_runs (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    agent_type text not null check (agent_type in ('SPEC_AGENT', 'PLAN_AGENT', 'CODING_AGENT', 'QA_AGENT', 'REVIEW_AGENT', 'MAINTENANCE_AGENT')),
    model_id text not null,
    runner_environment text not null check (runner_environment in ('LOCAL', 'GITHUB_ACTIONS', 'DOCKER')),
    github_workflow_run_id text,
    status text not null default 'STARTING' check (status in ('STARTING', 'EXECUTING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'ABORTED')),
    prompt_tokens int not null default 0,
    completion_tokens int not null default 0,
    actual_cost_usd numeric(10, 6) not null default 0.000000,
    actual_cost_inr numeric(10, 4) not null default 0.0000,
    is_cost_confirmed boolean not null default false,
    openrouter_generation_id text,
    failure_reason text,
    started_at timestamptz not null default now(),
    completed_at timestamptz
);

create index idx_agent_runs_task_id on public.agent_runs(task_id);
create index idx_agent_runs_user_id on public.agent_runs(user_id);
create index idx_agent_runs_status on public.agent_runs(status);

-- 6. Approval Requests Table
create table public.approval_requests (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    action_type text not null check (
        action_type in (
            'PROD_DEPLOY', 'SEND_MESSAGE', 'SPEND_FUNDS', 
            'PAID_AI_INFERENCE', 'MAJOR_ARCH_CHANGE', 
            'SENSITIVE_DB_OP', 'ACCOUNT_CHANGE', 'DESTRUCTIVE_ACTION', 'NEW_DEPENDENCY'
        )
    ),
    payload_preview jsonb not null,
    status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
    user_comment text,
    requested_at timestamptz not null default now(),
    resolved_at timestamptz
);

create index idx_approval_requests_task_id on public.approval_requests(task_id);
create index idx_approval_requests_user_id on public.approval_requests(user_id);
create index idx_approval_requests_status on public.approval_requests(status);

-- 7. Budget Ledgers Table (Immutable Financial Ledger)
create table public.budget_ledgers (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    agent_run_id uuid references public.agent_runs(id) on delete set null,
    billing_date date not null default current_date,
    amount_inr numeric(10, 4) not null,
    amount_usd numeric(10, 6) not null,
    provider text not null default 'OpenRouter',
    model_id text not null,
    is_actual boolean not null default false,
    recorded_at timestamptz not null default now()
);

create index idx_budget_ledgers_user_date on public.budget_ledgers(user_id, billing_date);
create index idx_budget_ledgers_run_id on public.budget_ledgers(agent_run_id);

-- 8. Memories Table (Long-Term Vector Memory)
create table public.memories (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    category text not null check (category in ('DECISION', 'PATTERN', 'BUG_FIX', 'PREFERENCE', 'ARCH_RECORD')),
    content text not null,
    embedding vector(1536),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index idx_memories_project_id on public.memories(project_id);
create index idx_memories_user_id on public.memories(user_id);
create index idx_memories_embedding on public.memories using hnsw (embedding vector_cosine_ops);

-- 9. Audit Logs Table (Immutable System & Security Log)
create table public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    event_type text not null,
    severity text not null check (severity in ('INFO', 'WARNING', 'CRITICAL', 'SECURITY')),
    details jsonb not null default '{}'::jsonb,
    client_ip inet,
    channel text not null default 'SYSTEM' check (channel in ('SYSTEM', 'TELEGRAM', 'WEB', 'RUNNER', 'GITHUB_WEBHOOK')),
    timestamp timestamptz not null default now()
);

create index idx_audit_logs_user_id on public.audit_logs(user_id);
create index idx_audit_logs_severity on public.audit_logs(severity);
create index idx_audit_logs_timestamp on public.audit_logs(timestamp);
