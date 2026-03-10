import type { IntegrationAdapter, IntegrationResult, ResolvedCredential, ExecutionOptions } from "@kilnai/core";
import { GoogleSheetsApi } from "./api.js";

export const adapter: IntegrationAdapter = {
  provider: "google_sheets",
  version: "0.1.0",
  operations: [
    {
      name: "read_range",
      description: "Read values from a range in a Google Sheets spreadsheet",
      inputSchema: {
        type: "object",
        properties: {
          spreadsheetId: { type: "string", description: "Google Sheets spreadsheet ID" },
          range: { type: "string", description: "A1 notation range (e.g. Sheet1!A1:D10)" },
        },
        required: ["spreadsheetId", "range"],
      },
    },
    {
      name: "append_rows",
      description: "Append rows of data to a Google Sheets spreadsheet",
      inputSchema: {
        type: "object",
        properties: {
          spreadsheetId: { type: "string", description: "Google Sheets spreadsheet ID" },
          range: { type: "string", description: "A1 notation range to append after (e.g. Sheet1!A1)" },
          values: {
            type: "array",
            description: "Rows to append, each row is an array of cell values",
            items: { type: "array", items: {} },
          },
        },
        required: ["spreadsheetId", "range", "values"],
      },
    },
    {
      name: "update_range",
      description: "Update values in a specific range of a Google Sheets spreadsheet",
      inputSchema: {
        type: "object",
        properties: {
          spreadsheetId: { type: "string", description: "Google Sheets spreadsheet ID" },
          range: { type: "string", description: "A1 notation range to update (e.g. Sheet1!A1:B2)" },
          values: {
            type: "array",
            description: "New values for the range, each row is an array of cell values",
            items: { type: "array", items: {} },
          },
        },
        required: ["spreadsheetId", "range", "values"],
      },
    },
  ],

  async execute(
    operation: string,
    credentials: ResolvedCredential,
    input: Record<string, unknown>,
    _options?: ExecutionOptions,
  ): Promise<IntegrationResult> {
    const api = new GoogleSheetsApi(credentials);
    const spreadsheetId = input.spreadsheetId as string;
    const range = input.range as string;

    switch (operation) {
      case "read_range": {
        const values = await api.readRange(spreadsheetId, range);
        return { data: { values } };
      }

      case "append_rows": {
        const result = await api.appendRows(spreadsheetId, range, input.values as unknown[][]);
        const updates = result.updates;
        return {
          data: {
            updatedRange: updates?.updatedRange,
            updatedRows: updates?.updatedRows,
            updatedColumns: updates?.updatedColumns,
            updatedCells: updates?.updatedCells,
          },
        };
      }

      case "update_range": {
        const result = await api.updateRange(spreadsheetId, range, input.values as unknown[][]);
        return {
          data: {
            updatedRange: result.updatedRange,
            updatedRows: result.updatedRows,
            updatedColumns: result.updatedColumns,
            updatedCells: result.updatedCells,
          },
        };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
};
