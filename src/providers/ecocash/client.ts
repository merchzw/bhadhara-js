import { ConfigurationError } from "../../core/errors.js";
import { HttpClient, type HttpRequestOptions, type HttpResponse } from "../../core/http.js";
import type { ProviderHttpOptions } from "../../core/types.js";
import { getEnvironmentValue } from "../../core/utils.js";

export interface EcoCashEndpoints {
  payMerchant: string;
  checkStatus: string;
}

export interface CreateEcoCashOptions extends ProviderHttpOptions {
  username?: string;
  password?: string;
  merchantCode?: string;
  merchantPin?: string;
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
  baseUrl: string;
  endpoints: EcoCashEndpoints;
  idempotencyHeader: string;
  defaultHeaders: Record<string, string>;
}

const DEFAULT_ENDPOINTS: EcoCashEndpoints = {
  payMerchant: "/sandbox/payment/v1/transactions/amount/",
  checkStatus: "/sandbox/payment/v1/transactions/"
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
  const baseUrl = options.baseUrl ?? getEnvironmentValue("ECOCASH_BASE_URL");

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

  if (!baseUrl) {
    throw new ConfigurationError("EcoCash baseUrl is required.", {
      environmentVariable: "ECOCASH_BASE_URL"
    });
  }

  return {
    username,
    password,
    merchantCode,
    merchantPin,
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
