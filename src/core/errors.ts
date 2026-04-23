export interface BhadharaErrorOptions {
  code: string;
  details?: unknown;
  cause?: unknown;
}

export class BhadharaError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  public constructor(message: string, options: BhadharaErrorOptions) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.details = options.details;

    if (options.cause !== undefined) {
      Object.defineProperty(this, "cause", {
        value: options.cause,
        enumerable: false,
        configurable: true
      });
    }
  }
}

export class AuthenticationError extends BhadharaError {
  public constructor(message = "Authentication failed.", details?: unknown, cause?: unknown) {
    super(message, {
      code: "authentication_error",
      details,
      cause
    });
  }
}

export class NetworkError extends BhadharaError {
  public constructor(message = "Network request failed.", details?: unknown, cause?: unknown) {
    super(message, {
      code: "network_error",
      details,
      cause
    });
  }
}

export class ProviderError extends BhadharaError {
  public constructor(message = "Provider request failed.", details?: unknown, cause?: unknown) {
    super(message, {
      code: "provider_error",
      details,
      cause
    });
  }
}

export class ValidationError extends BhadharaError {
  public constructor(message = "Validation failed.", details?: unknown, cause?: unknown) {
    super(message, {
      code: "validation_error",
      details,
      cause
    });
  }
}

export class ConfigurationError extends BhadharaError {
  public constructor(message = "Configuration is invalid.", details?: unknown, cause?: unknown) {
    super(message, {
      code: "configuration_error",
      details,
      cause
    });
  }
}
