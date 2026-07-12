import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertCheckStatusPayload,
  assertPaymentPayload,
  assertRefundPayload,
  createIdempotencyKey,
  normalizePaymentStatus,
  normalizeZimbabwePhoneNumber
} from "../src/core/utils.js";
import { ValidationError } from "../src/core/errors.js";

test("normalizeZimbabwePhoneNumber accepts 0-prefixed numbers", () => {
  assert.equal(normalizeZimbabwePhoneNumber("0771234567"), "263771234567");
});

test("normalizeZimbabwePhoneNumber accepts 7-prefixed numbers", () => {
  assert.equal(normalizeZimbabwePhoneNumber("771234567"), "263771234567");
});

test("normalizeZimbabwePhoneNumber accepts already-normalized numbers", () => {
  assert.equal(normalizeZimbabwePhoneNumber("263771234567"), "263771234567");
});

test("normalizeZimbabwePhoneNumber strips non-digit characters before matching", () => {
  assert.equal(normalizeZimbabwePhoneNumber("+263 77 123 4567"), "263771234567");
});

test("normalizeZimbabwePhoneNumber rejects an invalid number", () => {
  assert.throws(() => normalizeZimbabwePhoneNumber("12345"), ValidationError);
});

test("normalizePaymentStatus maps known success synonyms", () => {
  for (const value of ["success", "SUCCESSFUL", "Completed", "paid", "approved"]) {
    assert.equal(normalizePaymentStatus(value), "success");
  }
});

test("normalizePaymentStatus maps known failure synonyms", () => {
  for (const value of ["failed", "Failure", "declined", "rejected", "cancelled", "canceled"]) {
    assert.equal(normalizePaymentStatus(value), "failed");
  }
});

test("normalizePaymentStatus defaults unknown values to pending", () => {
  assert.equal(normalizePaymentStatus(undefined), "pending");
  assert.equal(normalizePaymentStatus("in_progress"), "pending");
});

test("createIdempotencyKey is deterministic for the same inputs", () => {
  const key = createIdempotencyKey({
    provider: "EcoCash",
    reference: "order-1",
    amount: 10,
    phone: "0771234567"
  });

  assert.equal(key, "ecocash:order-1:10:0771234567");
});

test("assertPaymentPayload rejects a non-positive amount", () => {
  assert.throws(
    () =>
      assertPaymentPayload({
        amount: 0,
        phone: "0771234567",
        reference: "order-1"
      }),
    ValidationError
  );
});

test("assertPaymentPayload rejects a missing reference", () => {
  assert.throws(
    () =>
      assertPaymentPayload({
        amount: 10,
        phone: "0771234567",
        reference: ""
      }),
    ValidationError
  );
});

test("assertPaymentPayload accepts a valid payload", () => {
  assert.doesNotThrow(() =>
    assertPaymentPayload({
      amount: 10,
      phone: "0771234567",
      reference: "order-1"
    })
  );
});

test("assertCheckStatusPayload requires a phone number", () => {
  assert.throws(
    () => assertCheckStatusPayload({ phone: "", clientCorrelator: "REF-001" }),
    ValidationError
  );
});

test("assertCheckStatusPayload requires a clientCorrelator", () => {
  assert.throws(
    () => assertCheckStatusPayload({ phone: "0771234567", clientCorrelator: "" }),
    ValidationError
  );
});

test("assertCheckStatusPayload accepts a valid payload", () => {
  assert.doesNotThrow(() =>
    assertCheckStatusPayload({ phone: "0771234567", clientCorrelator: "REF-001" })
  );
});

test("assertRefundPayload requires clientCorrelator", () => {
  assert.throws(
    () =>
      assertRefundPayload({
        clientCorrelator: "",
        originalEcocashReference: "eco-ref-1",
        phone: "0771234567"
      }),
    ValidationError
  );
});

test("assertRefundPayload requires originalEcocashReference", () => {
  assert.throws(
    () =>
      assertRefundPayload({
        clientCorrelator: "refund-1",
        originalEcocashReference: "",
        phone: "0771234567"
      }),
    ValidationError
  );
});

test("assertRefundPayload requires a phone number", () => {
  assert.throws(
    () =>
      assertRefundPayload({
        clientCorrelator: "refund-1",
        originalEcocashReference: "eco-ref-1",
        phone: ""
      }),
    ValidationError
  );
});

test("assertRefundPayload accepts a valid payload", () => {
  assert.doesNotThrow(() =>
    assertRefundPayload({
      clientCorrelator: "refund-1",
      originalEcocashReference: "eco-ref-1",
      phone: "0771234567"
    })
  );
});
