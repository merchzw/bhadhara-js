# Bhadhara payment integration handoff

This document summarizes the current EcoCash/payment integration code in `merchzw/bhadhara-js` so another AI can review it quickly.

## 1) Files that make HTTP requests to the payment/EcoCash API

### `src/providers/ecocash/client.ts`
```typescript name=src/providers/ecocash/client.ts url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/src/providers/ecocash/client.ts#L34-L64
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
```

### `src/providers/ecocash/methods/payMerchant.ts`
```typescript name=src/providers/ecocash/methods/payMerchant.ts url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/src/providers/ecocash/methods/payMerchant.ts#L1-L60
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
      amount: payload.amount,
      phone: normalizedPhone,
      reference: payload.reference,
      description: payload.description,
      currency: payload.currency,
      merchantCode: client.config.merchantCode,
      metadata: payload.metadata
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
```

### `src/providers/ecocash/methods/checkStatus.ts`
```typescript name=src/providers/ecocash/methods/checkStatus.ts url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/src/providers/ecocash/methods/checkStatus.ts#L1-L43
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
  const message = pickFirstString(record, ["message", "description", "detail"]);

  return {
    success: status !== "failed",
    status,
    providerReference,
    reference,
    message,
    raw: response.data
  };
}
```

## 2) Config/env files where API credentials, base URLs, or merchant codes are stored

### `src/providers/ecocash/client.ts`
```typescript name=src/providers/ecocash/client.ts url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/src/providers/ecocash/client.ts#L6-L27
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
```

```typescript name=src/providers/ecocash/client.ts url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/src/providers/ecocash/client.ts#L66-L105
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
```

### `README.md`
```markdown name=README.md url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/README.md#L49-L65
## EcoCash configuration

`createEcoCash` accepts:

| Option | Required | Description |
| --- | --- | --- |
| `apiKey` | Yes* | Provider API key. Falls back to `ECOCASH_API_KEY`. |
| `merchantCode` | Yes* | Merchant identifier. Falls back to `ECOCASH_MERCHANT`. |
| `baseUrl` | Yes* | Provider base URL. Falls back to `ECOCASH_BASE_URL`. |
| `timeoutMs` | No | Request timeout in milliseconds. |
| `retries` | No | Retry count for timeout and transient server failures. |
| `endpoints` | No | Override placeholder `payMerchant` and `checkStatus` paths. |
| `idempotencyHeader` | No | Header name used for idempotency protection. |
| `defaultHeaders` | No | Additional headers sent with every request. |

\* Required either directly or through environment variables.
```

### `docs/getting-started.md`
```markdown name=docs/getting-started.md url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/docs/getting-started.md#L9-L21
## Configure EcoCash

```ts
import { createEcoCash } from "bhadhara/ecocash";

const ecocash = createEcoCash({
  apiKey: process.env.ECOCASH_API_KEY,
  merchantCode: process.env.ECOCASH_MERCHANT,
  baseUrl: process.env.ECOCASH_BASE_URL
});
```

You can also rely on environment variables for the same values and only pass overrides such as `timeoutMs`, `retries`, or custom endpoint paths.
```

### `docs/providers/ecocash.md`
```markdown name=docs/providers/ecocash.md url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/docs/providers/ecocash.md#L8-L22
## Factory

```ts
import { createEcoCash } from "bhadhara/ecocash";

const ecocash = createEcoCash({
  apiKey: process.env.ECOCASH_API_KEY,
  merchantCode: process.env.ECOCASH_MERCHANT,
  baseUrl: process.env.ECOCASH_BASE_URL,
  endpoints: {
    payMerchant: "/payments/merchant",
    checkStatus: "/payments/status"
  }
});
```
```

## 3) Functions/modules that build or send payment requests

### `src/providers/ecocash/index.ts`
```typescript name=src/providers/ecocash/index.ts url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/src/providers/ecocash/index.ts#L14-L35
export interface EcoCashProvider extends PaymentProvider {
  readonly provider: "ecocash";
  readonly config: ResolvedEcoCashConfig;
  payMerchant(payload: PaymentPayload): Promise<PaymentResponse>;
  checkStatus(payload: CheckStatusPayload): Promise<PaymentResponse>;
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
    }
  });
}
```

### `src/providers/ecocash/methods/payMerchant.ts`
```typescript name=src/providers/ecocash/methods/payMerchant.ts url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/src/providers/ecocash/methods/payMerchant.ts#L1-L60
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
      amount: payload.amount,
      phone: normalizedPhone,
      reference: payload.reference,
      description: payload.description,
      currency: payload.currency,
      merchantCode: client.config.merchantCode,
      metadata: payload.metadata
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
```

### `src/providers/ecocash/methods/checkStatus.ts`
```typescript name=src/providers/ecocash/methods/checkStatus.ts url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/src/providers/ecocash/methods/checkStatus.ts#L1-L43
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
  const message = pickFirstString(record, ["message", "description", "detail"]);

  return {
    success: status !== "failed",
    status,
    providerReference,
    reference,
    message,
    raw: response.data
  };
}
```

## 4) Existing types/interfaces/models representing payment request or response

