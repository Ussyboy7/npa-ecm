"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatStrip } from "@/components/shared/StatStrip";
import { LifeBuoy, Search } from "lucide-react";
import { toast } from "sonner";
import { fetchSupportTickets, resolveSupportTicket, type SupportTicket } from "@/lib/support-api";

export default function AdminHelpdeskPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setTickets(await fetchSupportTickets());
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tickets, searchQuery, statusFilter]);

  return (
    <AdminPageShell title="Support Queue" subtitle="Tier-1 ticket triage and resolution." icon={LifeBuoy}>
      <div className="space-y-6">
        <StatStrip
          items={[
            { key: "total", label: "Total Tickets", value: tickets.length },
            { key: "open", label: "Open", value: tickets.filter((t) => t.status === "open").length },
            { key: "progress", label: "In Progress", value: tickets.filter((t) => t.status === "in-progress").length },
            {
              key: "resolved",
              label: "Resolved",
              value: tickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
            },
          ]}
        />

        {/* Filter bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Ticket list */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            {filteredTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {searchQuery.trim() || statusFilter !== "all" ? "No tickets match your filters." : "No tickets."}
              </p>
            ) : (
              filteredTickets.map((ticket) => (
                <div key={ticket.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{ticket.subject}</span>
                    <Badge variant="outline">{ticket.status}</Badge>
                    <Badge variant="secondary">{ticket.priority}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{ticket.description}</p>
                  {ticket.status !== "resolved" && ticket.status !== "closed" && (
                    <>
                      <Textarea
                        placeholder="Resolution notes"
                        value={notes[ticket.id] ?? ""}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                        rows={2}
                      />
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await resolveSupportTicket(ticket.id, notes[ticket.id] ?? "Resolved");
                            toast.success("Ticket resolved");
                            await load();
                          } catch {
                            toast.error("Failed to resolve");
                          }
                        }}
                      >
                        Resolve
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
