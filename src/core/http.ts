import { AuthenticationError, NetworkError, ProviderError } from "./errors.js";

export interface HttpRequestOptions {
  method?: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string | undefined>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
}

export interface HttpClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
}

export interface HttpResponse<T> {
  status: number;
  headers: Headers;
  data: T;
}

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly retries: number;

  public constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.defaultHeaders = config.defaultHeaders ?? {};
    this.timeoutMs = config.timeoutMs ?? 10_000;
    this.retries = config.retries ?? 1;
  }

  public async request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
    const totalAttempts = Math.max(0, options.retries ?? this.retries) + 1;
    const method = options.method ?? "POST";

    for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);

      try {
        const response = await fetch(buildUrl(this.baseUrl, options.path, options.query), {
          method,
          headers: buildHeaders(this.defaultHeaders, options.headers, options.body),
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: controller.signal
        });

        const data = (await parseResponseBody(response)) as T;

        if (response.ok) {
          return {
            status: response.status,
            headers: response.headers,
            data
          };
        }

        if (attempt < totalAttempts && RETRYABLE_STATUS_CODES.has(response.status)) {
          continue;
        }

        const statusMessage = extractStatusMessage(data);

        if (response.status === 401 || response.status === 403) {
          throw new AuthenticationError(
            statusMessage ?? "Provider authentication failed.",
            { status: response.status, data }
          );
        }

        throw new ProviderError(
          statusMessage ?? `Provider request failed with status ${response.status}.`,
          { status: response.status, data }
        );
      } catch (error) {
        if (error instanceof AuthenticationError || error instanceof ProviderError) {
          throw error;
        }

        if (attempt < totalAttempts && isRetryableError(error)) {
          continue;
        }

        throw new NetworkError("Unable to reach the provider API.", undefined, error);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new NetworkError("Request failed after exhausting retries.");
  }
}

function buildUrl(
  baseUrl: string,
  path: string,
  query: Record<string, string | number | boolean | undefined> = {}
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function buildHeaders(
  defaultHeaders: Record<string, string>,
  requestHeaders: Record<string, string | undefined> = {},
  body: unknown
): Headers {
  const headers = new Headers(defaultHeaders);

  for (const [key, value] of Object.entries(requestHeaders)) {
    if (value !== undefined) {
      headers.set(key, value);
    }
  }

  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return headers;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.length === 0) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch (error) {
      throw new ProviderError("Provider returned an invalid JSON response.", {
        status: response.status,
        body: text
      }, error);
    }
  }

  return text;
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AbortError" || error.name === "TypeError";
}

function extractStatusMessage(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null) {
    return undefined;
  }

  const value = (data as Record<string, unknown>).statusMessage;
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
