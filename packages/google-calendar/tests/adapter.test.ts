import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedCredential } from "@kilnai/core";

const mockQuery = vi.fn();
const mockList = vi.fn();
const mockInsert = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock("@googleapis/calendar", () => ({
  calendar_v3: {
    Calendar: vi.fn(() => ({
      freebusy: { query: mockQuery },
      events: { list: mockList, insert: mockInsert, patch: mockPatch, delete: mockDelete },
    })),
  },
  auth: {
    OAuth2: vi.fn(() => ({ setCredentials: vi.fn() })),
  },
}));

// Import after mock is set up
const { adapter } = await import("../src/adapter.js");

const cred: ResolvedCredential = { type: "bearer", value: "ya29.test-token" };

describe("google_calendar adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => vi.restoreAllMocks());

  it("has correct provider and 5 operations", () => {
    expect(adapter.provider).toBe("google_calendar");
    expect(adapter.operations).toHaveLength(5);
    expect(adapter.operations.map((o) => o.name)).toEqual([
      "check_availability",
      "list_events",
      "create_event",
      "update_event",
      "cancel_event",
    ]);
  });

  it("check_availability calls freebusy.query", async () => {
    mockQuery.mockResolvedValue({
      data: {
        calendars: { primary: { busy: [{ start: "2026-03-10T09:00:00Z", end: "2026-03-10T10:00:00Z" }] } },
      },
    });

    const result = await adapter.execute("check_availability", cred, {
      timeMin: "2026-03-10T08:00:00Z",
      timeMax: "2026-03-10T18:00:00Z",
    });

    expect(result.data).toEqual({
      busy: [{ start: "2026-03-10T09:00:00Z", end: "2026-03-10T10:00:00Z" }],
    });
    expect(mockQuery).toHaveBeenCalledWith({
      requestBody: {
        timeMin: "2026-03-10T08:00:00Z",
        timeMax: "2026-03-10T18:00:00Z",
        items: [{ id: "primary" }],
      },
    });
  });

  it("check_availability uses custom calendarId", async () => {
    mockQuery.mockResolvedValue({
      data: { calendars: { "work@group.calendar.google.com": { busy: [] } } },
    });

    await adapter.execute("check_availability", cred, {
      timeMin: "2026-03-10T00:00:00Z",
      timeMax: "2026-03-10T23:59:59Z",
      calendarId: "work@group.calendar.google.com",
    });

    expect(mockQuery).toHaveBeenCalledWith({
      requestBody: {
        timeMin: "2026-03-10T00:00:00Z",
        timeMax: "2026-03-10T23:59:59Z",
        items: [{ id: "work@group.calendar.google.com" }],
      },
    });
  });

  it("list_events returns events array", async () => {
    const events = [{ id: "e1", summary: "Meeting" }];
    mockList.mockResolvedValue({ data: { items: events } });

    const result = await adapter.execute("list_events", cred, {
      timeMin: "2026-03-10T00:00:00Z",
      maxResults: 5,
    });

    expect(result.data).toEqual({ events });
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({
      calendarId: "primary",
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 5,
    }));
  });

  it("list_events returns empty array when no items", async () => {
    mockList.mockResolvedValue({ data: {} });
    const result = await adapter.execute("list_events", cred, {});
    expect(result.data).toEqual({ events: [] });
  });

  it("create_event calls events.insert with event body", async () => {
    const created = { id: "new-event", summary: "Haircut", htmlLink: "https://calendar.google.com/..." };
    mockInsert.mockResolvedValue({ data: created });

    const result = await adapter.execute("create_event", cred, {
      summary: "Haircut",
      startDateTime: "2026-03-11T15:00:00Z",
      endDateTime: "2026-03-11T16:00:00Z",
      location: "Barbershop",
    });

    expect(result.data).toEqual({ event: created });
    expect(mockInsert).toHaveBeenCalledWith({
      calendarId: "primary",
      requestBody: expect.objectContaining({
        summary: "Haircut",
        start: { dateTime: "2026-03-11T15:00:00Z", timeZone: undefined },
        end: { dateTime: "2026-03-11T16:00:00Z", timeZone: undefined },
        location: "Barbershop",
      }),
    });
  });

  it("create_event handles all-day events", async () => {
    mockInsert.mockResolvedValue({ data: { id: "ad1", summary: "Vacation" } });

    await adapter.execute("create_event", cred, {
      summary: "Vacation",
      startDate: "2026-03-15",
      endDate: "2026-03-20",
    });

    expect(mockInsert).toHaveBeenCalledWith({
      calendarId: "primary",
      requestBody: expect.objectContaining({
        start: { date: "2026-03-15" },
        end: { date: "2026-03-20" },
      }),
    });
  });

  it("create_event maps attendees to email objects", async () => {
    mockInsert.mockResolvedValue({ data: { id: "e1" } });

    await adapter.execute("create_event", cred, {
      summary: "Sync",
      startDateTime: "2026-03-11T10:00:00Z",
      attendees: ["a@example.com", "b@example.com"],
    });

    expect(mockInsert).toHaveBeenCalledWith({
      calendarId: "primary",
      requestBody: expect.objectContaining({
        attendees: [{ email: "a@example.com" }, { email: "b@example.com" }],
      }),
    });
  });

  it("update_event calls events.patch with partial fields", async () => {
    mockPatch.mockResolvedValue({ data: { id: "e1", summary: "Updated" } });

    const result = await adapter.execute("update_event", cred, {
      eventId: "e1",
      summary: "Updated",
      startDateTime: "2026-03-11T16:00:00Z",
    });

    expect(result.data).toEqual({ event: { id: "e1", summary: "Updated" } });
    expect(mockPatch).toHaveBeenCalledWith({
      calendarId: "primary",
      eventId: "e1",
      requestBody: {
        summary: "Updated",
        start: { dateTime: "2026-03-11T16:00:00Z" },
      },
    });
  });

  it("cancel_event calls events.delete", async () => {
    mockDelete.mockResolvedValue({});

    const result = await adapter.execute("cancel_event", cred, { eventId: "e1" });

    expect(result.data).toEqual({ cancelled: true });
    expect(mockDelete).toHaveBeenCalledWith({
      calendarId: "primary",
      eventId: "e1",
    });
  });

  it("throws on unknown operation", async () => {
    const err = await adapter.execute("nonexistent", cred, {}).catch((e: unknown) => e);
    expect((err as Error).message).toContain("Unknown operation");
  });
});
