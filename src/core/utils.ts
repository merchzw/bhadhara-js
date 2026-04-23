import { ValidationError } from "./errors.js";
import type {
  CheckStatusPayload,
  PaymentPayload,
  PaymentStatus
} from "./types.js";

export function assertPaymentPayload(payload: PaymentPayload): void {
  if (!isRecord(payload)) {
    throw new ValidationError("Payment payload must be an object.", {
      payload
    });
  }

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new ValidationError("Payment amount must be a positive number.", {
      amount: payload.amount
    });
  }

  if (typeof payload.reference !== "string" || payload.reference.trim().length === 0) {
    throw new ValidationError("Payment reference is required.");
  }

  if (typeof payload.phone !== "string" || payload.phone.trim().length === 0) {
    throw new ValidationError("Payment phone number is required.");
  }
}

export function assertCheckStatusPayload(payload: CheckStatusPayload): void {
  if (!isRecord(payload)) {
    throw new ValidationError("Status payload must be an object.", {
      payload
    });
  }

  if (!payload.reference && !payload.providerReference) {
    throw new ValidationError("A reference or provider reference is required.");
  }
}

export function normalizeZimbabwePhoneNumber(phone: string): string {
  if (typeof phone !== "string" || phone.trim().length === 0) {
    throw new ValidationError("Phone number must be provided as a non-empty string.", {
      phone
    });
  }

  const digits = phone.replace(/\D+/g, "");

  if (digits.startsWith("263") && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `263${digits.slice(1)}`;
  }

  if (digits.startsWith("7") && digits.length === 9) {
    return `263${digits}`;
  }

  throw new ValidationError("Phone number must be a valid Zimbabwean mobile number.", {
    phone
  });
}

export function createIdempotencyKey(input: {
  provider: string;
  reference: string;
  amount?: number;
  phone?: string;
}): string {
  const parts = [
    input.provider.trim().toLowerCase(),
    input.reference.trim(),
    input.amount === undefined ? "" : String(input.amount),
    input.phone === undefined ? "" : input.phone.replace(/\D+/g, "")
  ];

  return parts.join(":");
}

export function normalizePaymentStatus(value: unknown): PaymentStatus {
  const normalized = String(value ?? "pending").trim().toLowerCase();

  if (["success", "successful", "completed", "paid", "approved"].includes(normalized)) {
    return "success";
  }

  if (["failed", "failure", "declined", "rejected", "cancelled", "canceled"].includes(normalized)) {
    return "failed";
  }

  return "pending";
}

export function getEnvironmentValue(key: string): string | undefined {
  const processObject = globalThis as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };

  return processObject.process?.env?.[key];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function pickFirstString(
  source: Record<string, unknown>,
  keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}
