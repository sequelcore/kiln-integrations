import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedCredential } from "@kilnai/core";

const mockCreate = vi.fn();
const mockList = vi.fn();
const mockRetrieve = vi.fn();

vi.mock("stripe", () => ({
  default: vi.fn(() => ({
    paymentLinks: {
      create: mockCreate,
      list: mockList,
      retrieve: mockRetrieve,
    },
  })),
}));

const { adapter } = await import("../src/adapter.js");

const cred: ResolvedCredential = { type: "bearer", value: "sk_test_abc123" };

describe("stripe adapter", () => {
  beforeEach(() => vi.clearAllMocks());
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

  it("create_payment_link calls stripe.paymentLinks.create", async () => {
    mockCreate.mockResolvedValue({
      id: "plink_abc",
      url: "https://buy.stripe.com/test",
      active: true,
    });

    const result = await adapter.execute("create_payment_link", cred, {
      lineItems: [{ price: "price_abc", quantity: 2 }],
    });

    expect(result.data).toEqual({
      id: "plink_abc",
      url: "https://buy.stripe.com/test",
      active: true,
    });
    expect(mockCreate).toHaveBeenCalledWith({
      line_items: [{ price: "price_abc", quantity: 2 }],
    });
  });

  it("create_payment_link includes metadata and after_completion redirect", async () => {
    mockCreate.mockResolvedValue({ id: "plink_x", url: "https://buy.stripe.com/x", active: true });

    await adapter.execute("create_payment_link", cred, {
      lineItems: [{ price: "price_1", quantity: 1 }],
      metadata: { orderId: "ord_123" },
      afterCompletionType: "redirect",
      afterCompletionRedirectUrl: "https://example.com/thanks",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      line_items: [{ price: "price_1", quantity: 1 }],
      metadata: { orderId: "ord_123" },
      after_completion: {
        type: "redirect",
        redirect: { url: "https://example.com/thanks" },
      },
    });
  });

  it("create_payment_link handles hosted_confirmation", async () => {
    mockCreate.mockResolvedValue({ id: "plink_y", url: "https://buy.stripe.com/y", active: true });

    await adapter.execute("create_payment_link", cred, {
      lineItems: [{ price: "price_1", quantity: 1 }],
      afterCompletionType: "hosted_confirmation",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      line_items: [{ price: "price_1", quantity: 1 }],
      after_completion: { type: "hosted_confirmation" },
    });
  });

  it("list_payment_links returns array", async () => {
    mockList.mockResolvedValue({
      data: [
        { id: "plink_1", url: "https://buy.stripe.com/1", active: true },
        { id: "plink_2", url: "https://buy.stripe.com/2", active: false },
      ],
    });

    const result = await adapter.execute("list_payment_links", cred, { limit: 10, active: true });

    expect(result.data).toEqual({
      links: [
        { id: "plink_1", url: "https://buy.stripe.com/1", active: true },
        { id: "plink_2", url: "https://buy.stripe.com/2", active: false },
      ],
    });
    expect(mockList).toHaveBeenCalledWith({ limit: 10, active: true });
  });

  it("get_payment_link retrieves by ID", async () => {
    mockRetrieve.mockResolvedValue({
      id: "plink_abc",
      url: "https://buy.stripe.com/abc",
      active: true,
    });

    const result = await adapter.execute("get_payment_link", cred, { id: "plink_abc" });

    expect(result.data).toEqual({ id: "plink_abc", url: "https://buy.stripe.com/abc", active: true });
    expect(mockRetrieve).toHaveBeenCalledWith("plink_abc");
  });

  it("throws on unknown operation", async () => {
    const err = await adapter.execute("nonexistent", cred, {}).catch((e: unknown) => e);
    expect((err as Error).message).toContain("Unknown operation");
  });
});
