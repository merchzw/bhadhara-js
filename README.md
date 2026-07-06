# Bhadhara

Bhadhara is a TypeScript Node.js SDK for integrating Zimbabwean payment providers behind a single, consistent API.

## Phase 1

Phase 1 ships the EcoCash provider with:

- `payMerchant`
- `checkStatus`
- `refund`
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
  username: process.env.ECOCASH_USERNAME,
  password: process.env.ECOCASH_PASSWORD,
  merchantCode: process.env.ECOCASH_MERCHANT,
  merchantPin: process.env.ECOCASH_MERCHANT_PIN,
  baseUrl: process.env.ECOCASH_BASE_URL
});

const payment = await ecocash.payMerchant({
  amount: 10,
  phone: "0771234567",
  reference: "order-123",
  description: "T-shirt order",
  notifyUrl: "https://example.com/notify"
});

if (payment.status === "pending") {
  const latest = await ecocash.checkStatus({
    providerReference: payment.providerReference,
    reference: payment.reference
  });

  console.log(latest.status);

  // Refund flow (requires ecocashReference from lookup/checkStatus)
  if (latest.status === "success" && latest.ecocashReference) {
    const refund = await ecocash.refund({
      clientCorrelator: "refund-order-123-1", // new correlator for refund operation
      originalEcocashReference: latest.ecocashReference,
      amount: 5, // optional: partial refund
      currency: "USD" // optional: defaults to USD
    });

    console.log(refund.success, refund.ecocashReference);
  }
}
```

## EcoCash configuration

`createEcoCash` accepts:

| Option | Required | Description |
| --- | --- | --- |
| `username` | Yes* | API username. Falls back to `ECOCASH_USERNAME`. |
| `password` | Yes* | API password. Falls back to `ECOCASH_PASSWORD`. |
| `merchantCode` | Yes* | Merchant identifier. Falls back to `ECOCASH_MERCHANT`. |
| `merchantPin` | Yes* | Merchant PIN. Falls back to `ECOCASH_MERCHANT_PIN`. |
| `baseUrl` | Yes* | Provider base URL. Falls back to `ECOCASH_BASE_URL`. |
| `timeoutMs` | No | Request timeout in milliseconds. |
| `retries` | No | Retry count for timeout and transient server failures. |
| `endpoints` | No | Override default `payMerchant`, `checkStatus`, and `refund` paths. |
| `idempotencyHeader` | No | Header name used for idempotency protection. |
| `defaultHeaders` | No | Additional headers sent with every request. |

\* Required either directly or through environment variables.

## Environment variables

| Variable | Description |
| --- | --- |
| `ECOCASH_USERNAME` | API username |
| `ECOCASH_PASSWORD` | API password |
| `ECOCASH_MERCHANT` | Merchant code |
| `ECOCASH_MERCHANT_PIN` | Merchant PIN |
| `ECOCASH_BASE_URL` | Provider base URL |

> Note: `ECOCASH_API_KEY` is deprecated/removed and should not be used.

## Refund behavior (EcoCash)

Refunds are sent to `POST /transactions/refund/` and require:

- `clientCorrelator` (new correlator for the refund request)
- `originalEcocashReference` (from prior transaction lookup / `checkStatus` response)

Optional:

- `amount` (partial refund; must be ≤ original amount)
- `currency` (defaults to `"USD"`)

Practical flow:

1. Initiate payment (`payMerchant`)
2. Lookup transaction (`checkStatus`)
3. Read `ecocashReference` from lookup response
4. Submit `refund` using `originalEcocashReference = ecocashReference`

## Error handling

Bhadhara normalizes provider failures into typed SDK errors (for example authentication vs provider/business-rule failures).

For refunds, a request against a non-eligible transaction (e.g. non-`SUCCESS`) may be rejected by EcoCash with a provider/business error. You should surface provider code/message to callers for handling and retry decisions.

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

## Documentation

- `docs/getting-started.md`
- `docs/providers/ecocash.md`
- `examples/ecocash-basic.ts`
