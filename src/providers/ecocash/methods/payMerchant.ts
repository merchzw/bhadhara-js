import type { PaymentPayload, PaymentResponse } from "../../../core/types.js";
import {
  assertPaymentPayload,
  createIdempotencyKey,
  isRecord,
  normalizePaymentStatus,
  normalizeZimbabwePhoneNumber,
  pickFirstString
} from "../../../core/utils.js";
import type { EcoCashClient } from "../client.js";

export async function payMerchant(
  client: EcoCashClient,
  payload: PaymentPayload
): Promise<PaymentResponse> {
  assertPaymentPayload(payload);

  const normalizedPhone = normalizeZimbabwePhoneNumber(payload.phone);
  const idempotencyKey =
    payload.idempotencyKey ??
    createIdempotencyKey({
      provider: "ecocash",
      reference: payload.reference,
      amount: payload.amount,
      phone: normalizedPhone
    });

  const response = await client.request({
    method: "POST",
    path: client.config.endpoints.payMerchant,
    headers: {
      [client.config.idempotencyHeader]: idempotencyKey
    },
    body: {
      clientCorrelator: idempotencyKey,
      endUserId: normalizedPhone,
      amount: payload.amount,
      currency: payload.currency ?? "USD",
      description: payload.description,
      notifyUrl: payload.notifyUrl,
      referenceCode: payload.reference,
      merchantCode: client.config.merchantCode,
      merchantPin: client.config.merchantPin
    }
  });

  const record = isRecord(response.data) ? response.data : {};
  const status = normalizePaymentStatus(
    record.status ?? record.transactionStatus ?? record.result ?? (record.success === false ? "failed" : "pending")
  );
  const providerReference = pickFirstString(record, ["providerReference", "transactionId", "id", "reference"]);
  const message = pickFirstString(record, ["message", "description", "detail"]);

  return {
    success: status !== "failed",
    status,
    providerReference,
    reference: payload.reference,
    message,
    raw: response.data
  };
}
