import { test } from "node:test";
import assert from "node:assert/strict";
import { HttpClient } from "../src/core/http.js";
import { AuthenticationError, NetworkError, ProviderError } from "../src/core/errors.js";
import { installFetchStub } from "./helpers/fetchStub.js";

test("HttpClient returns parsed JSON on a successful response", async () => {
  const stub = installFetchStub([{ status: 200, body: { status: "success" } }]);

  try {
    const client = new HttpClient({ baseUrl: "https://api.example.com" });
    const response = await client.request({ path: "/pay" });

    assert.equal(response.status, 200);
    assert.deepEqual(response.data, { status: "success" });
    assert.equal(stub.calls.length, 1);
    assert.equal(stub.calls[0].url, "https://api.example.com/pay");
  } finally {
    stub.restore();
  }
});

test("HttpClient retries a retryable status code before succeeding", async () => {
  const stub = installFetchStub([
    { status: 503, body: { message: "unavailable" } },
    { status: 200, body: { status: "success" } }
  ]);

  try {
    const client = new HttpClient({ baseUrl: "https://api.example.com", retries: 1 });
    const response = await client.request({ path: "/pay" });

    assert.equal(response.status, 200);
    assert.equal(stub.calls.length, 2);
  } finally {
    stub.restore();
  }
});

test("HttpClient maps a 401 response to AuthenticationError", async () => {
  const stub = installFetchStub([{ status: 401, body: { message: "bad credentials" } }]);

  try {
    const client = new HttpClient({ baseUrl: "https://api.example.com", retries: 0 });
    await assert.rejects(() => client.request({ path: "/pay" }), AuthenticationError);
  } finally {
    stub.restore();
  }
});

test("HttpClient maps a non-retryable failure status to ProviderError", async () => {
  const stub = installFetchStub([{ status: 400, body: { message: "bad request" } }]);

  try {
    const client = new HttpClient({ baseUrl: "https://api.example.com", retries: 0 });
    await assert.rejects(() => client.request({ path: "/pay" }), ProviderError);
  } finally {
    stub.restore();
  }
});

test("HttpClient does not retry a non-retryable status even when retries are configured", async () => {
  const stub = installFetchStub([{ status: 400, body: { message: "bad request" } }]);

  try {
    const client = new HttpClient({ baseUrl: "https://api.example.com", retries: 2 });
    await assert.rejects(() => client.request({ path: "/pay" }), ProviderError);
    assert.equal(stub.calls.length, 1);
  } finally {
    stub.restore();
  }
});

test("HttpClient throws ProviderError once retries on a retryable status are exhausted", async () => {
  const stub = installFetchStub([
    { status: 500, body: {} },
    { status: 500, body: {} }
  ]);

  try {
    const client = new HttpClient({ baseUrl: "https://api.example.com", retries: 1 });
    await assert.rejects(() => client.request({ path: "/pay" }), ProviderError);
    assert.equal(stub.calls.length, 2);
  } finally {
    stub.restore();
  }
});

test("HttpClient wraps a network-level failure in NetworkError", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;

  try {
    const client = new HttpClient({ baseUrl: "https://api.example.com", retries: 0 });
    await assert.rejects(() => client.request({ path: "/pay" }), NetworkError);
  } finally {
    globalThis.fetch = original;
  }
});
