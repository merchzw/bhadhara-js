export type PaymentStatus = "pending" | "success" | "failed";

export interface PaymentPayload {
  amount: number;
  phone: string;
  reference: string;
  description?: string;
  currency?: string;
  idempotencyKey?: string;
  notifyUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckStatusPayload {
  providerReference?: string;
  reference?: string;
}

export interface PaymentResponse {
  success: boolean;
  status: PaymentStatus;
  providerReference?: string;
  reference?: string;
  message?: string;
  raw?: unknown;
}

export interface RefundPayload {
  amount: number;
  reference: string;
  providerReference?: string;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  providerReference?: string;
  message?: string;
  raw?: unknown;
}

export interface PaymentProvider {
  payMerchant(payload: PaymentPayload): Promise<PaymentResponse>;
  checkStatus(payload: CheckStatusPayload): Promise<PaymentResponse>;
  refund?(payload: RefundPayload): Promise<RefundResponse>;
}

export interface ProviderHttpOptions {
  timeoutMs?: number;
  retries?: number;
}
