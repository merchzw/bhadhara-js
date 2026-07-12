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
  const clientCorrelator =
    payload.idempotencyKey ??
    createIdempotencyKey({
      provider: "ecocash",
      reference: payload.reference,
      amount: payload.amount,
      phone: normalizedPhone
    });
  const currency = payload.currency ?? "USD";
  const description = payload.description ?? payload.reference;

  const response = await client.request({
    method: "POST",
    path: client.config.endpoints.payMerchant,
    headers: {
      [client.config.idempotencyHeader]: clientCorrelator
    },
    body: {
      clientCorrelator,
      notifyUrl: payload.notifyUrl ?? "",
      referenceCode: payload.reference,
      tranType: "MER",
      endUserId: normalizedPhone,
      remarks: description,
      transactionOperationStatus: "Charged",
      paymentAmount: {
        charginginformation: {
          amount: payload.amount,
          currency,
          description
        },
        chargeMetaData: {
          channel: payload.channel ?? "WEB"
        }
      },
      merchantCode: client.config.merchantCode,
      merchantPin: client.config.merchantPin,
      merchantNumber: client.config.merchantNumber,
      countryCode: client.config.countryCode,
      terminalID: client.config.terminalID,
      location: client.config.location,
      superMerchantName: client.config.superMerchantName,
      merchantName: client.config.merchantName
    }
  });

  const record = isRecord(response.data) ? response.data : {};
  const status = normalizePaymentStatus(
    record.status ?? record.transactionStatus ?? record.result ?? (record.success === false ? "failed" : "pending")
  );
  const providerReference = pickFirstString(record, ["transactionId", "providerReference", "id"]);
  const message = pickFirstString(record, ["statusMessage", "message", "description", "detail"]);

  return {
    success: status !== "failed",
    status,
    providerReference,
    clientCorrelator,
    reference: payload.reference,
    ecocashReference: providerReference,
    message,
    raw: response.data
  };
}
