# Getting started

## Install

```bash
npm install bhadhara
```

## Configure EcoCash

```ts
import { createEcoCash } from "bhadhara/ecocash";

const ecocash = createEcoCash({
  username: process.env.ECOCASH_USERNAME,
  password: process.env.ECOCASH_PASSWORD,
  merchantCode: process.env.ECOCASH_MERCHANT,
  merchantPin: process.env.ECOCASH_MERCHANT_PIN,
  baseUrl: process.env.ECOCASH_BASE_URL
});
```

You can also rely on environment variables for the same values and only pass overrides such as `timeoutMs`, `retries`, or custom endpoint paths.

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

Bhadhara normalizes the phone number, adds an idempotency key, and returns a common response shape:

```ts
{
  success: true,
  status: "pending",
  providerReference: "abc123",
  reference: "invoice-001"
}
```

## Poll for final status

```ts
const latest = await ecocash.checkStatus({
  providerReference: response.providerReference,
  reference: response.reference
});
```

## Error handling

Bhadhara surfaces normalized errors:

- `AuthenticationError`
- `NetworkError`
- `ProviderError`
- `ValidationError`
- `ConfigurationError`
