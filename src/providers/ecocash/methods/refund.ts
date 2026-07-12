import type { RefundPayload, RefundResponse } from "../../../core/types.js";
import {
  assertRefundPayload,
  isRecord,
  normalizePaymentStatus,
  normalizeZimbabwePhoneNumber,
  pickFirstString
} from "../../../core/utils.js";
import type { EcoCashClient } from "../client.js";

export async function refund(
  client: EcoCashClient,
  payload: RefundPayload
): Promise<RefundResponse> {
  assertRefundPayload(payload);

  const normalizedPhone = normalizeZimbabwePhoneNumber(payload.phone);
  const currency = payload.currency ?? "USD";
  const description = payload.description ?? "Refund";
  const referenceCode = payload.reference ?? payload.clientCorrelator;

  const response = await client.request({
    method: "POST",
    path: client.config.endpoints.refund,
    body: {
      clientCorrelator: payload.clientCorrelator,
      referenceCode,
      tranType: "REF",
      endUserId: normalizedPhone,
      originalEcocashReference: payload.originalEcocashReference,
      remarks: description,
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
      merchantName: client.config.merchantName,
      currencyCode: currency
    }
  });

  const record = isRecord(response.data) ? response.data : {};
  const status = normalizePaymentStatus(
    record.status ?? record.transactionStatus ?? (record.success === false ? "failed" : undefined)
  );
  const ecocashReference = pickFirstString(record, ["transactionId", "ecocashReference", "id"]);
  const message = pickFirstString(record, ["statusMessage", "message", "description", "detail"]);

  return {
    success: status !== "failed",
    ecocashReference,
    message,
    raw: response.data
  };
}
