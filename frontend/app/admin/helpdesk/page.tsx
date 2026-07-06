"use client";

import { useEffect, useState } from "react";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { fetchSupportTickets, resolveSupportTicket, type SupportTicket } from "@/lib/support-api";

export default function AdminHelpdeskPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setTickets(await fetchSupportTickets());
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminPageShell title="Support Queue" subtitle="Tier-1 ticket triage and resolution." icon={LifeBuoy}>
      <Card>
        <CardContent className="pt-6 space-y-3">
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets.</p>
          ) : (
            tickets.map((ticket) => (
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
    </AdminPageShell>
  );
}
