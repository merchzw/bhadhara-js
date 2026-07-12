export type PaymentStatus = "pending" | "success" | "failed";

export interface PaymentPayload {
  amount: number;
  phone: string;
  reference: string;
  description?: string;
  currency?: string;
  idempotencyKey?: string;
  notifyUrl?: string;
  channel?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckStatusPayload {
  phone: string;
  clientCorrelator: string;
}

export interface PaymentResponse {
  success: boolean;
  status: PaymentStatus;
  providerReference?: string;
  clientCorrelator?: string;
  reference?: string;
  ecocashReference?: string;
  message?: string;
  raw?: unknown;
}

export interface RefundPayload {
  clientCorrelator: string;
  originalEcocashReference: string;
  phone: string;
  amount?: number;
  currency?: string;
  reference?: string;
  description?: string;
  channel?: string;
}

export interface RefundResponse {
  success: boolean;
  ecocashReference?: string;
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
