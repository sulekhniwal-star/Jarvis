-- ==============================================================================
-- Migration: 20261114000003_storage_buckets.sql
-- Description: Private storage bucket for task artifacts with strict folder-level RLS
-- ==============================================================================

-- Create private bucket for task artifacts
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'task-artifacts',
    'task-artifacts',
    false,
    52428800, -- 50MB
    array['text/plain', 'text/markdown', 'application/json', 'application/zip', 'text/x-diff', 'text/x-patch']
)
on conflict (id) do update set
    public = false,
    file_size_limit = 52428800;

-- Enable RLS on storage.objects if not already enabled
alter table storage.objects enable row level security;

-- Storage RLS: Project owner can select their own artifacts
create policy "task_artifacts_owner_select" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'task-artifacts' 
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

-- Storage RLS: Project owner can insert artifacts
create policy "task_artifacts_owner_insert" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'task-artifacts' 
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

-- Storage RLS: Project owner can update (supports upserts: SELECT + INSERT + UPDATE required)
create policy "task_artifacts_owner_update" on storage.objects
    for update to authenticated
    using (
        bucket_id = 'task-artifacts' 
        and (storage.foldername(name))[1] = (select auth.uid())::text
    )
    with check (
        bucket_id = 'task-artifacts' 
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

-- Storage RLS: Project owner can delete artifacts
create policy "task_artifacts_owner_delete" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'task-artifacts' 
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );
