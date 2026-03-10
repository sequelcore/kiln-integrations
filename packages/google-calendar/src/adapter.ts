import type { IntegrationAdapter, IntegrationResult, ResolvedCredential, ExecutionOptions } from "@kilnai/core";
import type { calendar_v3 } from "@googleapis/calendar";
import { GoogleCalendarApi } from "./api.js";

export const adapter: IntegrationAdapter = {
  provider: "google_calendar",
  version: "0.1.0",
  operations: [
    {
      name: "check_availability",
      description: "Check free/busy status for a time range on a Google Calendar",
      inputSchema: {
        type: "object",
        properties: {
          timeMin: { type: "string", description: "Start of the time range (ISO 8601 datetime)" },
          timeMax: { type: "string", description: "End of the time range (ISO 8601 datetime)" },
          calendarId: { type: "string", description: "Calendar ID (defaults to primary)" },
        },
        required: ["timeMin", "timeMax"],
      },
    },
    {
      name: "list_events",
      description: "List upcoming events from a Google Calendar",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", description: "Calendar ID (defaults to primary)" },
          timeMin: { type: "string", description: "Filter events starting after this time (ISO 8601)" },
          timeMax: { type: "string", description: "Filter events starting before this time (ISO 8601)" },
          maxResults: { type: "number", description: "Maximum number of events to return (default 10)" },
          query: { type: "string", description: "Free text search query" },
        },
      },
    },
    {
      name: "create_event",
      description: "Create a new event on a Google Calendar",
      inputSchema: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Event title" },
          startDateTime: { type: "string", description: "Start time (ISO 8601 datetime)" },
          endDateTime: { type: "string", description: "End time (ISO 8601 datetime)" },
          startDate: { type: "string", description: "Start date for all-day events (YYYY-MM-DD)" },
          endDate: { type: "string", description: "End date for all-day events (YYYY-MM-DD)" },
          description: { type: "string", description: "Event description" },
          location: { type: "string", description: "Event location" },
          timeZone: { type: "string", description: "Time zone (e.g. America/Los_Angeles)" },
          attendees: { type: "array", items: { type: "string" }, description: "Attendee email addresses" },
          calendarId: { type: "string", description: "Calendar ID (defaults to primary)" },
        },
        required: ["summary"],
      },
    },
    {
      name: "update_event",
      description: "Update an existing event on a Google Calendar",
      inputSchema: {
        type: "object",
        properties: {
          eventId: { type: "string", description: "Event ID to update" },
          summary: { type: "string", description: "New event title" },
          startDateTime: { type: "string", description: "New start time (ISO 8601 datetime)" },
          endDateTime: { type: "string", description: "New end time (ISO 8601 datetime)" },
          description: { type: "string", description: "New event description" },
          location: { type: "string", description: "New event location" },
          calendarId: { type: "string", description: "Calendar ID (defaults to primary)" },
        },
        required: ["eventId"],
      },
    },
    {
      name: "cancel_event",
      description: "Cancel (delete) an event from a Google Calendar",
      inputSchema: {
        type: "object",
        properties: {
          eventId: { type: "string", description: "Event ID to cancel" },
          calendarId: { type: "string", description: "Calendar ID (defaults to primary)" },
        },
        required: ["eventId"],
      },
    },
  ],

  async execute(
    operation: string,
    credentials: ResolvedCredential,
    input: Record<string, unknown>,
    _options?: ExecutionOptions,
  ): Promise<IntegrationResult> {
    const api = new GoogleCalendarApi(credentials);

    switch (operation) {
      case "check_availability": {
        const busy = await api.checkAvailability(
          input.timeMin as string,
          input.timeMax as string,
          input.calendarId as string | undefined,
        );
        return { data: { busy } };
      }

      case "list_events": {
        const events = await api.listEvents({
          calendarId: input.calendarId as string | undefined,
          timeMin: input.timeMin as string | undefined,
          timeMax: input.timeMax as string | undefined,
          maxResults: input.maxResults as number | undefined,
          query: input.query as string | undefined,
        });
        return { data: { events } };
      }

      case "create_event": {
        const calendarId = (input.calendarId as string | undefined) ?? "primary";
        const event = await api.createEvent(calendarId, buildEventBody(input));
        return { data: { event } };
      }

      case "update_event": {
        const calendarId = (input.calendarId as string | undefined) ?? "primary";
        const eventId = input.eventId as string;
        const patch: calendar_v3.Schema$Event = {};
        if (input.summary) patch.summary = input.summary as string;
        if (input.description !== undefined) patch.description = input.description as string;
        if (input.location !== undefined) patch.location = input.location as string;
        if (input.startDateTime) patch.start = { dateTime: input.startDateTime as string };
        if (input.endDateTime) patch.end = { dateTime: input.endDateTime as string };
        const event = await api.updateEvent(calendarId, eventId, patch);
        return { data: { event } };
      }

      case "cancel_event": {
        const calendarId = (input.calendarId as string | undefined) ?? "primary";
        await api.cancelEvent(calendarId, input.eventId as string);
        return { data: { cancelled: true } };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
};

function buildEventBody(input: Record<string, unknown>): calendar_v3.Schema$Event {
  const event: calendar_v3.Schema$Event = { summary: input.summary as string };

  if (input.startDateTime) {
    event.start = { dateTime: input.startDateTime as string, timeZone: input.timeZone as string | undefined };
    event.end = {
      dateTime: (input.endDateTime ?? input.startDateTime) as string,
      timeZone: input.timeZone as string | undefined,
    };
  } else if (input.startDate) {
    event.start = { date: input.startDate as string };
    event.end = { date: (input.endDate ?? input.startDate) as string };
  }

  if (input.description) event.description = input.description as string;
  if (input.location) event.location = input.location as string;
  if (input.attendees) {
    event.attendees = (input.attendees as string[]).map((email) => ({ email }));
  }

  return event;
}
