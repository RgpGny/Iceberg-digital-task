/**
 * Domain-level error signaling a rule violation (illegal stage transition,
 * invalid commission inputs, etc.). Mapped to HTTP 400 by the global filter.
 */
export class BusinessError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.details = details;
  }
}
