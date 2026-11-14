/**
 * Core non-negotiable architectural and financial constants.
 */

export const FINANCIAL_LIMITS = {
  DAILY_SPEND_CAP_INR: 25.0,
  MONTHLY_SPEND_CAP_INR: 750.0,
  EMERGENCY_RESERVE_CAP_INR: 250.0,
  MAX_MONTHLY_LIMIT_INR: 1000.0,
  DEFAULT_USD_TO_INR_RATE: 87.5,
} as const;

export const RETRY_LIMITS = {
  MAX_ROUTINE_RETRIES: 3,
  MAX_COMPLEX_RETRIES: 5,
  MAX_SECURITY_RETRIES: 0, // Security findings immediately halt execution
} as const;

export const MODEL_DEFAULTS = {
  DEFAULT_FREE_ROUTER: 'openrouter/free',
  FREE_MODEL_SUFFIX: ':free',
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
} as const;

export const QUEUE_NAMES = {
  TASK_DISPATCH_QUEUE: 'jarvis_task_queue',
  AGENT_RUN_QUEUE: 'jarvis_agent_run_queue',
} as const;

export const STORAGE_BUCKETS = {
  TASK_ARTIFACTS: 'task-artifacts',
} as const;
