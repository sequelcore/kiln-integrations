import { calendar_v3, auth as googleAuth } from "@googleapis/calendar";
import type { ResolvedCredential } from "@kilnai/core";

export type CalendarEvent = calendar_v3.Schema$Event;
export type FreeBusySlot = calendar_v3.Schema$TimePeriod;

export class GoogleCalendarApi {
  private readonly client: calendar_v3.Calendar;

  constructor(credential: ResolvedCredential) {
    const oauth2 = new googleAuth.OAuth2();
    oauth2.setCredentials({ access_token: credential.value });
    this.client = new calendar_v3.Calendar({ auth: oauth2 });
  }

  async checkAvailability(timeMin: string, timeMax: string, calendarId = "primary"): Promise<FreeBusySlot[]> {
    const res = await this.client.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: calendarId }],
      },
    });
    return res.data.calendars?.[calendarId]?.busy ?? [];
  }

  async listEvents(params: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    query?: string;
  }): Promise<CalendarEvent[]> {
    const res = await this.client.events.list({
      calendarId: params.calendarId ?? "primary",
      timeMin: params.timeMin ?? undefined,
      timeMax: params.timeMax ?? undefined,
      maxResults: params.maxResults ?? undefined,
      q: params.query ?? undefined,
      singleEvents: true,
      orderBy: "startTime",
    });
    return res.data.items ?? [];
  }

  async createEvent(calendarId: string, event: calendar_v3.Schema$Event): Promise<CalendarEvent> {
    const res = await this.client.events.insert({
      calendarId,
      requestBody: event,
    });
    return res.data;
  }

  async updateEvent(calendarId: string, eventId: string, event: calendar_v3.Schema$Event): Promise<CalendarEvent> {
    const res = await this.client.events.patch({
      calendarId,
      eventId,
      requestBody: event,
    });
    return res.data;
  }

  async cancelEvent(calendarId: string, eventId: string): Promise<void> {
    await this.client.events.delete({ calendarId, eventId });
  }
}
