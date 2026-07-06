import type { CheckStatusPayload, PaymentResponse } from "../../../core/types.js";
import {
  assertCheckStatusPayload,
  isRecord,
  normalizePaymentStatus,
  pickFirstString
} from "../../../core/utils.js";
import type { EcoCashClient } from "../client.js";

export async function checkStatus(
  client: EcoCashClient,
  payload: CheckStatusPayload
): Promise<PaymentResponse> {
  assertCheckStatusPayload(payload);

  const response = await client.request({
    method: "GET",
    path: client.config.endpoints.checkStatus,
    query: {
      reference: payload.reference,
      providerReference: payload.providerReference
    }
  });

  const record = isRecord(response.data) ? response.data : {};
  const status = normalizePaymentStatus(
    record.status ?? record.transactionStatus ?? record.result ?? (record.success === false ? "failed" : "pending")
  );
  const providerReference =
    payload.providerReference ??
    pickFirstString(record, ["providerReference", "transactionId", "id", "reference"]);
  const reference = payload.reference ?? pickFirstString(record, ["reference", "merchantReference"]);
  const ecocashReference = pickFirstString(record, ["ecocashReference", "providerReference", "transactionId", "id"]);
  const message = pickFirstString(record, ["message", "description", "detail"]);

  return {
    success: status !== "failed",
    status,
    providerReference,
    reference,
    ecocashReference,
    message,
    raw: response.data
  };
}
