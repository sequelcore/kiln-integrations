import { afterEach, describe, expect, it, vi } from "vitest";
import { adapter } from "../src/adapter.js";
import type { ResolvedCredential, ExecutionOptions } from "@kilnai/core";

const cred: ResolvedCredential = { type: "bearer", value: "ya29.test-token" };

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("google_calendar adapter", () => {
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

  it("check_availability calls freeBusy endpoint", async () => {
    const fetchMock = mockFetch({
      calendars: { primary: { busy: [{ start: "2026-03-10T09:00:00Z", end: "2026-03-10T10:00:00Z" }] } },
    });

    const result = await adapter.execute("check_availability", cred, {
      timeMin: "2026-03-10T08:00:00Z",
      timeMax: "2026-03-10T18:00:00Z",
    });

    expect(result.data).toEqual({
      busy: [{ start: "2026-03-10T09:00:00Z", end: "2026-03-10T10:00:00Z" }],
    });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/freeBusy");
  });

  it("list_events returns events array", async () => {
    const events = [{ id: "e1", summary: "Meeting" }];
    mockFetch({ items: events });

    const result = await adapter.execute("list_events", cred, {
      timeMin: "2026-03-10T00:00:00Z",
      maxResults: 5,
    });

    expect(result.data).toEqual({ events });
  });

  it("list_events returns empty array when no items", async () => {
    mockFetch({});

    const result = await adapter.execute("list_events", cred, {});
    expect(result.data).toEqual({ events: [] });
  });

  it("create_event sends event body to calendar", async () => {
    const created = { id: "new-event", summary: "Haircut", htmlLink: "https://calendar.google.com/..." };
    const fetchMock = mockFetch(created);

    const result = await adapter.execute("create_event", cred, {
      summary: "Haircut",
      startDateTime: "2026-03-11T15:00:00Z",
      endDateTime: "2026-03-11T16:00:00Z",
      location: "Barbershop",
    });

    expect(result.data).toEqual({ event: created });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/calendars/primary/events");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.summary).toBe("Haircut");
    expect(body.start.dateTime).toBe("2026-03-11T15:00:00Z");
    expect(body.location).toBe("Barbershop");
  });

  it("create_event handles all-day events", async () => {
    const fetchMock = mockFetch({ id: "ad1", summary: "Vacation" });

    await adapter.execute("create_event", cred, {
      summary: "Vacation",
      startDate: "2026-03-15",
      endDate: "2026-03-20",
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.start).toEqual({ date: "2026-03-15" });
    expect(body.end).toEqual({ date: "2026-03-20" });
  });

  it("create_event maps attendees to email objects", async () => {
    const fetchMock = mockFetch({ id: "e1", summary: "Sync" });

    await adapter.execute("create_event", cred, {
      summary: "Sync",
      startDateTime: "2026-03-11T10:00:00Z",
      attendees: ["a@example.com", "b@example.com"],
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.attendees).toEqual([{ email: "a@example.com" }, { email: "b@example.com" }]);
  });

  it("update_event sends PATCH with partial fields", async () => {
    const fetchMock = mockFetch({ id: "e1", summary: "Updated" });

    const result = await adapter.execute("update_event", cred, {
      eventId: "e1",
      summary: "Updated",
      startDateTime: "2026-03-11T16:00:00Z",
    });

    expect(result.data).toEqual({ event: { id: "e1", summary: "Updated" } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/events/e1");
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body as string);
    expect(body.summary).toBe("Updated");
    expect(body.start).toEqual({ dateTime: "2026-03-11T16:00:00Z" });
  });

  it("cancel_event sends DELETE", async () => {
    const fetchMock = mockFetch("", 200);

    const result = await adapter.execute("cancel_event", cred, { eventId: "e1" });

    expect(result.data).toEqual({ cancelled: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/events/e1");
    expect(init.method).toBe("DELETE");
  });

  it("uses custom calendarId when provided", async () => {
    const fetchMock = mockFetch({ items: [] });

    await adapter.execute("list_events", cred, { calendarId: "work@group.calendar.google.com" });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/calendars/work%40group.calendar.google.com/events");
  });

  it("passes AbortSignal from ExecutionOptions", async () => {
    const fetchMock = mockFetch({ calendars: { primary: { busy: [] } } });
    const controller = new AbortController();

    await adapter.execute("check_availability", cred, {
      timeMin: "2026-03-10T00:00:00Z",
      timeMax: "2026-03-10T23:59:59Z",
    }, { signal: controller.signal, timeoutMs: 30_000 } as ExecutionOptions);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });

  it("throws on unknown operation", async () => {
    const err = await adapter.execute("nonexistent", cred, {}).catch((e: unknown) => e);
    expect((err as Error).message).toContain("Unknown operation");
  });
});
