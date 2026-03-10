import { afterEach, describe, expect, it, vi } from "vitest";
import { adapter } from "../src/adapter.js";
import type { ResolvedCredential } from "@kilnai/core";

const cred: ResolvedCredential = { type: "bearer", value: "sk_test_abc123" };

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("stripe adapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("has correct provider and 3 operations", () => {
    expect(adapter.provider).toBe("stripe");
    expect(adapter.operations).toHaveLength(3);
    expect(adapter.operations.map((o) => o.name)).toEqual([
      "create_payment_link",
      "list_payment_links",
      "get_payment_link",
    ]);
  });

  it("create_payment_link sends form-encoded body", async () => {
    const link = { id: "plink_abc", url: "https://buy.stripe.com/test", active: true };
    const fetchMock = mockFetch(link);

    const result = await adapter.execute("create_payment_link", cred, {
      lineItems: [{ price: "price_abc", quantity: 2 }],
    });

    expect(result.data).toEqual({ id: "plink_abc", url: "https://buy.stripe.com/test", active: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/payment_links");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/x-www-form-urlencoded");
    const body = init.body as string;
    expect(body).toContain("line_items%5B0%5D%5Bprice%5D=price_abc");
    expect(body).toContain("line_items%5B0%5D%5Bquantity%5D=2");
  });

  it("create_payment_link includes metadata and after_completion", async () => {
    const fetchMock = mockFetch({ id: "plink_x", url: "https://buy.stripe.com/x", active: true });

    await adapter.execute("create_payment_link", cred, {
      lineItems: [{ price: "price_1", quantity: 1 }],
      metadata: { orderId: "ord_123" },
      afterCompletionType: "redirect",
      afterCompletionRedirectUrl: "https://example.com/thanks",
    });

    const body = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string;
    expect(body).toContain("metadata%5BorderId%5D=ord_123");
    expect(body).toContain("after_completion%5Btype%5D=redirect");
    expect(body).toContain("after_completion%5Bredirect%5D%5Burl%5D=https%3A%2F%2Fexample.com%2Fthanks");
  });

  it("list_payment_links returns array", async () => {
    const links = [
      { id: "plink_1", url: "https://buy.stripe.com/1", active: true, livemode: false, metadata: {} },
      { id: "plink_2", url: "https://buy.stripe.com/2", active: false, livemode: false, metadata: {} },
    ];
    mockFetch({ data: links });

    const result = await adapter.execute("list_payment_links", cred, { limit: 10, active: true });

    expect(result.data).toEqual({
      links: [
        { id: "plink_1", url: "https://buy.stripe.com/1", active: true },
        { id: "plink_2", url: "https://buy.stripe.com/2", active: false },
      ],
    });
  });

  it("list_payment_links sends query params", async () => {
    const fetchMock = mockFetch({ data: [] });

    await adapter.execute("list_payment_links", cred, { limit: 5, active: false });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("limit=5");
    expect(url).toContain("active=false");
  });

  it("get_payment_link retrieves by ID", async () => {
    const link = { id: "plink_abc", url: "https://buy.stripe.com/abc", active: true, livemode: false, metadata: {} };
    const fetchMock = mockFetch(link);

    const result = await adapter.execute("get_payment_link", cred, { id: "plink_abc" });

    expect(result.data).toEqual({ id: "plink_abc", url: "https://buy.stripe.com/abc", active: true });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/payment_links/plink_abc");
  });

  it("sends Authorization header with API key", async () => {
    const fetchMock = mockFetch({ data: [] });

    await adapter.execute("list_payment_links", cred, {});

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer sk_test_abc123");
  });

  it("throws on unknown operation", async () => {
    const err = await adapter.execute("nonexistent", cred, {}).catch((e: unknown) => e);
    expect((err as Error).message).toContain("Unknown operation");
  });
});
