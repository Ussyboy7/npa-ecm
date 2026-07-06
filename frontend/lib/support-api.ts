import { apiFetch } from "./api-client";
import { unwrapResults } from "./type-utils";

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export async function fetchSupportTickets(params?: {
  status?: string;
  mine?: boolean;
}): Promise<SupportTicket[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await apiFetch<unknown>(`/support/tickets/${suffix}`);
  const tickets = unwrapResults(response) as SupportTicket[];
  if (params?.mine) {
    // API returns all for staff; client filter if needed
    return tickets;
  }
  return tickets;
}

export async function createSupportTicket(data: {
  subject: string;
  description: string;
  priority?: SupportTicket["priority"];
}): Promise<SupportTicket> {
  return apiFetch<SupportTicket>("/support/tickets/", {
    method: "POST",
    body: JSON.stringify({
      subject: data.subject,
      description: data.description,
      priority: data.priority ?? "medium",
    }),
  });
}

export async function resolveSupportTicket(
  id: string,
  resolution_notes: string,
): Promise<SupportTicket> {
  return apiFetch<SupportTicket>(`/support/tickets/${id}/resolve/`, {
    method: "POST",
    body: JSON.stringify({ resolution_notes }),
  });
}
