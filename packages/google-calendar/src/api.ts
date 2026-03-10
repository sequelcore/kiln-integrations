import type { ResolvedCredential } from "@kilnai/core";
import { buildAuthHeaders, fetchJson, type HttpRequestOptions } from "@kilnai/integration-shared";

const BASE_URL = "https://www.googleapis.com/calendar/v3";

export interface FreeBusyRequest {
  timeMin: string;
  timeMax: string;
  calendarId?: string;
}

export interface FreeBusySlot {
  start: string;
  end: string;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  status?: string;
  htmlLink?: string;
}

export interface EventListParams {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  query?: string;
}

export class GoogleCalendarApi {
  private readonly headers: Record<string, string>;

  constructor(
    credential: ResolvedCredential,
    private readonly signal?: AbortSignal,
  ) {
    this.headers = buildAuthHeaders(credential);
  }

  async checkAvailability(params: FreeBusyRequest): Promise<FreeBusySlot[]> {
    const calendarId = params.calendarId ?? "primary";
    const body = {
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      items: [{ id: calendarId }],
    };
    const res = await this.post<{ calendars: Record<string, { busy: FreeBusySlot[] }> }>(
      `${BASE_URL}/freeBusy`,
      body,
    );
    return res.calendars[calendarId]?.busy ?? [];
  }

  async listEvents(params: EventListParams): Promise<CalendarEvent[]> {
    const calendarId = params.calendarId ?? "primary";
    const query = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      ...(params.timeMin && { timeMin: params.timeMin }),
      ...(params.timeMax && { timeMax: params.timeMax }),
      ...(params.maxResults && { maxResults: String(params.maxResults) }),
      ...(params.query && { q: params.query }),
    });
    const res = await this.get<{ items?: CalendarEvent[] }>(
      `${BASE_URL}/calendars/${enc(calendarId)}/events?${query}`,
    );
    return res.items ?? [];
  }

  async createEvent(calendarId: string, event: Record<string, unknown>): Promise<CalendarEvent> {
    return this.post<CalendarEvent>(
      `${BASE_URL}/calendars/${enc(calendarId)}/events`,
      event,
    );
  }

  async updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(
      `${BASE_URL}/calendars/${enc(calendarId)}/events/${enc(eventId)}`,
      { method: "PATCH", body: event },
    );
  }

  async cancelEvent(calendarId: string, eventId: string): Promise<void> {
    await this.request<void>(
      `${BASE_URL}/calendars/${enc(calendarId)}/events/${enc(eventId)}`,
      { method: "DELETE" },
    );
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
