import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidTaskTransition, assertValidTaskTransition } from './state-machine.js';
import { TaskStateTransitionError } from './errors.js';

describe('Task State Machine', () => {
  it('allows valid transitions from INTAKE', () => {
    assert.equal(isValidTaskTransition('INTAKE', 'SPECIFYING'), true);
    assert.equal(isValidTaskTransition('INTAKE', 'CANCELLED'), true);
  });

  it('rejects invalid transitions from INTAKE', () => {
    assert.equal(isValidTaskTransition('INTAKE', 'COMPLETED'), false);
    assert.equal(isValidTaskTransition('INTAKE', 'RUNNING'), false);
  });

  it('allows approval workflow transitions from PENDING_APPROVAL', () => {
    assert.equal(isValidTaskTransition('PENDING_APPROVAL', 'DISPATCHED'), true);
    assert.equal(isValidTaskTransition('PENDING_APPROVAL', 'PLANNING'), true);
    assert.equal(isValidTaskTransition('PENDING_APPROVAL', 'ESCALATED'), true);
    assert.equal(isValidTaskTransition('PENDING_APPROVAL', 'CANCELLED'), true);
  });

  it('allows execution lifecycle transitions', () => {
    assert.equal(isValidTaskTransition('DISPATCHED', 'RUNNING'), true);
    assert.equal(isValidTaskTransition('RUNNING', 'TESTING'), true);
    assert.equal(isValidTaskTransition('TESTING', 'SELF_HEALING'), true);
    assert.equal(isValidTaskTransition('TESTING', 'PR_CREATED'), true);
    assert.equal(isValidTaskTransition('PR_CREATED', 'COMPLETED'), true);
  });

  it('throws TaskStateTransitionError on invalid transition assert', () => {
    assert.throws(
      () => assertValidTaskTransition('INTAKE', 'COMPLETED'),
      TaskStateTransitionError
    );
  });

  it('does not throw on valid assert transition', () => {
    assert.doesNotThrow(() => assertValidTaskTransition('INTAKE', 'SPECIFYING'));
  });
});
