import { apiFetch } from "./api-client";
import { isRecord, asString, unwrapResults } from "./type-utils";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  eventType: "meeting" | "reminder" | "deadline";
  startsAt: string;
  endsAt: string;
  executive: string;
  executiveName?: string;
  correspondence?: string | null;
  createdAt: string;
  updatedAt: string;
}

const mapEvent = (row: Record<string, unknown>): CalendarEvent => ({
  id: asString(row.id),
  title: asString(row.title),
  description: asString(row.description, ""),
  location: asString(row.location, ""),
  eventType: (asString(row.event_type, "meeting") as CalendarEvent["eventType"]),
  startsAt: asString(row.starts_at),
  endsAt: asString(row.ends_at),
  executive: asString(row.executive),
  executiveName: row.executive_name ? asString(row.executive_name) : undefined,
  correspondence: row.correspondence ? asString(row.correspondence) : null,
  createdAt: asString(row.created_at),
  updatedAt: asString(row.updated_at),
});

export async function fetchCalendarEvents(params?: {
  executive?: string;
  from?: string;
  to?: string;
}): Promise<CalendarEvent[]> {
  const query = new URLSearchParams();
  if (params?.executive) query.set("executive", params.executive);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await apiFetch<unknown>(`/organization/calendar-events/${suffix}`);
  const rows = unwrapResults(response);
  return rows.filter(isRecord).map(mapEvent);
}

export async function createCalendarEvent(data: {
  title: string;
  description?: string;
  location?: string;
  event_type?: CalendarEvent["eventType"];
  starts_at: string;
  ends_at: string;
  executive: string;
  correspondence?: string;
}): Promise<CalendarEvent> {
  const response = await apiFetch<Record<string, unknown>>("/organization/calendar-events/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return mapEvent(response);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await apiFetch<void>(`/organization/calendar-events/${id}/`, { method: "DELETE" });
}
