import { createEcoCash } from "../src/providers/ecocash/index.js";

const ecocash = createEcoCash({
  apiKey: "your-api-key",
  merchantCode: "your-merchant-code",
  baseUrl: "https://provider.example.com"
});

async function main(): Promise<void> {
  const payment = await ecocash.payMerchant({
    amount: 10,
    phone: "0771234567",
    reference: "order-123",
    description: "Demo order"
  });

  console.log("Payment response:", payment);

  if (payment.status === "pending") {
    const latest = await ecocash.checkStatus({
      providerReference: payment.providerReference,
      reference: payment.reference
    });

    console.log("Latest status:", latest);
  }
}

void main();
