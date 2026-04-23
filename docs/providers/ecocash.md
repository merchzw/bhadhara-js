# EcoCash provider

The EcoCash provider exposes the standard Bhadhara payment interface:

- `payMerchant`
- `checkStatus`

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

## Payment payload

```ts
await ecocash.payMerchant({
  amount: 10,
  phone: "0771234567",
  reference: "order-123",
  description: "Example order"
});
```

## Status polling

```ts
await ecocash.checkStatus({
  providerReference: "provider-txn-123"
});
```

## Request behavior

- retries transient network and server failures
- sends authorization and merchant headers automatically
- generates an idempotency key when one is not supplied
- normalizes provider response states to `pending`, `success`, or `failed`

## Endpoint customization

The shipped endpoint values are placeholders. Override them if the provider API uses different routes in your environment.
