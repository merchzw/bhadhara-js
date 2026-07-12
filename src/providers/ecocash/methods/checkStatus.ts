import type { CheckStatusPayload, PaymentResponse } from "../../../core/types.js";
import {
  assertCheckStatusPayload,
  isRecord,
  normalizePaymentStatus,
  normalizeZimbabwePhoneNumber,
  pickFirstString
} from "../../../core/utils.js";
import type { EcoCashClient } from "../client.js";

export async function checkStatus(
  client: EcoCashClient,
  payload: CheckStatusPayload
): Promise<PaymentResponse> {
  assertCheckStatusPayload(payload);

  const normalizedPhone = normalizeZimbabwePhoneNumber(payload.phone);
  const path = client.config.endpoints.checkStatus
    .replace("{endUserId}", encodeURIComponent(normalizedPhone))
    .replace("{clientCorrelator}", encodeURIComponent(payload.clientCorrelator));

  const response = await client.request({
    method: "GET",
    path
  });

  const record = isRecord(response.data) ? response.data : {};
  const status = normalizePaymentStatus(
    record.status ?? record.transactionStatus ?? record.result ?? (record.success === false ? "failed" : "pending")
  );
  const providerReference = pickFirstString(record, ["transactionId", "providerReference", "id"]);
  const reference = pickFirstString(record, ["referenceCode", "reference", "merchantReference"]);
  const message = pickFirstString(record, ["statusMessage", "message", "description", "detail"]);

  return {
    success: status !== "failed",
    status,
    providerReference,
    clientCorrelator: payload.clientCorrelator,
    reference,
    ecocashReference: providerReference,
    message,
    raw: response.data
  };
}
