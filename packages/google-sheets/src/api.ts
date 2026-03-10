import { sheets_v4, auth as googleAuth } from "@googleapis/sheets";
import type { ResolvedCredential } from "@kilnai/core";

export class GoogleSheetsApi {
  private readonly client: sheets_v4.Sheets;

  constructor(credential: ResolvedCredential) {
    const oauth2 = new googleAuth.OAuth2();
    oauth2.setCredentials({ access_token: credential.value });
    this.client = new sheets_v4.Sheets({ auth: oauth2 });
  }

  async readRange(spreadsheetId: string, range: string): Promise<unknown[][]> {
    const res = await this.client.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return res.data.values ?? [];
  }

  async appendRows(spreadsheetId: string, range: string, values: unknown[][]): Promise<sheets_v4.Schema$AppendValuesResponse> {
    const res = await this.client.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });
    return res.data;
  }

  async updateRange(spreadsheetId: string, range: string, values: unknown[][]): Promise<sheets_v4.Schema$UpdateValuesResponse> {
    const res = await this.client.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    return res.data;
  }
}
