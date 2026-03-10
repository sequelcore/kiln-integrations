import type { ResolvedCredential } from "@kilnai/core";

export class IntegrationHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    public readonly retryable: boolean,
  ) {
    const summary = typeof body === "object" && body !== null
      ? JSON.stringify(body).slice(0, 200)
      : String(body).slice(0, 200);
    super(`HTTP ${status}: ${summary}`);
    this.name = "IntegrationHttpError";
  }
}

export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

export function buildAuthHeaders(credential: ResolvedCredential): Record<string, string> {
  const extra = credential.headers ?? {};
  switch (credential.type) {
    case "bearer":
      return { Authorization: `Bearer ${credential.value}`, ...extra };
    case "api_key":
      return extra;
    case "basic":
      return { Authorization: `Basic ${credential.value}`, ...extra };
    case "custom":
      return extra;
  }
}

export async function fetchJson<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
  const { method = "GET", headers = {}, body, signal } = options;

  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    signal,
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new IntegrationHttpError(
      res.status,
      tryParseJson(text),
      res.status >= 500 || res.status === 429,
    );
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
