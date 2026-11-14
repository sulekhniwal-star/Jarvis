-- ==============================================================================
-- Migration: 20261114000004_queues.sql
-- Description: Initialize pgmq queues for asynchronous background task execution
-- ==============================================================================

-- Create durable background queues using pgmq extension
do $$
begin
    -- Initialize task dispatch queue if not present
    if not exists (select 1 from pgmq.list_queues() where queue_name = 'jarvis_task_queue') then
        perform pgmq.create('jarvis_task_queue');
    end if;

    -- Initialize agent run queue if not present
    if not exists (select 1 from pgmq.list_queues() where queue_name = 'jarvis_agent_run_queue') then
        perform pgmq.create('jarvis_agent_run_queue');
    end if;
end $$;

-- Helper function to safely enqueue a task payload
create or replace function public.enqueue_task_event(
    p_queue text,
    p_task_id uuid,
    p_event_type text,
    p_payload jsonb default '{}'::jsonb
)
returns bigint as $$
declare
    v_msg_id bigint;
begin
    select pgmq.send(
        p_queue,
        jsonb_build_object(
            'taskId', p_task_id,
            'eventType', p_event_type,
            'enqueuedAt', now(),
            'payload', p_payload
        )
    ) into v_msg_id;
    
    return v_msg_id;
end;
$$ language plpgsql security invoker;
