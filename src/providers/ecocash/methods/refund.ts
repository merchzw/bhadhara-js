import type { RefundPayload, RefundResponse } from "../../../core/types.js";
import { isRecord, pickFirstString } from "../../../core/utils.js";
import type { EcoCashClient } from "../client.js";

export async function refund(
  client: EcoCashClient,
  payload: RefundPayload
): Promise<RefundResponse> {
  if (!payload.clientCorrelator) {
    throw new Error("clientCorrelator is required for a refund.");
  }

  if (!payload.originalEcocashReference) {
    throw new Error("originalEcocashReference is required for a refund (obtain via checkStatus first).");
  }

  const response = await client.request({
    method: "POST",
    path: "/transactions/refund/",
    body: {
      clientCorrelator: payload.clientCorrelator,
      originalEcocashReference: payload.originalEcocashReference,
      amount: payload.amount,
      currency: payload.currency ?? "USD",
      merchantCode: client.config.merchantCode,
      merchantPin: client.config.merchantPin
    }
  });

  const record = isRecord(response.data) ? response.data : {};
  const ecocashReference = pickFirstString(record, ["ecocashReference", "transactionId", "id"]);
  const message = pickFirstString(record, ["message", "description", "detail"]);

  return {
    success: record.success !== false,
    ecocashReference,
    message,
    raw: response.data
  };
}
