import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BudgetManager } from './budget-manager.js';
import type { BudgetRepository, UserRepository, AuditRepository } from '@jarvis/database';

describe('Budget Manager', () => {
  const mockUserRepo = {
    getPreferences: async () => ({
      daily_budget_cap_inr: 25,
      monthly_budget_cap_inr: 750,
      emergency_reserve_inr: 250,
      emergency_reserve_approved: false,
      prefer_free_models: true,
    }),
  } as unknown as UserRepository;

  const mockAuditRepo = {
    append: async () => ({ id: 'audit-1' }),
  } as unknown as AuditRepository;

  it('allows free models without consuming budget', async () => {
    const mockBudgetRepo = {
      getDailySpendInr: async () => 0,
      getMonthlySpendInr: async () => 0,
    } as unknown as BudgetRepository;

    const manager = new BudgetManager(mockBudgetRepo, mockUserRepo, mockAuditRepo);

    const result = await manager.checkPreFlight({
      userId: 'user-1',
      modelId: 'meta-llama/llama-3.3-70b-instruct:free',
      estimatedPromptTokens: 1000,
      estimatedCompletionTokens: 500,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.isFree, true);
    assert.equal(result.estimatedCostInr, 0);
    assert.equal(result.requiresApproval, false);
  });

  it('blocks paid model when prefer_free_models is true', async () => {
    const mockBudgetRepo = {
      getDailySpendInr: async () => 0,
      getMonthlySpendInr: async () => 0,
    } as unknown as BudgetRepository;

    const manager = new BudgetManager(mockBudgetRepo, mockUserRepo, mockAuditRepo);

    const result = await manager.checkPreFlight({
      userId: 'user-1',
      modelId: 'anthropic/claude-3.5-sonnet',
      estimatedPromptTokens: 1000,
      estimatedCompletionTokens: 500,
      pricingPerMillionPromptUsd: 3,
      pricingPerMillionCompletionUsd: 15,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.isFree, false);
    assert.equal(result.requiresApproval, true);
    assert.match(result.rejectionReason ?? '', /explicit human approval/i);
  });

  it('blocks request when daily limit would be exceeded', async () => {
    const mockBudgetRepo = {
      getDailySpendInr: async () => 24.5,
      getMonthlySpendInr: async () => 100,
    } as unknown as BudgetRepository;

    const mockPaidUserRepo = {
      getPreferences: async () => ({
        daily_budget_cap_inr: 25,
        monthly_budget_cap_inr: 750,
        emergency_reserve_inr: 250,
        emergency_reserve_approved: false,
        prefer_free_models: false,
      }),
    } as unknown as UserRepository;

    const manager = new BudgetManager(mockBudgetRepo, mockPaidUserRepo, mockAuditRepo);

    const result = await manager.checkPreFlight({
      userId: 'user-1',
      modelId: 'openai/gpt-4o',
      estimatedPromptTokens: 10000,
      estimatedCompletionTokens: 10000,
      pricingPerMillionPromptUsd: 5,
      pricingPerMillionCompletionUsd: 15,
    });

    assert.equal(result.allowed, false);
    assert.match(result.rejectionReason ?? '', /daily limit exceeded/i);
  });
});
