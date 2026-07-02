# EcoCash provider

The EcoCash provider exposes the standard Bhadhara payment interface:

- `payMerchant`
- `checkStatus`

## Factory

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

## Environment variables

| Variable | Description |
| --- | --- |
| `ECOCASH_USERNAME` | API username |
| `ECOCASH_PASSWORD` | API password |
| `ECOCASH_MERCHANT` | Merchant code |
| `ECOCASH_MERCHANT_PIN` | Merchant PIN |
| `ECOCASH_BASE_URL` | Provider base URL |

## Default sandbox endpoints

| Method | Path |
| --- | --- |
| `payMerchant` | `/sandbox/payment/v1/transactions/amount/` |
| `checkStatus` | `/sandbox/payment/v1/transactions/` |

## Payment payload

```ts
await ecocash.payMerchant({
  amount: 10,
  phone: "0771234567",
  reference: "order-123",
  description: "Example order",
  notifyUrl: "https://example.com/notify"
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
- sends `Authorization: Basic <base64(username:password)>` automatically
- sends `merchantCode` and `merchantPin` in the request body
- generates an idempotency key when one is not supplied
- normalizes provider response states to `pending`, `success`, or `failed`

## Endpoint customization

Override the default sandbox paths if your environment uses different routes:

```ts
const ecocash = createEcoCash({
  // ...
  endpoints: {
    payMerchant: "/custom/payment/path/",
    checkStatus: "/custom/status/path/"
  }
});
```
