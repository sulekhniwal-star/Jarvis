export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly entity: string,
    public readonly fromState: string,
    public readonly toState: string,
    message?: string
  ) {
    super(
      message ??
        `Invalid ${entity} state transition: cannot transition from '${fromState}' to '${toState}'.`
    );
    this.name = "InvalidStateTransitionError";
  }
}

export type StateTransitionMap<T extends string> = Record<T, readonly T[]>;
