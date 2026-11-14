-- ==============================================================================
-- Seed: seed.sql
-- Description: Development and test fixtures for local Supabase environments
-- ==============================================================================

-- Create a mock development user in auth.users if not exists
do $$
declare
    v_user_id uuid := '00000000-0000-0000-0000-000000000001';
begin
    if not exists (select 1 from auth.users where id = v_user_id) then
        insert into auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud
        ) values (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'dev@jarvis.internal',
            crypt('password123', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Lead Architect"}',
            now(),
            now(),
            'authenticated',
            'authenticated'
        );
    end if;

    -- Seed user preferences
    insert into public.user_preferences (
        user_id,
        auto_approve_low_risk,
        prefer_free_models,
        default_coding_model,
        monthly_budget_cap_inr,
        daily_budget_cap_inr,
        emergency_reserve_inr
    ) values (
        v_user_id,
        false,
        true,
        'openrouter/free',
        750.0000,
        25.0000,
        250.0000
    ) on conflict (user_id) do nothing;

    -- Seed initial sample project
    insert into public.projects (
        id,
        user_id,
        name,
        slug,
        github_repo_full_name,
        github_installation_id,
        default_branch,
        status
    ) values (
        '11111111-1111-1111-1111-111111111111',
        v_user_id,
        'Jarvis Core API',
        'jarvis-core-api',
        'sulekhniwal-star/Jarvis',
        12345678,
        'main',
        'ACTIVE'
    ) on conflict do nothing;

    -- Seed sample milestone
    insert into public.milestones (
        id,
        project_id,
        user_id,
        title,
        description,
        sequence_order,
        status
    ) values (
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        v_user_id,
        'Milestone 1: Supabase Foundation',
        'Establish core persistence, RLS security, and queueing infrastructure.',
        1,
        'IN_PROGRESS'
    ) on conflict do nothing;

    -- Seed sample task
    insert into public.tasks (
        id,
        project_id,
        milestone_id,
        user_id,
        title,
        prompt_raw,
        status,
        priority
    ) values (
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        v_user_id,
        'Setup Supabase Migrations and RLS Policies',
        'Create complete initial schema, strict RLS policies, and private storage buckets.',
        'COMPLETED',
        'HIGH'
    ) on conflict do nothing;

end $$;
