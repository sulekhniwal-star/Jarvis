import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateWebhookSecret } from '@jarvis/telegram-integration';
import { CreateTaskInputSchema } from '@jarvis/shared-contracts';

describe('Dashboard Webhook & Contract Tests', () => {
  it('validates secret token handshake', () => {
    const valid = validateWebhookSecret('secret-token-xyz', 'secret-token-xyz');
    assert.equal(valid, true);

    const invalid = validateWebhookSecret('bad-token', 'secret-token-xyz');
    assert.equal(invalid, false);
  });

  it('validates task intake schema', () => {
    const validPayload = {
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Fix issue with login',
      promptRaw: 'Check why refresh tokens expire after 5 minutes',
      priority: 'HIGH',
    };

    const parsed = CreateTaskInputSchema.safeParse(validPayload);
    assert.equal(parsed.success, true);
  });

  it('rejects invalid task intake schema', () => {
    const invalidPayload = {
      projectId: 'not-a-uuid',
      title: 'A', // too short
      promptRaw: '',
    };

    const parsed = CreateTaskInputSchema.safeParse(invalidPayload);
    assert.equal(parsed.success, false);
  });
});
