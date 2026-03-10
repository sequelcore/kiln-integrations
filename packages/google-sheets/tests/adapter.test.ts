import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedCredential } from "@kilnai/core";

const mockGet = vi.fn();
const mockAppend = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@googleapis/sheets", () => ({
  sheets_v4: {
    Sheets: vi.fn(() => ({
      spreadsheets: {
        values: { get: mockGet, append: mockAppend, update: mockUpdate },
      },
    })),
  },
  auth: {
    OAuth2: vi.fn(() => ({ setCredentials: vi.fn() })),
  },
}));

const { adapter } = await import("../src/adapter.js");

const cred: ResolvedCredential = { type: "bearer", value: "ya29.sheets-token" };

describe("google_sheets adapter", () => {
  beforeEach(() => vi.clearAllMocks());
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

  it("read_range calls spreadsheets.values.get", async () => {
    const values = [["Name", "Age"], ["Alice", "30"]];
    mockGet.mockResolvedValue({ data: { values } });

    const result = await adapter.execute("read_range", cred, {
      spreadsheetId: "abc123",
      range: "Sheet1!A1:B2",
    });

    expect(result.data).toEqual({ values });
    expect(mockGet).toHaveBeenCalledWith({
      spreadsheetId: "abc123",
      range: "Sheet1!A1:B2",
    });
  });

  it("read_range returns empty array when no values", async () => {
    mockGet.mockResolvedValue({ data: {} });

    const result = await adapter.execute("read_range", cred, {
      spreadsheetId: "abc123",
      range: "Sheet1!A1:A1",
    });

    expect(result.data).toEqual({ values: [] });
  });

  it("append_rows calls spreadsheets.values.append with USER_ENTERED", async () => {
    mockAppend.mockResolvedValue({
      data: {
        updates: {
          updatedRange: "Sheet1!A4:B5",
          updatedRows: 2,
          updatedColumns: 2,
          updatedCells: 4,
        },
      },
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
    expect(mockAppend).toHaveBeenCalledWith({
      spreadsheetId: "abc123",
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [["Charlie", "35"], ["Dave", "40"]] },
    });
  });

  it("update_range calls spreadsheets.values.update", async () => {
    mockUpdate.mockResolvedValue({
      data: {
        updatedRange: "Sheet1!A1:B1",
        updatedRows: 1,
        updatedColumns: 2,
        updatedCells: 2,
      },
    });

    const result = await adapter.execute("update_range", cred, {
      spreadsheetId: "abc123",
      range: "Sheet1!A1:B1",
      values: [["Updated", "Value"]],
    });

    expect(result.data).toEqual({
      updatedRange: "Sheet1!A1:B1",
      updatedRows: 1,
      updatedColumns: 2,
      updatedCells: 2,
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      spreadsheetId: "abc123",
      range: "Sheet1!A1:B1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["Updated", "Value"]] },
    });
  });

  it("throws on unknown operation", async () => {
    const err = await adapter.execute("nonexistent", cred, {
      spreadsheetId: "x",
      range: "A1",
    }).catch((e: unknown) => e);
    expect((err as Error).message).toContain("Unknown operation");
  });
});
