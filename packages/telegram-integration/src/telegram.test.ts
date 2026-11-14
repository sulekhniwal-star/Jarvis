import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateWebhookSecret, isChatAuthorized } from './auth.js';
import { TelegramCommandRouter } from './command-router.js';
import type { ITelegramClient } from './telegram-client.js';
import type {
  SendMessageOptions,
  EditMessageTextOptions,
  AnswerCallbackQueryOptions,
  TelegramMessage,
} from './types.js';

describe('Telegram Security & Authentication', () => {
  it('validates matching webhook secret token', () => {
    const secret = 'super-secret-high-entropy-token-12345';
    assert.equal(validateWebhookSecret(secret, secret), true);
  });

  it('rejects non-matching secret token', () => {
    assert.equal(validateWebhookSecret('wrong-secret', 'expected-secret'), false);
    assert.equal(validateWebhookSecret(null, 'expected-secret'), false);
    assert.equal(validateWebhookSecret('short', 'much-longer-secret-token'), false);
  });

  it('verifies authorized chat ID', () => {
    assert.equal(isChatAuthorized(12345678, '12345678'), true);
    assert.equal(isChatAuthorized('99999999', '99999999'), true);
    assert.equal(isChatAuthorized(12345678, '87654321'), false);
    assert.equal(isChatAuthorized(12345678, null), false);
  });
});

