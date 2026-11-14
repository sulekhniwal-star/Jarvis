export class JarvisBaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    if (typeof (Error as unknown as { captureStackTrace?: (target: unknown, constructor: unknown) => void }).captureStackTrace === 'function') {
      (Error as unknown as { captureStackTrace: (target: unknown, constructor: unknown) => void }).captureStackTrace(this, this.constructor);
    }
  }
}

export class BudgetExceededError extends JarvisBaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'BUDGET_EXCEEDED', 403, details);
  }
}

export class PermissionDeniedError extends JarvisBaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'PERMISSION_DENIED', 403, details);
  }
}

export class TaskStateTransitionError extends JarvisBaseError {
  constructor(fromState: string, toState: string, reason?: string) {
    super(
      `Invalid task state transition from ${fromState} to ${toState}${reason ? `: ${reason}` : ''}`,
      'INVALID_STATE_TRANSITION',
      400
    );
  }
}

export class SecurityViolationError extends JarvisBaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'SECURITY_VIOLATION', 400, details);
  }
}
