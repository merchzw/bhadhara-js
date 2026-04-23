# Bhadhara

Bhadhara is a TypeScript Node.js SDK for integrating Zimbabwean payment providers behind a single, consistent API.

## Phase 1

Phase 1 ships the EcoCash provider with:

- `payMerchant`
- `checkStatus`
- normalized errors
- request retries
- idempotency key support

## Installation

```bash
npm install bhadhara
```

## Quick start

```ts
import { createEcoCash } from "bhadhara/ecocash";

const ecocash = createEcoCash({
  apiKey: process.env.ECOCASH_API_KEY,
  merchantCode: process.env.ECOCASH_MERCHANT,
  baseUrl: process.env.ECOCASH_BASE_URL
});

const payment = await ecocash.payMerchant({
  amount: 10,
  phone: "0771234567",
  reference: "order-123",
  description: "T-shirt order"
});

if (payment.status === "pending") {
  const latest = await ecocash.checkStatus({
    providerReference: payment.providerReference,
    reference: payment.reference
  });

  console.log(latest.status);
}
```

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

## Architecture

```text
Application
    |
Bhadhara SDK
    |
Provider Module
    |
External Payment API
```

The core layer lives in `src/core`, while each provider is isolated in `src/providers`.

## Important note about endpoints

The default EcoCash endpoint paths are placeholders intended to keep the provider implementation modular. Override them with the actual provider paths for your integration if they differ from the defaults.

## Documentation

- `docs/getting-started.md`
- `docs/providers/ecocash.md`
- `examples/ecocash-basic.ts`
