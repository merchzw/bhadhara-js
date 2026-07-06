import type {
  CheckStatusPayload,
  PaymentPayload,
  PaymentProvider,
  PaymentResponse,
  RefundPayload,
  RefundResponse
} from "../../core/types.js";
import { checkStatus } from "./methods/checkStatus.js";
import { payMerchant } from "./methods/payMerchant.js";
import { refund } from "./methods/refund.js";
import {
  EcoCashClient,
  type CreateEcoCashOptions,
  type EcoCashEndpoints,
  type ResolvedEcoCashConfig,
  resolveEcoCashConfig
} from "./client.js";

export type { CreateEcoCashOptions, EcoCashEndpoints, ResolvedEcoCashConfig } from "./client.js";

export interface EcoCashProvider extends PaymentProvider {
  readonly provider: "ecocash";
  readonly config: ResolvedEcoCashConfig;
  payMerchant(payload: PaymentPayload): Promise<PaymentResponse>;
  checkStatus(payload: CheckStatusPayload): Promise<PaymentResponse>;
  refund(payload: RefundPayload): Promise<RefundResponse>;
}

export function createEcoCash(options: CreateEcoCashOptions = {}): EcoCashProvider {
  const config = resolveEcoCashConfig(options);
  const client = new EcoCashClient(config);

  return Object.freeze({
    provider: "ecocash" as const,
    config,
    payMerchant(payload: PaymentPayload) {
      return payMerchant(client, payload);
    },
    checkStatus(payload: CheckStatusPayload) {
      return checkStatus(client, payload);
    },
    refund(payload: RefundPayload) {
      return refund(client, payload);
    }
  });
}
