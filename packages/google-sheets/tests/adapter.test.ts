import { afterEach, describe, expect, it, vi } from "vitest";
import { adapter } from "../src/adapter.js";
import type { ResolvedCredential } from "@kilnai/core";

const cred: ResolvedCredential = { type: "bearer", value: "ya29.sheets-token" };

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("google_sheets adapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("has correct provider and 3 operations", () => {
    expect(adapter.provider).toBe("google_sheets");
    expect(adapter.operations).toHaveLength(3);
    expect(adapter.operations.map((o) => o.name)).toEqual([
      "read_range",
      "append_rows",
      "update_range",
    ]);
  });

  it("read_range returns values from spreadsheet", async () => {
    const values = [["Name", "Age"], ["Alice", "30"], ["Bob", "25"]];
    const fetchMock = mockFetch({ values });

    const result = await adapter.execute("read_range", cred, {
      spreadsheetId: "abc123",
      range: "Sheet1!A1:B3",
    });

    expect(result.data).toEqual({ values });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/spreadsheets/abc123/values/Sheet1!A1%3AB3");
  });

  it("read_range returns empty array when no values", async () => {
    mockFetch({});

    const result = await adapter.execute("read_range", cred, {
      spreadsheetId: "abc123",
      range: "Sheet1!A1:A1",
    });

    expect(result.data).toEqual({ values: [] });
  });

  it("append_rows sends POST with values and USER_ENTERED", async () => {
    const fetchMock = mockFetch({
      updates: { updatedRange: "Sheet1!A4:B5", updatedRows: 2, updatedColumns: 2, updatedCells: 4 },
    });

    const result = await adapter.execute("append_rows", cred, {
      spreadsheetId: "abc123",
      range: "Sheet1!A1",
      values: [["Charlie", "35"], ["Dave", "40"]],
    });

    expect(result.data).toEqual({
      updatedRange: "Sheet1!A4:B5",
      updatedRows: 2,
      updatedColumns: 2,
      updatedCells: 4,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(":append");
    expect(url).toContain("valueInputOption=USER_ENTERED");
    expect(url).toContain("insertDataOption=INSERT_ROWS");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.values).toEqual([["Charlie", "35"], ["Dave", "40"]]);
  });

  it("update_range sends PUT with values", async () => {
    const fetchMock = mockFetch({ range: "Sheet1!A1:B1", values: [["Updated", "Value"]] });

    const result = await adapter.execute("update_range", cred, {
      spreadsheetId: "abc123",
      range: "Sheet1!A1:B1",
      values: [["Updated", "Value"]],
    });

    expect(result.data).toEqual({ range: "Sheet1!A1:B1", values: [["Updated", "Value"]] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("valueInputOption=USER_ENTERED");
    expect(init.method).toBe("PUT");
  });

  it("sends Authorization header", async () => {
    const fetchMock = mockFetch({ values: [] });

    await adapter.execute("read_range", cred, { spreadsheetId: "x", range: "A1" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer ya29.sheets-token");
  });

  it("throws on unknown operation", async () => {
    const err = await adapter.execute("nonexistent", cred, {
      spreadsheetId: "x",
      range: "A1",
    }).catch((e: unknown) => e);
    expect((err as Error).message).toContain("Unknown operation");
  });
});