describe('Telegram Command Router & Flow', () => {
  const sentMessages: SendMessageOptions[] = [];
  const editedMessages: EditMessageTextOptions[] = [];
  const answeredCallbacks: AnswerCallbackQueryOptions[] = [];

  const mockTelegramClient: ITelegramClient = {
    sendMessage: async (opts) => {
      sentMessages.push(opts);
      return {
        message_id: 101,
        chat: { id: Number(opts.chat_id), type: 'private' },
        date: Date.now(),
        text: opts.text,
      };
    },
    editMessageText: async (opts) => {
      editedMessages.push(opts);
      return true;
    },
    answerCallbackQuery: async (opts) => {
      answeredCallbacks.push(opts);
      return true;
    },
  };

  let taskCreated = false;
  const mockTaskCoordinator = {
    createTask: async (input: any, userId: string) => {
      taskCreated = true;
      return {
        id: '00000000-0000-0000-0000-000000000001',
        title: input.title,
        status: 'INTAKE',
        user_id: userId,
      };
    },
    cancelTask: async () => {},
  } as any;

  let resolvedApprovalId: string | null = null;
  let resolvedStatus: string | null = null;
  const mockPermissionEngine = {
    resolveApproval: async (ticketId: string, _userId: string, status: string) => {
      resolvedApprovalId = ticketId;
      resolvedStatus = status;
      return { id: ticketId, status };
    },
  } as any;

  const mockBudgetManager = {
    getSummary: async () => ({
      dailySpendInr: 5.5,
      dailyLimitInr: 25.0,
      monthlySpendInr: 150.0,
      monthlyLimitInr: 750.0,
      emergencyReserveInr: 250.0,
      emergencyReserveApproved: false,
      isExceeded: false,
    }),
  } as any;

  const mockProjectRepo = {
    listByUser: async () => [
      {
        id: 'proj-1',
        name: 'Jarvis Core Engine',
        slug: 'jarvis-core',
        default_branch: 'main',
        repo_url: 'https://github.com/user/jarvis',
      },
    ],
  } as any;

  const mockTaskRepo = {
    listByUser: async () => [
      {
        id: 'task-1234',
        title: 'Initial Build',
        status: 'RUNNING',
      },
    ],
  } as any;

  const mockApprovalRepo = {
    listPendingByUser: async () => [
      {
        id: 'apr-9999',
        action_type: 'PROD_DEPLOY',
        status: 'PENDING',
      },
    ],
  } as any;

  const router = new TelegramCommandRouter({
    telegramClient: mockTelegramClient,
    taskCoordinator: mockTaskCoordinator,
    permissionEngine: mockPermissionEngine,
    budgetManager: mockBudgetManager,
    userRepo: {} as any,
    projectRepo: mockProjectRepo,
    taskRepo: mockTaskRepo,
    approvalRepo: mockApprovalRepo,
    budgetRepo: {} as any,
    auditRepo: {} as any,
    authorizedChatId: '12345678',
    defaultUserId: 'user-001',
  });

  it('rejects unauthorized chat ID', async () => {
    sentMessages.length = 0;
    await router.handleUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        chat: { id: 88888888, type: 'private' },
        date: Date.now(),
        text: '/status',
      },
    });

    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0].text, /Access Denied/i);
  });

  it('handles /status command with budget and task statistics', async () => {
    sentMessages.length = 0;
    await router.handleUpdate({
      update_id: 2,
      message: {
        message_id: 2,
        chat: { id: 12345678, type: 'private' },
        date: Date.now(),
        text: '/status',
      },
    });

    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0].text, /Jarvis System Status/);
    assert.match(sentMessages[0].text, /Today's Spend.*₹5.50/);
    assert.match(sentMessages[0].text, /Active Tasks.*1/);
  });

  it('handles /task command to intake new task', async () => {
    sentMessages.length = 0;
    taskCreated = false;
    await router.handleUpdate({
      update_id: 3,
      message: {
        message_id: 3,
        chat: { id: 12345678, type: 'private' },
        date: Date.now(),
        text: '/task Implement OAuth login flow with Google',
      },
    });

    assert.equal(taskCreated, true);
    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0].text, /Task Created & Enqueued/);
  });

  it('handles /budget command', async () => {
    sentMessages.length = 0;
    await router.handleUpdate({
      update_id: 4,
      message: {
        message_id: 4,
        chat: { id: 12345678, type: 'private' },
        date: Date.now(),
        text: '/budget',
      },
    });

    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0].text, /Financial & Budget Controls/);
    assert.match(sentMessages[0].text, /Daily Spend.*₹5.50/);
  });

  it('handles /approve command', async () => {
    sentMessages.length = 0;
    resolvedApprovalId = null;
    await router.handleUpdate({
      update_id: 5,
      message: {
        message_id: 5,
        chat: { id: 12345678, type: 'private' },
        date: Date.now(),
        text: '/approve apr-9999',
      },
    });

    assert.equal(resolvedApprovalId, 'apr-9999');
    assert.equal(resolvedStatus, 'APPROVED');
    assert.match(sentMessages[0].text, /APPROVED/);
  });

  it('handles inline button callback queries', async () => {
    editedMessages.length = 0;
    answeredCallbacks.length = 0;
    resolvedApprovalId = null;

    await router.handleUpdate({
      update_id: 6,
      callback_query: {
        id: 'cb-1',
        from: { id: 12345678, is_bot: false, first_name: 'Admin' },
        message: {
          message_id: 77,
          chat: { id: 12345678, type: 'private' },
          date: Date.now(),
          text: 'Action Approval Required: PROD_DEPLOY',
        },
        data: 'approve:apr-9999',
      },
    });

    assert.equal(resolvedApprovalId, 'apr-9999');
    assert.equal(resolvedStatus, 'APPROVED');
    assert.equal(answeredCallbacks.length, 1);
    assert.equal(editedMessages.length, 1);
    assert.match(editedMessages[0].text, /APPROVED/);
  });

  it('generates interactive approval alert message with inline buttons', async () => {
    sentMessages.length = 0;
    await router.sendApprovalRequestAlert({
      id: 'ticket-456',
      actionType: 'PROD_DEPLOY',
      riskLevel: 'CRITICAL',
      details: 'Deploying release v1.0.0 to Vercel production',
    });

    assert.equal(sentMessages.length, 1);
    const msg = sentMessages[0];
    assert.match(msg.text, /Action Approval Required/);
    assert.ok(msg.reply_markup?.inline_keyboard);
    assert.equal(msg.reply_markup.inline_keyboard[0][0].text, '✅ Approve');
    assert.equal(msg.reply_markup.inline_keyboard[0][1].text, '🛑 Reject');
  });
});
