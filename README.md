# Gauro

Gauro is a TypeScript Node.js SDK for integrating Zimbabwean payment providers behind a single, consistent API.

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
npm install gauro
```

## Quick start

```ts
import { createEcoCash } from "gauro/ecocash";

const ecocash = createEcoCash({
  username: process.env.ECOCASH_USERNAME,
  password: process.env.ECOCASH_PASSWORD,
  merchantCode: process.env.ECOCASH_MERCHANT,
  merchantPin: process.env.ECOCASH_MERCHANT_PIN,
  merchantNumber: process.env.ECOCASH_MERCHANT_NUMBER,
  terminalID: process.env.ECOCASH_TERMINAL_ID,
  location: process.env.ECOCASH_LOCATION,
  superMerchantName: process.env.ECOCASH_SUPER_MERCHANT_NAME,
  merchantName: process.env.ECOCASH_MERCHANT_NAME
  // baseUrl defaults to the EcoCash sandbox; pass your production baseUrl once you have it.
});

const payment = await ecocash.payMerchant({
  amount: 10,
  phone: "0771234567",
  reference: "order-123",
  description: "T-shirt order",
  notifyUrl: "https://example.com/notify"
});

if (payment.status === "pending" && payment.clientCorrelator) {
  const latest = await ecocash.checkStatus({
    phone: "0771234567",
    clientCorrelator: payment.clientCorrelator
  });

  console.log(latest.status);

  // Refund flow (requires ecocashReference from lookup/checkStatus)
  if (latest.status === "success" && latest.ecocashReference) {
    const refund = await ecocash.refund({
      clientCorrelator: "refund-order-123-1", // new correlator for the refund request
      originalEcocashReference: latest.ecocashReference,
      phone: "0771234567",
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
| `merchantCode` | Yes* | EcoCash-assigned merchant identifier. Falls back to `ECOCASH_MERCHANT`. |
| `merchantPin` | Yes* | Merchant security PIN. Falls back to `ECOCASH_MERCHANT_PIN`. |
| `merchantNumber` | Yes* | Merchant's registered EcoCash MSISDN. Falls back to `ECOCASH_MERCHANT_NUMBER`. |
| `terminalID` | Yes* | POS terminal identifier assigned by EcoCash. Falls back to `ECOCASH_TERMINAL_ID`. |
| `location` | Yes* | Merchant location (e.g. `"Harare"`). Falls back to `ECOCASH_LOCATION`. |
| `superMerchantName` | Yes* | Super-merchant name assigned by EcoCash. Falls back to `ECOCASH_SUPER_MERCHANT_NAME`. |
| `merchantName` | Yes* | Merchant's display name. Falls back to `ECOCASH_MERCHANT_NAME`. |
| `countryCode` | No | ISO country code sent with every request. Defaults to `"ZW"`. Falls back to `ECOCASH_COUNTRY_CODE`. |
| `baseUrl` | No | Provider base URL. Defaults to the EcoCash sandbox (`https://developers.ecocash.co.zw/sandbox/payment/v1`). Falls back to `ECOCASH_BASE_URL`, then the sandbox default. Override with your production base URL once you have one. |
| `timeoutMs` | No | Request timeout in milliseconds. |
| `retries` | No | Retry count for timeout and transient server failures. |
| `endpoints` | No | Override default `payMerchant`, `checkStatus`, and `refund` paths. `checkStatus` is a template containing `{endUserId}` and `{clientCorrelator}` placeholders. |
| `idempotencyHeader` | No | Header name used for idempotency protection. |
| `defaultHeaders` | No | Additional headers sent with every request. |

\* Required either directly or through environment variables. These merchant identity fields (merchant number, terminal ID, location, super-merchant name, merchant name) are assigned to you during EcoCash merchant onboarding — they're not universal constants, so there's no sensible default to fall back to.

## Environment variables

| Variable | Description |
| --- | --- |
| `ECOCASH_USERNAME` | API username |
| `ECOCASH_PASSWORD` | API password |
| `ECOCASH_MERCHANT` | Merchant code |
| `ECOCASH_MERCHANT_PIN` | Merchant PIN |
| `ECOCASH_MERCHANT_NUMBER` | Merchant's registered MSISDN |
| `ECOCASH_TERMINAL_ID` | POS terminal identifier |
| `ECOCASH_LOCATION` | Merchant location |
| `ECOCASH_SUPER_MERCHANT_NAME` | Super-merchant name |
| `ECOCASH_MERCHANT_NAME` | Merchant display name |
| `ECOCASH_COUNTRY_CODE` | ISO country code (defaults to `ZW`) |
| `ECOCASH_BASE_URL` | Provider base URL (defaults to the EcoCash sandbox) |

> Note: `ECOCASH_API_KEY` is deprecated/removed and should not be used.

## Checking transaction status

`checkStatus` looks up a transaction by the customer's phone number and the `clientCorrelator` used to initiate it — both are required, since EcoCash's lookup endpoint takes them as URL path segments (`GET /{endUserId}/transactions/amount/{clientCorrelator}`), not query parameters:

```ts
await ecocash.checkStatus({
  phone: "0771234567",
  clientCorrelator: payment.clientCorrelator
});
```

`payment.clientCorrelator` is returned from `payMerchant` — if you don't pass your own `idempotencyKey`, Gauro generates one and you'll need it later to poll status.

## Refund behavior (EcoCash)

Refunds are sent to `POST /transactions/refund/` and require:

- `clientCorrelator` (new correlator for the refund request)
- `originalEcocashReference` (from prior transaction lookup / `checkStatus` response)
- `phone` (the customer's EcoCash MSISDN)

Optional:

- `amount` (partial refund; must be ≤ original amount)
- `currency` (defaults to `"USD"`)
- `reference` / `description` (defaults derived from `clientCorrelator`)

Practical flow:

1. Initiate payment (`payMerchant`)
2. Lookup transaction (`checkStatus`)
3. Read `ecocashReference` from lookup response
4. Submit `refund` using `originalEcocashReference = ecocashReference`

## Error handling

Gauro normalizes provider failures into typed SDK errors (for example authentication vs provider/business-rule failures). Error messages include EcoCash's own `statusMessage` when the provider returns one, so `error.message` is directly useful for logs and support tickets.

For refunds, a request against a non-eligible transaction (e.g. non-`SUCCESS`) may be rejected by EcoCash with a provider/business error (`ProviderError`). You should surface provider code/message to callers for handling and retry decisions.

## Architecture

```text
Application
    |
Gauro SDK
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
