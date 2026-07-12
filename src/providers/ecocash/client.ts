import { ConfigurationError } from "../../core/errors.js";
import { HttpClient, type HttpRequestOptions, type HttpResponse } from "../../core/http.js";
import type { ProviderHttpOptions } from "../../core/types.js";
import { getEnvironmentValue } from "../../core/utils.js";

export interface EcoCashEndpoints {
  payMerchant: string;
  // Template containing `{endUserId}` and `{clientCorrelator}` placeholders, interpolated at request time.
  checkStatus: string;
  refund: string;
}

export interface CreateEcoCashOptions extends ProviderHttpOptions {
  username?: string;
  password?: string;
  merchantCode?: string;
  merchantPin?: string;
  merchantNumber?: string;
  terminalID?: string;
  location?: string;
  superMerchantName?: string;
  merchantName?: string;
  countryCode?: string;
  baseUrl?: string;
  endpoints?: Partial<EcoCashEndpoints>;
  idempotencyHeader?: string;
  defaultHeaders?: Record<string, string>;
}

export interface ResolvedEcoCashConfig extends ProviderHttpOptions {
  username: string;
  password: string;
  merchantCode: string;
  merchantPin: string;
  merchantNumber: string;
  terminalID: string;
  location: string;
  superMerchantName: string;
  merchantName: string;
  countryCode: string;
  baseUrl: string;
  endpoints: EcoCashEndpoints;
  idempotencyHeader: string;
  defaultHeaders: Record<string, string>;
}

// Confirmed against the EcoCash Developer Portal's "SDKs & Codegen" and "API Reference" tabs.
export const ECOCASH_SANDBOX_BASE_URL = "https://developers.ecocash.co.zw/sandbox/payment/v1";

const DEFAULT_ENDPOINTS: EcoCashEndpoints = {
  payMerchant: "/transactions/amount/",
  checkStatus: "/{endUserId}/transactions/amount/{clientCorrelator}",
  refund: "/transactions/refund/"
};

export class EcoCashClient {
  public readonly config: ResolvedEcoCashConfig;
  private readonly http: HttpClient;

  public constructor(config: ResolvedEcoCashConfig) {
    this.config = config;
    this.http = new HttpClient({
      baseUrl: config.baseUrl,
      defaultHeaders: config.defaultHeaders,
      timeoutMs: config.timeoutMs,
      retries: config.retries
    });
  }

  public get headers(): Record<string, string> {
    const token = btoa(`${this.config.username}:${this.config.password}`);
    return {
      Authorization: `Basic ${token}`
    };
  }

  public async request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.http.request<T>({
      ...options,
      headers: {
        ...this.headers,
        ...options.headers
      }
    });
  }
}

export function resolveEcoCashConfig(options: CreateEcoCashOptions = {}): ResolvedEcoCashConfig {
  const username = options.username ?? getEnvironmentValue("ECOCASH_USERNAME");
  const password = options.password ?? getEnvironmentValue("ECOCASH_PASSWORD");
  const merchantCode = options.merchantCode ?? getEnvironmentValue("ECOCASH_MERCHANT");
  const merchantPin = options.merchantPin ?? getEnvironmentValue("ECOCASH_MERCHANT_PIN");
  const merchantNumber = options.merchantNumber ?? getEnvironmentValue("ECOCASH_MERCHANT_NUMBER");
  const terminalID = options.terminalID ?? getEnvironmentValue("ECOCASH_TERMINAL_ID");
  const location = options.location ?? getEnvironmentValue("ECOCASH_LOCATION");
  const superMerchantName = options.superMerchantName ?? getEnvironmentValue("ECOCASH_SUPER_MERCHANT_NAME");
  const merchantName = options.merchantName ?? getEnvironmentValue("ECOCASH_MERCHANT_NAME");
  const countryCode = options.countryCode ?? getEnvironmentValue("ECOCASH_COUNTRY_CODE") ?? "ZW";
  const baseUrl = options.baseUrl ?? getEnvironmentValue("ECOCASH_BASE_URL") ?? ECOCASH_SANDBOX_BASE_URL;

  if (!username) {
    throw new ConfigurationError("EcoCash username is required.", {
      environmentVariable: "ECOCASH_USERNAME"
    });
  }

  if (!password) {
    throw new ConfigurationError("EcoCash password is required.", {
      environmentVariable: "ECOCASH_PASSWORD"
    });
  }

  if (!merchantCode) {
    throw new ConfigurationError("EcoCash merchantCode is required.", {
      environmentVariable: "ECOCASH_MERCHANT"
    });
  }

  if (!merchantPin) {
    throw new ConfigurationError("EcoCash merchantPin is required.", {
      environmentVariable: "ECOCASH_MERCHANT_PIN"
    });
  }

  if (!merchantNumber) {
    throw new ConfigurationError("EcoCash merchantNumber is required.", {
      environmentVariable: "ECOCASH_MERCHANT_NUMBER"
    });
  }

  if (!terminalID) {
    throw new ConfigurationError("EcoCash terminalID is required.", {
      environmentVariable: "ECOCASH_TERMINAL_ID"
    });
  }

  if (!location) {
    throw new ConfigurationError("EcoCash location is required.", {
      environmentVariable: "ECOCASH_LOCATION"
    });
  }

  if (!superMerchantName) {
    throw new ConfigurationError("EcoCash superMerchantName is required.", {
      environmentVariable: "ECOCASH_SUPER_MERCHANT_NAME"
    });
  }

  if (!merchantName) {
    throw new ConfigurationError("EcoCash merchantName is required.", {
      environmentVariable: "ECOCASH_MERCHANT_NAME"
    });
  }

  return {
    username,
    password,
    merchantCode,
    merchantPin,
    merchantNumber,
    terminalID,
    location,
    superMerchantName,
    merchantName,
    countryCode,
    baseUrl,
    timeoutMs: options.timeoutMs ?? 10_000,
    retries: options.retries ?? 1,
    endpoints: {
      ...DEFAULT_ENDPOINTS,
      ...options.endpoints
    },
    idempotencyHeader: options.idempotencyHeader ?? "X-Idempotency-Key",
    defaultHeaders: {
      Accept: "application/json",
      ...options.defaultHeaders
    }
  };
}
