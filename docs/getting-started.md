# Getting started

## Install

```bash
npm install gauro
```

## Configure EcoCash

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
});
```

You can also rely on environment variables for the same values and only pass overrides such as `timeoutMs`, `retries`, or custom endpoint paths. `baseUrl` doesn't need to be set for sandbox testing — it defaults to EcoCash's sandbox (`https://developers.ecocash.co.zw/sandbox/payment/v1`). Pass your own `baseUrl` once you have production credentials.

The five merchant identity fields (`merchantNumber`, `terminalID`, `location`, `superMerchantName`, `merchantName`) are assigned to you during EcoCash merchant onboarding — every merchant has different values, so there's no default.

## Make a payment

```ts
const response = await ecocash.payMerchant({
  amount: 25,
  phone: "0771234567",
  reference: "invoice-001",
  description: "Invoice payment",
  notifyUrl: "https://example.com/notify"
});
```

Gauro normalizes the phone number, adds an idempotency key (used as EcoCash's `clientCorrelator`), and returns a common response shape:

```ts
{
  success: true,
  status: "pending",
  providerReference: "MP230422.1145.T0123456",
  clientCorrelator: "ecocash:invoice-001:25:263771234567",
  reference: "invoice-001"
}
```

Hold on to `clientCorrelator` — you'll need it to poll status later.

## Poll for final status

EcoCash's lookup endpoint takes the customer's phone number and the original `clientCorrelator` as URL path segments, so both are required:

```ts
const latest = await ecocash.checkStatus({
  phone: "0771234567",
  clientCorrelator: response.clientCorrelator
});
```

## Refund a payment

Refunds require the `ecocashReference` returned by `checkStatus` once a payment has succeeded, plus the customer's phone number:

```ts
if (latest.status === "success" && latest.ecocashReference) {
  const refund = await ecocash.refund({
    clientCorrelator: "refund-invoice-001-1",
    originalEcocashReference: latest.ecocashReference,
    phone: "0771234567",
    amount: 5 // optional: partial refund
  });
}
```

## Error handling

Gauro surfaces normalized errors:

- `AuthenticationError`
- `NetworkError`
- `ProviderError`
- `ValidationError`
- `ConfigurationError`

Error messages include EcoCash's own `statusMessage` when the provider returns one (e.g. "Barred MSISDN", "Insufficient funds"), so `error.message` is directly useful for logs and support tickets.
