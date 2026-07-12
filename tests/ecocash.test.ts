import { test } from "node:test";
import assert from "node:assert/strict";
import { createEcoCash } from "../src/providers/ecocash/index.js";
import { ValidationError } from "../src/core/errors.js";
import { installFetchStub } from "./helpers/fetchStub.js";

function client() {
  return createEcoCash({
    username: "user",
    password: "pass",
    merchantCode: "merchant-1",
    merchantPin: "1234",
    merchantNumber: "778503033",
    terminalID: "TERM001",
    location: "Harare",
    superMerchantName: "EcoCash Sandbox",
    merchantName: "Test Merchant",
    baseUrl: "https://sandbox.ecocash.co.zw"
  });
}

test("payMerchant sends the confirmed nested request shape and normalizes a pending response", async () => {
  const stub = installFetchStub([{ status: 200, body: { status: "PENDING", transactionId: "MP230422.1145.T0123456" } }]);

  try {
    const ecocash = client();
    const response = await ecocash.payMerchant({
      amount: 10,
      phone: "0771234567",
      reference: "order-1",
      description: "Test order"
    });

    assert.equal(stub.calls.length, 1);
    assert.equal(stub.calls[0].url, "https://sandbox.ecocash.co.zw/transactions/amount/");
    assert.equal(stub.calls[0].method, "POST");
    assert.equal(stub.calls[0].headers.get("Authorization"), `Basic ${btoa("user:pass")}`);

    const body = JSON.parse(stub.calls[0].body ?? "{}");
    assert.equal(body.endUserId, "263771234567");
    assert.equal(body.tranType, "MER");
    assert.equal(body.referenceCode, "order-1");
    assert.equal(body.transactionOperationStatus, "Charged");
    assert.equal(body.paymentAmount.charginginformation.amount, 10);
    assert.equal(body.paymentAmount.charginginformation.currency, "USD");
    assert.equal(body.paymentAmount.chargeMetaData.channel, "WEB");
    assert.equal(body.merchantCode, "merchant-1");
    assert.equal(body.merchantPin, "1234");
    assert.equal(body.merchantNumber, "778503033");
    assert.equal(body.countryCode, "ZW");
    assert.equal(body.terminalID, "TERM001");
    assert.equal(body.location, "Harare");
    assert.equal(body.superMerchantName, "EcoCash Sandbox");
    assert.equal(body.merchantName, "Test Merchant");

    assert.equal(response.status, "pending");
    assert.equal(response.success, true);
    assert.equal(response.providerReference, "MP230422.1145.T0123456");
    assert.equal(response.reference, "order-1");
    assert.ok(response.clientCorrelator);
  } finally {
    stub.restore();
  }
});

test("payMerchant normalizes a failed response", async () => {
  const stub = installFetchStub([{ status: 200, body: { status: "FAILED", statusMessage: "insufficient funds" } }]);

  try {
    const ecocash = client();
    const response = await ecocash.payMerchant({
      amount: 10,
      phone: "0771234567",
      reference: "order-2"
    });

    assert.equal(response.status, "failed");
    assert.equal(response.success, false);
    assert.equal(response.message, "insufficient funds");
  } finally {
    stub.restore();
  }
});

test("checkStatus interpolates phone and clientCorrelator into the path template", async () => {
  const stub = installFetchStub([
    { status: 200, body: { status: "SUCCESS", transactionId: "MP240601.1200.T0123456" } }
  ]);

  try {
    const ecocash = client();
    const response = await ecocash.checkStatus({ phone: "0771234567", clientCorrelator: "REF-001" });

    assert.equal(stub.calls[0].method, "GET");
    assert.equal(
      stub.calls[0].url,
      "https://sandbox.ecocash.co.zw/263771234567/transactions/amount/REF-001"
    );

    assert.equal(response.status, "success");
    assert.equal(response.providerReference, "MP240601.1200.T0123456");
    assert.equal(response.ecocashReference, "MP240601.1200.T0123456");
  } finally {
    stub.restore();
  }
});

