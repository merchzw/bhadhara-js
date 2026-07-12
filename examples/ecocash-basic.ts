import { createEcoCash } from "../src/providers/ecocash/index.js";

const ecocash = createEcoCash({
  username: "your-username",
  password: "your-password",
  merchantCode: "your-merchant-code",
  merchantPin: "your-merchant-pin",
  merchantNumber: "your-merchant-number",
  terminalID: "your-terminal-id",
  location: "Harare",
  superMerchantName: "Your Super Merchant Name",
  merchantName: "Your Merchant Name"
  // baseUrl defaults to the EcoCash sandbox; override once you have production credentials.
});

async function main(): Promise<void> {
  const payment = await ecocash.payMerchant({
    amount: 10,
    phone: "0771234567",
    reference: "order-123",
    description: "Demo order",
    notifyUrl: "https://example.com/notify"
  });

  console.log("Payment response:", payment);

  if (payment.status === "pending" && payment.clientCorrelator) {
    const latest = await ecocash.checkStatus({
      phone: "0771234567",
      clientCorrelator: payment.clientCorrelator
    });

    console.log("Latest status:", latest);

    if (latest.status === "success" && latest.ecocashReference) {
      const refund = await ecocash.refund({
        clientCorrelator: "refund-order-123-1",
        originalEcocashReference: latest.ecocashReference,
        phone: "0771234567",
        amount: 5
      });

      console.log("Refund response:", refund);
    }
  }
}

void main();
