import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthHeaders, fetchJson, IntegrationHttpError } from "../src/http.js";
import type { ResolvedCredential } from "@kilnai/core";

describe("buildAuthHeaders", () => {
  it("bearer token", () => {
    const cred: ResolvedCredential = { type: "bearer", value: "tok_123" };
    expect(buildAuthHeaders(cred)).toEqual({ Authorization: "Bearer tok_123" });
  });

  it("bearer with extra headers", () => {
    const cred: ResolvedCredential = { type: "bearer", value: "tok", headers: { "X-Custom": "v" } };
    expect(buildAuthHeaders(cred)).toEqual({ Authorization: "Bearer tok", "X-Custom": "v" });
  });

  it("api_key uses headers only", () => {
    const cred: ResolvedCredential = { type: "api_key", value: "sk_test", headers: { "X-Api-Key": "sk_test" } };
    expect(buildAuthHeaders(cred)).toEqual({ "X-Api-Key": "sk_test" });
  });

  it("basic auth", () => {
    const cred: ResolvedCredential = { type: "basic", value: "dXNlcjpwYXNz" };
    expect(buildAuthHeaders(cred)).toEqual({ Authorization: "Basic dXNlcjpwYXNz" });
  });

  it("custom uses headers", () => {
    const cred: ResolvedCredential = { type: "custom", value: "", headers: { "X-Token": "abc" } };
    expect(buildAuthHeaders(cred)).toEqual({ "X-Token": "abc" });
  });
});

describe("fetchJson", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns parsed JSON on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ));
    const result = await fetchJson<{ ok: boolean }>("https://example.com/api");
    expect(result).toEqual({ ok: true });
  });

  it("throws IntegrationHttpError on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "bad" }), { status: 400 }),
    ));
    const err = await fetchJson("https://example.com/api").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(IntegrationHttpError);
    expect((err as IntegrationHttpError).status).toBe(400);
    expect((err as IntegrationHttpError).retryable).toBe(false);
  });

  it("marks 5xx as retryable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("server error", { status: 503 }),
    ));
    const err = await fetchJson("https://example.com/api").catch((e: unknown) => e);
    expect((err as IntegrationHttpError).retryable).toBe(true);
  });

  it("marks 429 as retryable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    ));
    const err = await fetchJson("https://example.com/api").catch((e: unknown) => e);
    expect((err as IntegrationHttpError).retryable).toBe(true);
  });

  it("sends JSON body and correct headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", mockFetch);

    await fetchJson("https://example.com/api", {
      method: "POST",
      body: { name: "test" },
      headers: { Authorization: "Bearer tok" },
    });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.com/api");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "test" }));
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer tok");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("returns undefined for empty response body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("", { status: 200 }),
    ));
    const result = await fetchJson("https://example.com/api");
    expect(result).toBeUndefined();
  });
});
