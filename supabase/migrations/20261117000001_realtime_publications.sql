-- Migration: Enable Realtime publications for tasks, agent_runs, projects, and approvals
-- Phase 26: Real-Time State Synchronization Engine (REQ-RT-01, NFR-REL-01)

DO $$
BEGIN
  -- Add tasks table to supabase_realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;

  -- Add agent_runs table to supabase_realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'agent_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_runs;
  END IF;

  -- Add projects table to supabase_realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  END IF;

  -- Add approvals table to supabase_realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'approvals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL so UPDATE and DELETE events provide complete record data
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.agent_runs REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.approvals REPLICA IDENTITY FULL;
