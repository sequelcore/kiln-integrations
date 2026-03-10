import type { ResolvedCredential } from "@kilnai/core";
import { buildAuthHeaders, fetchJson, type HttpRequestOptions } from "@kilnai/integration-shared";

const BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";

export interface SheetValues {
  range: string;
  values: unknown[][];
}

export interface AppendResult {
  updatedRange: string;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
}

export class GoogleSheetsApi {
  private readonly headers: Record<string, string>;

  constructor(
    credential: ResolvedCredential,
    private readonly signal?: AbortSignal,
  ) {
    this.headers = buildAuthHeaders(credential);
  }

  async readRange(spreadsheetId: string, range: string): Promise<unknown[][]> {
    const url = `${BASE_URL}/${enc(spreadsheetId)}/values/${enc(range)}`;
    const res = await this.get<{ values?: unknown[][] }>(url);
    return res.values ?? [];
  }

  async appendRows(spreadsheetId: string, range: string, values: unknown[][]): Promise<AppendResult> {
    const url = `${BASE_URL}/${enc(spreadsheetId)}/values/${enc(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const res = await this.post<{ updates: AppendResult }>(url, { values });
    return res.updates;
  }

  async updateRange(spreadsheetId: string, range: string, values: unknown[][]): Promise<SheetValues> {
    const url = `${BASE_URL}/${enc(spreadsheetId)}/values/${enc(range)}?valueInputOption=USER_ENTERED`;
    return this.request<SheetValues>(url, { method: "PUT", body: { values } });
  }

  private get<T>(url: string): Promise<T> {
    return this.request<T>(url, {});
  }

  private post<T>(url: string, body: unknown): Promise<T> {
    return this.request<T>(url, { method: "POST", body });
  }

  private request<T>(url: string, options: Omit<HttpRequestOptions, "headers" | "signal">): Promise<T> {
    return fetchJson<T>(url, { ...options, headers: this.headers, signal: this.signal });
  }
}

function enc(s: string): string {
  return encodeURIComponent(s);
}