### `src/core/types.ts`
```typescript name=src/core/types.ts url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/src/core/types.ts#L1-L50
export type PaymentStatus = "pending" | "success" | "failed";

export interface PaymentPayload {
  amount: number;
  phone: string;
  reference: string;
  description?: string;
  currency?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckStatusPayload {
  providerReference?: string;
  reference?: string;
}

export interface PaymentResponse {
  success: boolean;
  status: PaymentStatus;
  providerReference?: string;
  reference?: string;
  message?: string;
  raw?: unknown;
}

export interface RefundPayload {
  amount: number;
  reference: string;
  providerReference?: string;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  providerReference?: string;
  message?: string;
  raw?: unknown;
}

export interface PaymentProvider {
  payMerchant(payload: PaymentPayload): Promise<PaymentResponse>;
  checkStatus(payload: CheckStatusPayload): Promise<PaymentResponse>;
  refund?(payload: RefundPayload): Promise<RefundResponse>;
}

export interface ProviderHttpOptions {
  timeoutMs?: number;
  retries?: number;
}
```

## 5) HTTP client library / package info

### `package.json`
```json name=package.json url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/package.json
{
  "name": "bhadhara",
  "version": "0.1.0",
  "description": "TypeScript SDK for Zimbabwean payment providers.",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./ecocash": {
      "types": "./dist/providers/ecocash/index.d.ts",
      "default": "./dist/providers/ecocash/index.js"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "docs"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "clean": "node -e \"const fs=require('fs'); fs.rmSync('dist',{recursive:true,force:true});\"",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint": "npm run typecheck",
    "test": "npm run typecheck"
  },
  "keywords": [
    "payments",
    "sdk",
    "typescript",
    "zimbabwe",
    "ecocash"
  ],
  "engines": {
    "node": ">=18"
  },
  "license": "MIT",
  "devDependencies": {
    "typescript": "^5.8.3"
  }
}
```

### HTTP client implementation used by the payment flow
The SDK uses its own `HttpClient` wrapper in `src/core/http.ts`, which internally calls the built-in `fetch` API. There is no `axios`, `requests`, or `RestTemplate` dependency in the current `package.json`.

```typescript name=src/core/http.ts url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/src/core/http.ts#L1-L99
import { AuthenticationError, NetworkError, ProviderError } from "./errors.js";

export interface HttpRequestOptions {
  method?: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string | undefined>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
}

export interface HttpClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
}

export interface HttpResponse<T> {
  status: number;
  headers: Headers;
  data: T;
}

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly retries: number;

  public constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.defaultHeaders = config.defaultHeaders ?? {};
    this.timeoutMs = config.timeoutMs ?? 10_000;
    this.retries = config.retries ?? 1;
  }

  public async request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
    const totalAttempts = Math.max(0, options.retries ?? this.retries) + 1;
    const method = options.method ?? "POST";

    for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);

      try {
        const response = await fetch(buildUrl(this.baseUrl, options.path, options.query), {
          method,
          headers: buildHeaders(this.defaultHeaders, options.headers, options.body),
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: controller.signal
        });

        const data = (await parseResponseBody(response)) as T;

        if (response.ok) {
          return {
            status: response.status,
            headers: response.headers,
            data
          };
        }

        if (attempt < totalAttempts && RETRYABLE_STATUS_CODES.has(response.status)) {
          continue;
        }

        if (response.status === 401 || response.status === 403) {
          throw new AuthenticationError("Provider authentication failed.", {
            status: response.status,
            data
          });
        }

        throw new ProviderError(`Provider request failed with status ${response.status}.`, {
          status: response.status,
          data
        });
      } catch (error) {
        if (error instanceof AuthenticationError || error instanceof ProviderError) {
          throw error;
        }

        if (attempt < totalAttempts && isRetryableError(error)) {
          continue;
        }

        throw new NetworkError("Unable to reach the provider API.", undefined, error);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new NetworkError("Request failed after exhausting retries.");
  }
}
```

## 6) Other relevant supporting code

### `src/core/utils.ts`
```typescript name=src/core/utils.ts url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/src/core/utils.ts#L8-L125
export function assertPaymentPayload(payload: PaymentPayload): void {
  if (!isRecord(payload)) {
    throw new ValidationError("Payment payload must be an object.", {
      payload
    });
  }

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new ValidationError("Payment amount must be a positive number.", {
      amount: payload.amount
    });
  }

  if (typeof payload.reference !== "string" || payload.reference.trim().length === 0) {
    throw new ValidationError("Payment reference is required.");
  }

  if (typeof payload.phone !== "string" || payload.phone.trim().length === 0) {
    throw new ValidationError("Payment phone number is required.");
  }
}

export function assertCheckStatusPayload(payload: CheckStatusPayload): void {
  if (!isRecord(payload)) {
    throw new ValidationError("Status payload must be an object.", {
      payload
    });
  }

  if (!payload.reference && !payload.providerReference) {
    throw new ValidationError("A reference or provider reference is required.");
  }
}

export function normalizeZimbabwePhoneNumber(phone: string): string {
  if (typeof phone !== "string" || phone.trim().length === 0) {
    throw new ValidationError("Phone number must be provided as a non-empty string.", {
      phone
    });
  }

  const digits = phone.replace(/\D+/g, "");

  if (digits.startsWith("263") && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `263${digits.slice(1)}`;
  }

  if (digits.startsWith("7") && digits.length === 9) {
    return `263${digits}`;
  }

  throw new ValidationError("Phone number must be a valid Zimbabwean mobile number.", {
    phone
  });
}
```

### `README.md` summary of supported operations
```markdown name=README.md url=https://github.com/merchzw/bhadhara-js/blob/a6a4bf1f0305d66e3f721d47c9bd677942201958/README.md#L5-L13
## Phase 1

Phase 1 ships the EcoCash provider with:

- `payMerchant`
- `checkStatus`
- normalized errors
- request retries
- idempotency key support
```
