-- ==============================================================================
-- Migration: 20261115000002_rls_policies.sql
-- Description: Complete Row-Level Security (RLS) policies for Jarvis
-- Specification: docs/DATABASE_SCHEMA.md & docs/PERMISSION_POLICY.md
-- ==============================================================================

-- 1. Enable Row-Level Security on All Tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- 2. User Profiles Policies
CREATE POLICY "user_profiles_select_own"
    ON public.user_profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "user_profiles_update_own"
    ON public.user_profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_insert_own"
    ON public.user_profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- 3. Projects Policies
CREATE POLICY "projects_select_own"
    ON public.projects FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "projects_insert_own"
    ON public.projects FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_update_own"
    ON public.projects FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_delete_own"
    ON public.projects FOR DELETE
    USING (user_id = auth.uid());

-- 4. Milestones Policies (via Project Owner)
CREATE POLICY "milestones_select_own"
    ON public.milestones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = milestones.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "milestones_insert_own"
    ON public.milestones FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = milestones.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "milestones_update_own"
    ON public.milestones FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = milestones.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "milestones_delete_own"
    ON public.milestones FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = milestones.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- 5. Tasks Policies (via Project Owner)
CREATE POLICY "tasks_select_own"
    ON public.tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = tasks.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "tasks_insert_own"
    ON public.tasks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = tasks.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "tasks_update_own"
    ON public.tasks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = tasks.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "tasks_delete_own"
    ON public.tasks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = tasks.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- 6. Specifications Policies
CREATE POLICY "specifications_select_own"
    ON public.specifications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.projects ON projects.id = tasks.project_id
            WHERE tasks.id = specifications.task_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "specifications_insert_own"
    ON public.specifications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.projects ON projects.id = tasks.project_id
            WHERE tasks.id = specifications.task_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "specifications_update_own"
    ON public.specifications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.projects ON projects.id = tasks.project_id
            WHERE tasks.id = specifications.task_id
            AND projects.user_id = auth.uid()
        )
    );

-- 7. Plans Policies
CREATE POLICY "plans_select_own"
    ON public.plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.projects ON projects.id = tasks.project_id
            WHERE tasks.id = plans.task_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "plans_insert_own"
    ON public.plans FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.projects ON projects.id = tasks.project_id
            WHERE tasks.id = plans.task_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "plans_update_own"
    ON public.plans FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.projects ON projects.id = tasks.project_id
            WHERE tasks.id = plans.task_id
            AND projects.user_id = auth.uid()
        )
    );

-- 8. Approvals Policies (Append-mostly, updates restricted to decision fields)
CREATE POLICY "approvals_select_own"
    ON public.approvals FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "approvals_insert_own"
    ON public.approvals FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "approvals_update_decision"
    ON public.approvals FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 9. Agent Runs Policies
CREATE POLICY "agent_runs_select_own"
    ON public.agent_runs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.projects ON projects.id = tasks.project_id
            WHERE tasks.id = agent_runs.task_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "agent_runs_insert_own"
    ON public.agent_runs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.projects ON projects.id = tasks.project_id
            WHERE tasks.id = agent_runs.task_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "agent_runs_update_own"
    ON public.agent_runs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.projects ON projects.id = tasks.project_id
            WHERE tasks.id = agent_runs.task_id
            AND projects.user_id = auth.uid()
        )
    );

-- 10. Run Artifacts Policies
CREATE POLICY "run_artifacts_select_own"
    ON public.run_artifacts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.agent_runs
            JOIN public.tasks ON tasks.id = agent_runs.task_id
            JOIN public.projects ON projects.id = tasks.project_id
            WHERE agent_runs.id = run_artifacts.run_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "run_artifacts_insert_own"
    ON public.run_artifacts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agent_runs
            JOIN public.tasks ON tasks.id = agent_runs.task_id
            JOIN public.projects ON projects.id = tasks.project_id
            WHERE agent_runs.id = run_artifacts.run_id
            AND projects.user_id = auth.uid()
        )
    );

-- 11. Cost Records Policies (Immutable audit ledger: INSERT & SELECT only)
CREATE POLICY "cost_records_select_own"
    ON public.cost_records FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "cost_records_insert_own"
    ON public.cost_records FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 12. Audit Events Policies (Immutable security log: INSERT & SELECT only)
CREATE POLICY "audit_events_select_own"
    ON public.audit_events FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "audit_events_insert_own"
    ON public.audit_events FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 13. Memories Policies
CREATE POLICY "memories_select_own"
    ON public.memories FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "memories_insert_own"
    ON public.memories FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "memories_update_own"
    ON public.memories FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "memories_delete_own"
    ON public.memories FOR DELETE
    USING (user_id = auth.uid());
