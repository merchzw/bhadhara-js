# EcoCash provider

The EcoCash provider exposes the standard Gauro payment interface:

- `payMerchant`
- `checkStatus`
- `refund`

Confirmed against EcoCash's Developer Portal (Authentication, API Playground, SDKs & Codegen, and API Reference tabs).

## Factory

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

## Base URL

Defaults to `https://developers.ecocash.co.zw/sandbox/payment/v1`. Override `baseUrl` with your production URL once you have one — EcoCash's live base URL hasn't been confirmed against the Developer Portal yet.

## Default endpoints (relative to `baseUrl`)

| Method | Path |
| --- | --- |
| `payMerchant` | `POST /transactions/amount/` |
| `checkStatus` | `GET /{endUserId}/transactions/amount/{clientCorrelator}` |
| `refund` | `POST /transactions/refund/` |

## Payment payload

```ts
await ecocash.payMerchant({
  amount: 10,
  phone: "0771234567",
  reference: "order-123",
  description: "Example order",
  notifyUrl: "https://example.com/notify",
  channel: "WEB" // optional: defaults to "WEB" (also accepts "POS", "USSD", etc.)
});
```

Internally this sends EcoCash's confirmed request shape:

```json
{
  "clientCorrelator": "...",
  "notifyUrl": "https://example.com/notify",
  "referenceCode": "order-123",
  "tranType": "MER",
  "endUserId": "263771234567",
  "remarks": "Example order",
  "transactionOperationStatus": "Charged",
  "paymentAmount": {
    "charginginformation": { "amount": 10, "currency": "USD", "description": "Example order" },
    "chargeMetaData": { "channel": "WEB" }
  },
  "merchantCode": "...",
  "merchantPin": "...",
  "merchantNumber": "...",
  "countryCode": "ZW",
  "terminalID": "...",
  "location": "...",
  "superMerchantName": "...",
  "merchantName": "..."
}
```

## Status polling

`checkStatus` requires both the customer's phone number and the `clientCorrelator` from the original `payMerchant` call — EcoCash's lookup takes them as URL path segments, not query parameters:

```ts
await ecocash.checkStatus({
  phone: "0771234567",
  clientCorrelator: "ecocash:order-123:10:263771234567"
});
```

## Refunds

Refunds require the `ecocashReference` from a prior `checkStatus` lookup on a successful transaction, plus the customer's phone number. Internally the SDK sends `tranType: "REF"` (per EcoCash's documented `tranType` legend: `MER` = merchant charge, `REF` = refund, `REV` = reversal):

```ts
await ecocash.refund({
  clientCorrelator: "refund-order-123-1",
  originalEcocashReference: "MP240601.1200.T0123456",
  phone: "0771234567",
  amount: 5, // optional: partial refund
  currency: "USD" // optional: defaults to USD
});
```

## Request behavior

- retries transient network and server failures (`408`, `425`, `429`, `500`, `502`, `503`, `504`)
- sends `Authorization: Basic <base64(username:password)>` automatically
- sends merchant identity fields (`merchantCode`, `merchantPin`, `merchantNumber`, `terminalID`, `location`, `superMerchantName`, `merchantName`, `countryCode`) in every request body
- generates an idempotency key (used as `clientCorrelator`) when one is not supplied
- normalizes provider response states to `pending`, `success`, or `failed`
- surfaces EcoCash's `statusMessage` in thrown error messages when present

### EcoCash error codes (confirmed)

| HTTP | Meaning |
| --- | --- |
| `400` | Invalid request (missing field, bad MSISDN/currency/amount, duplicate correlator) |
| `401` | Invalid credentials |
| `403` | Sandbox not enabled — request sandbox access first |
| `404` | Transaction not found for the given `endUserId` + `clientCorrelator` |
| `409` | Refund not eligible (e.g. already refunded) |
| `422` | Business rule violation (insufficient funds, barred MSISDN, refund exceeds original, limit exceeded) |
| `500` | Internal server error (retried automatically) |
| `503` | Service unavailable / maintenance (retried automatically) |

## Endpoint customization

Override the default paths if your environment uses different routes. `checkStatus` is a template — keep the `{endUserId}` and `{clientCorrelator}` placeholders if you override it:

```ts
const ecocash = createEcoCash({
  // ...
  endpoints: {
    payMerchant: "/custom/payment/path/",
    checkStatus: "/custom/{endUserId}/status/{clientCorrelator}",
    refund: "/custom/refund/path/"
  }
});
```
