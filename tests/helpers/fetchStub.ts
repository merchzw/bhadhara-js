export interface StubbedCall {
  url: string;
  method: string;
  headers: Headers;
  body: string | undefined;
}

export interface StubbedResponse {
  status: number;
  body?: unknown;
  contentType?: string;
}

export function installFetchStub(responses: StubbedResponse[]): {
  calls: StubbedCall[];
  restore: () => void;
} {
  const calls: StubbedCall[] = [];
  const queue = [...responses];
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? init.body : undefined
    });

    const next = queue.shift();

    if (!next) {
      throw new Error("No stubbed response left for fetch call.");
    }

    const payload = next.body === undefined ? "" : JSON.stringify(next.body);

    return new Response(payload, {
      status: next.status,
      headers: {
        "content-type": next.contentType ?? "application/json"
      }
    });
  }) as typeof fetch;

  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    }
  };
}
