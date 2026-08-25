"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrgUsers } from "@/hooks/use-org-users";
import { formatDateTime } from "@/lib/correspondence-helpers";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvents,
  type CalendarEvent,
} from "@/lib/calendar-api";
import { logError } from "@/lib/client-logger";
import { appType } from "@/lib/app-type";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AssistantCalendarPage() {
  const { currentUser } = useCurrentUser();
  const { assistantAssignments } = useOrganization();
  const { users } = useOrgUsers();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExecutive, setSelectedExecutive] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    event_type: "meeting" as CalendarEvent["eventType"],
    starts_at: "",
    ends_at: "",
  });

  const executiveOptions = useMemo(() => {
    if (!currentUser) return [];
    const ids = new Set<string>([currentUser.id]);
    assistantAssignments
      .filter((a) => a.assistantId === currentUser.id && a.permissions.includes("schedule"))
      .forEach((a) => ids.add(a.executiveId));
    return users.filter((u) => ids.has(u.id));
  }, [assistantAssignments, currentUser, users]);

  const loadEvents = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const executive = selectedExecutive || currentUser.id;
      const now = new Date();
      const horizon = new Date(now);
      horizon.setDate(horizon.getDate() + 60);
      const data = await fetchCalendarEvents({
        executive,
        from: now.toISOString(),
        to: horizon.toISOString(),
      });
      setEvents(data);
    } catch (error) {
      logError("Failed to load calendar events", error);
      toast.error("Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedExecutive]);

  useEffect(() => {
    if (!currentUser) return;
    if (!selectedExecutive && executiveOptions.length > 0) {
      setSelectedExecutive(executiveOptions[0].id);
      return;
    }
    void loadEvents();
  }, [currentUser, executiveOptions, loadEvents, selectedExecutive]);

  const openCreate = () => {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    setForm({
      title: "",
      description: "",
      location: "",
      event_type: "meeting",
      starts_at: toLocalInputValue(start),
      ends_at: toLocalInputValue(end),
    });
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    const executive = selectedExecutive || currentUser?.id;
    if (!executive || !form.title.trim()) {
      toast.error("Title and executive are required");
      return;
    }
    try {
      await createCalendarEvent({
        title: form.title.trim(),
        description: form.description,
        location: form.location,
        event_type: form.event_type,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        executive,
      });
      toast.success("Event scheduled");
      setDialogOpen(false);
      await loadEvents();
    } catch (error) {
      logError("Failed to create calendar event", error);
      toast.error("Failed to create event");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={`${appType.pageTitleList} flex items-center gap-2`}>
            <CalendarDays className="h-5 w-5 text-primary" />
            PA Calendar
          </h1>
          <p className={appType.pageSubtitle}>
            Schedule meetings and reminders for executives you support.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadEvents()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New event
          </Button>
        </div>
      </div>

      {executiveOptions.length > 1 && (
        <div className="rounded-xl bg-muted/30 p-2">
          <Label className="text-xs text-muted-foreground px-1">Executive</Label>
          <Select value={selectedExecutive} onValueChange={setSelectedExecutive}>
            <SelectTrigger className="mt-1 max-w-sm h-8 text-xs">
              <SelectValue placeholder="Select executive" />
            </SelectTrigger>
            <SelectContent>
              {executiveOptions.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="rounded-xl border border-border/60">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className={appType.panelTitle}>Upcoming events (60 days)</h2>
        </div>
        <div className="space-y-3 p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading events…</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming events.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-3 border rounded-lg p-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{event.title}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {event.eventType}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.startsAt)} → {formatDateTime(event.endsAt)}
                  </p>
                  {event.location ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </p>
                  ) : null}
                  {event.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={async () => {
                    try {
                      await deleteCalendarEvent(event.id);
                      toast.success("Event removed");
                      await loadEvents();
                    } catch (_error) {
                      toast.error("Failed to delete event");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="event-type">Type</Label>
              <Select
                value={form.event_type}
                onValueChange={(value: CalendarEvent["eventType"]) =>
                  setForm((prev) => ({ ...prev, event_type: value }))
                }
              >
                <SelectTrigger id="event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="starts-at">Starts</Label>
                <Input
                  id="starts-at"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, starts_at: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="ends-at">Ends</Label>
                <Input
                  id="ends-at"
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, ends_at: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="description">Notes</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleCreate()}>Save event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