test("checkStatus rejects a payload missing phone or clientCorrelator", async () => {
  const ecocash = client();

  await assert.rejects(() => ecocash.checkStatus({ phone: "", clientCorrelator: "REF-001" }), ValidationError);
  await assert.rejects(() => ecocash.checkStatus({ phone: "0771234567", clientCorrelator: "" }), ValidationError);
});

test("refund rejects a payload missing originalEcocashReference or phone before making a request", async () => {
  const ecocash = client();

  await assert.rejects(
    () =>
      ecocash.refund({
        clientCorrelator: "refund-1",
        originalEcocashReference: "",
        phone: "0771234567"
      }),
    ValidationError
  );

  await assert.rejects(
    () =>
      ecocash.refund({
        clientCorrelator: "refund-1",
        originalEcocashReference: "eco-ref-1",
        phone: ""
      }),
    ValidationError
  );
});

test("refund sends the confirmed nested request shape with tranType REF", async () => {
  const stub = installFetchStub([{ status: 200, body: { status: "SUCCESS", transactionId: "eco-ref-2" } }]);

  try {
    const ecocash = client();
    const response = await ecocash.refund({
      clientCorrelator: "refund-1",
      originalEcocashReference: "eco-ref-1",
      phone: "0771234567",
      amount: 5
    });

    assert.equal(stub.calls[0].url, "https://sandbox.ecocash.co.zw/transactions/refund/");
    const body = JSON.parse(stub.calls[0].body ?? "{}");
    assert.equal(body.tranType, "REF");
    assert.equal(body.originalEcocashReference, "eco-ref-1");
    assert.equal(body.endUserId, "263771234567");
    assert.equal(body.paymentAmount.charginginformation.amount, 5);
    assert.equal(body.paymentAmount.charginginformation.currency, "USD");
    assert.equal(body.currencyCode, "USD");

    assert.equal(response.success, true);
    assert.equal(response.ecocashReference, "eco-ref-2");
  } finally {
    stub.restore();
  }
});

test("refund endpoint can be overridden via config", async () => {
  const stub = installFetchStub([{ status: 200, body: { status: "SUCCESS", transactionId: "eco-ref-3" } }]);

  try {
    const ecocash = createEcoCash({
      username: "user",
      password: "pass",
      merchantCode: "merchant-1",
      merchantPin: "1234",
      merchantNumber: "778503033",
      terminalID: "TERM001",
      location: "Harare",
      superMerchantName: "EcoCash Sandbox",
      merchantName: "Test Merchant",
      baseUrl: "https://sandbox.ecocash.co.zw",
      endpoints: { refund: "/custom/refund/path/" }
    });

    await ecocash.refund({
      clientCorrelator: "refund-1",
      originalEcocashReference: "eco-ref-1",
      phone: "0771234567"
    });

    assert.equal(stub.calls[0].url, "https://sandbox.ecocash.co.zw/custom/refund/path/");
  } finally {
    stub.restore();
  }
});

test("createEcoCash defaults to the confirmed EcoCash sandbox base URL", async () => {
  const stub = installFetchStub([{ status: 200, body: { status: "PENDING", transactionId: "txn-1" } }]);

  try {
    const ecocash = createEcoCash({
      username: "user",
      password: "pass",
      merchantCode: "merchant-1",
      merchantPin: "1234",
      merchantNumber: "778503033",
      terminalID: "TERM001",
      location: "Harare",
      superMerchantName: "EcoCash Sandbox",
      merchantName: "Test Merchant"
    });

    await ecocash.payMerchant({ amount: 10, phone: "0771234567", reference: "order-1" });

    assert.equal(
      stub.calls[0].url,
      "https://developers.ecocash.co.zw/sandbox/payment/v1/transactions/amount/"
    );
  } finally {
    stub.restore();
  }
});

test("createEcoCash requires the new merchant identity fields", () => {
  assert.throws(() =>
    createEcoCash({
      username: "user",
      password: "pass",
      merchantCode: "merchant-1",
      merchantPin: "1234"
    })
  );
});
