-- ==============================================================================
-- Migration: 20261114000002_rls_policies.sql
-- Description: Strict Row Level Security policies adhering to Supabase best practices
-- ==============================================================================

-- Enable RLS on all tables in public schema
alter table public.user_preferences enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.agent_runs enable row level security;
alter table public.approval_requests enable row level security;
alter table public.budget_ledgers enable row level security;
alter table public.memories enable row level security;
alter table public.audit_logs enable row level security;

-- 1. user_preferences Policies
create policy "user_preferences_owner_select" on public.user_preferences
    for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "user_preferences_owner_insert" on public.user_preferences
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

create policy "user_preferences_owner_update" on public.user_preferences
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "user_preferences_owner_delete" on public.user_preferences
    for delete to authenticated
    using ((select auth.uid()) = user_id);

-- 2. projects Policies
create policy "projects_owner_select" on public.projects
    for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "projects_owner_insert" on public.projects
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

create policy "projects_owner_update" on public.projects
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "projects_owner_delete" on public.projects
    for delete to authenticated
    using ((select auth.uid()) = user_id);

-- 3. milestones Policies
create policy "milestones_owner_select" on public.milestones
    for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "milestones_owner_insert" on public.milestones
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

create policy "milestones_owner_update" on public.milestones
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "milestones_owner_delete" on public.milestones
    for delete to authenticated
    using ((select auth.uid()) = user_id);

-- 4. tasks Policies
create policy "tasks_owner_select" on public.tasks
    for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "tasks_owner_insert" on public.tasks
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

create policy "tasks_owner_update" on public.tasks
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "tasks_owner_delete" on public.tasks
    for delete to authenticated
    using ((select auth.uid()) = user_id);

-- 5. agent_runs Policies
create policy "agent_runs_owner_select" on public.agent_runs
    for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "agent_runs_owner_insert" on public.agent_runs
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

create policy "agent_runs_owner_update" on public.agent_runs
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

-- 6. approval_requests Policies
create policy "approval_requests_owner_select" on public.approval_requests
    for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "approval_requests_owner_insert" on public.approval_requests
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

create policy "approval_requests_owner_update" on public.approval_requests
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

-- 7. budget_ledgers Policies (Append-Only / Immutable)
create policy "budget_ledgers_owner_select" on public.budget_ledgers
    for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "budget_ledgers_owner_insert" on public.budget_ledgers
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

-- Explicitly revoke destructive updates and deletes on financial ledger
revoke update, delete on public.budget_ledgers from public, anon, authenticated;

-- 8. memories Policies
create policy "memories_owner_select" on public.memories
    for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "memories_owner_insert" on public.memories
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

create policy "memories_owner_update" on public.memories
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "memories_owner_delete" on public.memories
    for delete to authenticated
    using ((select auth.uid()) = user_id);

-- 9. audit_logs Policies (Append-Only / Immutable)
create policy "audit_logs_owner_select" on public.audit_logs
    for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "audit_logs_owner_insert" on public.audit_logs
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

-- Explicitly revoke destructive updates and deletes on audit log
revoke update, delete on public.audit_logs from public, anon, authenticated;

-- 10. Security Invoker View for Project Metrics
create or replace view public.v_project_summary
with (security_invoker = true) as
select 
    p.id as project_id,
    p.user_id,
    p.name,
    p.slug,
    p.status,
    count(distinct t.id) as total_tasks,
    count(distinct case when t.status = 'COMPLETED' then t.id end) as completed_tasks,
    count(distinct case when t.status in ('INTAKE', 'PLANNING', 'DISPATCHED', 'RUNNING', 'TESTING') then t.id end) as active_tasks,
    coalesce(sum(ar.actual_cost_inr), 0.0000) as total_cost_inr
from public.projects p
left join public.tasks t on t.project_id = p.id
left join public.agent_runs ar on ar.task_id = t.id
group by p.id, p.user_id, p.name, p.slug, p.status;
