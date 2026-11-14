import { createClient } from '@supabase/supabase-js';
import type { Database } from '@jarvis/database';
import {
  UserRepository,
  ProjectRepository,
  MilestoneRepository,
  TaskRepository,
  AgentRunRepository,
  ApprovalRepository,
  BudgetRepository,
  AuditRepository,
  QueueRepository,
} from '@jarvis/database';
import { PermissionEngine } from '@jarvis/permission-engine';
import { BudgetManager } from '@jarvis/budget-manager';
import { TaskCoordinator } from '@jarvis/agent-orchestrator';
import { TelegramBotClient, TelegramCommandRouter } from '@jarvis/telegram-integration';

// Default development fallback user ID matching supabase/seed.sql
export const DEFAULT_ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.empty';

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Repositories
export const userRepo = new UserRepository(supabaseClient);
export const projectRepo = new ProjectRepository(supabaseClient);
export const milestoneRepo = new MilestoneRepository(supabaseClient);
export const taskRepo = new TaskRepository(supabaseClient);
export const agentRunRepo = new AgentRunRepository(supabaseClient);
export const approvalRepo = new ApprovalRepository(supabaseClient);
export const budgetRepo = new BudgetRepository(supabaseClient);
export const auditRepo = new AuditRepository(supabaseClient);
export const queueRepo = new QueueRepository(supabaseClient);

// Core Control Plane Services
export const permissionEngine = new PermissionEngine(approvalRepo, auditRepo);
export const budgetManager = new BudgetManager(budgetRepo, userRepo, auditRepo);
export const taskCoordinator = new TaskCoordinator(
  taskRepo,
  auditRepo,
  queueRepo,
  permissionEngine,
  budgetManager
);

// Telegram Services
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || 'dummy-token';
export const telegramClient = new TelegramBotClient(telegramToken);
export const telegramRouter = new TelegramCommandRouter({
  telegramClient,
  taskCoordinator,
  permissionEngine,
  budgetManager,
  userRepo,
  projectRepo,
  taskRepo,
  approvalRepo,
  budgetRepo,
  auditRepo,
  authorizedChatId: process.env.ADMIN_TELEGRAM_CHAT_ID || '12345678',
  defaultUserId: DEFAULT_ADMIN_USER_ID,
});
