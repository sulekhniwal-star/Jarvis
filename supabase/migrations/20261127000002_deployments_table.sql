-- Fix BUG-009: Create persistent deployments table with RLS
CREATE TABLE IF NOT EXISTS public.deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment TEXT NOT NULL CHECK (environment IN ('preview', 'production')),
    commit_sha TEXT NOT NULL,
    commit_message TEXT NOT NULL DEFAULT '',
    branch TEXT NOT NULL DEFAULT 'main',
    status TEXT NOT NULL DEFAULT 'building' CHECK (status IN ('building', 'deployed', 'failed', 'rolled_back')),
    preview_url TEXT,
    production_url TEXT,
    approval_id UUID REFERENCES public.approvals(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    rollback_target_id UUID REFERENCES public.deployments(id) ON DELETE SET NULL,
    verification_passed BOOLEAN NOT NULL DEFAULT true,
    verification_summary TEXT,
    error_message TEXT,
    deployed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deployments_env_status ON public.deployments(environment, status);
CREATE INDEX IF NOT EXISTS idx_deployments_created_by ON public.deployments(created_by);

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deployments_select_own"
    ON public.deployments FOR SELECT
    USING (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "deployments_insert_own"
    ON public.deployments FOR INSERT
    WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "deployments_update_own"
    ON public.deployments FOR UPDATE
    USING (created_by = auth.uid() OR created_by IS NULL);
