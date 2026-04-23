import { ConfigurationError } from "../../core/errors.js";
import { HttpClient, type HttpRequestOptions, type HttpResponse } from "../../core/http.js";
import type { ProviderHttpOptions } from "../../core/types.js";
import { getEnvironmentValue } from "../../core/utils.js";

export interface EcoCashEndpoints {
  payMerchant: string;
  checkStatus: string;
}

export interface CreateEcoCashOptions extends ProviderHttpOptions {
  apiKey?: string;
  merchantCode?: string;
  baseUrl?: string;
  endpoints?: Partial<EcoCashEndpoints>;
  idempotencyHeader?: string;
  defaultHeaders?: Record<string, string>;
}

export interface ResolvedEcoCashConfig extends ProviderHttpOptions {
  apiKey: string;
  merchantCode: string;
  baseUrl: string;
  endpoints: EcoCashEndpoints;
  idempotencyHeader: string;
  defaultHeaders: Record<string, string>;
}

const DEFAULT_ENDPOINTS: EcoCashEndpoints = {
  payMerchant: "/payments/merchant",
  checkStatus: "/payments/status"
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
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "X-Merchant-Code": this.config.merchantCode
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
  const apiKey = options.apiKey ?? getEnvironmentValue("ECOCASH_API_KEY");
  const merchantCode = options.merchantCode ?? getEnvironmentValue("ECOCASH_MERCHANT");
  const baseUrl = options.baseUrl ?? getEnvironmentValue("ECOCASH_BASE_URL");

  if (!apiKey) {
    throw new ConfigurationError("EcoCash apiKey is required.", {
      environmentVariable: "ECOCASH_API_KEY"
    });
  }

  if (!merchantCode) {
    throw new ConfigurationError("EcoCash merchantCode is required.", {
      environmentVariable: "ECOCASH_MERCHANT"
    });
  }

  if (!baseUrl) {
    throw new ConfigurationError("EcoCash baseUrl is required.", {
      environmentVariable: "ECOCASH_BASE_URL"
    });
  }

  return {
    apiKey,
    merchantCode,
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
