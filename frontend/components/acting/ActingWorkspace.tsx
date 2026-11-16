"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState, type ForwardedRef } from "react";
import { Ban, Flag, Plus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "@/components/ui/sonner";
import { logError } from "@/lib/client-logger";
import { formatDateLong } from "@/lib/datetime";
import {
  dismissActingRequest,
  endActingAppointment,
  getMyActingAppointments,
  getMyPrincipalActingAppointments,
  listActingAppointments,
  listActingRequests,
  type ActingAppointment,
  type ActingRequest,
} from "@/lib/api/acting-appointments";
import type { Office, OfficeMembership } from "@/lib/organization-types";
import type { User } from "@/lib/npa-structure";

import { ActingAppointmentDialog, type ActingMode } from "./ActingAppointmentDialog";
import { ActingRequestDialog } from "./ActingRequestDialog";

interface ActingWorkspaceProps {
  mode: ActingMode;
  currentUser: User;
  offices: Office[];
  officeMemberships: OfficeMembership[];
  users?: User[];
}

function formatDate(value: string | null): string {
  return value ? formatDateLong(value) : "Open-ended";
}

export interface ActingWorkspaceHandle {
  openAppointment: () => void;
}

function ActingWorkspaceBase(
  { mode, currentUser, offices, officeMemberships, users = [] }: ActingWorkspaceProps,
  ref: ForwardedRef<ActingWorkspaceHandle>,
) {
  const isAdmin = mode === "admin";
  const myMemberships = useMemo(
    () => officeMemberships.filter((membership) =>
      membership.isActive && String(membership.userId) === String(currentUser.id)),
    [currentUser.id, officeMemberships],
  );
  const principalOffices = useMemo(
    () => myMemberships.filter((membership) => membership.assignmentRole === "principal"),
    [myMemberships],
  );
  const [appointments, setAppointments] = useState<ActingAppointment[]>([]);
  const [asActing, setAsActing] = useState<ActingAppointment[]>([]);
  const [asPrincipal, setAsPrincipal] = useState<ActingAppointment[]>([]);
  const [requests, setRequests] = useState<ActingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [activeView, setActiveView] = useState<"appointments" | "requests">("appointments");
  const [appointOpen, setAppointOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [appointmentRequest, setAppointmentRequest] = useState<ActingRequest | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    openAppointment: () => {
      setAppointmentRequest(null);
      setAppointOpen(true);
    },
  }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [allAppointments, pendingRequests] = await Promise.all([
          listActingAppointments(showInactive ? undefined : { isActive: true }),
          listActingRequests({ status: "pending" }),
        ]);
        setAppointments(allAppointments);
        setRequests(pendingRequests);
      } else {
        const [acting, principal, allRequests] = await Promise.all([
          getMyActingAppointments(),
          getMyPrincipalActingAppointments(),
          listActingRequests(),
        ]);
        setAsActing(acting.filter((appointment) => appointment.isActive));
        setAsPrincipal(principal.filter((appointment) => appointment.isActive));
        setRequests(allRequests.filter((request) =>
          String(request.requestedBy) === String(currentUser.id) ||
          String(request.principal) === String(currentUser.id)));
      }
    } catch (error) {
      logError(`Failed to load ${isAdmin ? "organization" : "self-service"} acting data`, error);
      toast({ title: "Could not load acting data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, isAdmin, showInactive]);

  useEffect(() => { void load(); }, [load]);

  const handleEnd = async (appointment: ActingAppointment) => {
    setEndingId(appointment.id);
    try {
      await endActingAppointment(appointment.id, isAdmin ? "Ended from admin" : "Ended by principal");
      toast({ title: isAdmin ? "Acting appointment ended — open seat items reclaimed" : "Acting appointment ended — remaining items reclaimed" });
      await load();
    } catch (error) {
      logError("Failed to end acting appointment", error);
      toast({ title: "Could not end appointment", variant: "destructive" });
    } finally { setEndingId(null); }
  };

  const handleDismiss = async (request: ActingRequest) => {
    setDismissingId(request.id);
    try {
      await dismissActingRequest(request.id, "Dismissed from admin");
      toast({ title: "Acting request dismissed" }); await load();
    } catch (error) {
      logError("Failed to dismiss acting request", error);
      toast({ title: "Could not dismiss request", variant: "destructive" });
    } finally { setDismissingId(null); }
  };

  const openAppointmentFromRequest = (request: ActingRequest) => {
    setAppointmentRequest(request);
    setAppointOpen(true);
  };

  return (
    <div className="space-y-4">
      {!isAdmin && myMemberships.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {principalOffices.length > 0 ? <Button size="compact" onClick={() => { setAppointmentRequest(null); setAppointOpen(true); }}><Plus className="h-4 w-4" />Appoint acting</Button> : null}
          {myMemberships.length > 0 ? <Button variant="outline" size="compact" onClick={() => setRequestOpen(true)}><Flag className="h-4 w-4" />Request acting</Button> : null}
        </div>
      ) : null}

      {isAdmin ? (
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "appointments" | "requests")} className="space-y-4">
          <div className="rounded-xl bg-muted/30 p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList className="h-8 bg-background/70">
                <TabsTrigger value="appointments" className="h-7 px-2.5 text-xs">Appointments</TabsTrigger>
                <TabsTrigger value="requests" className="h-7 px-2.5 text-xs">Requests{requests.length ? ` (${requests.length})` : ""}</TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowInactive((value) => !value)}>{showInactive ? "Show active only" : "Include ended"}</Button>
            </div>
          </div>
          <TabsContent value="appointments" className="mt-0 focus-visible:outline-none">
            <AppointmentList mode="admin" appointments={appointments} loading={loading} endingId={endingId} onEnd={handleEnd} />
          </TabsContent>
          <TabsContent value="requests" className="mt-0 focus-visible:outline-none">
            <RequestList mode="admin" requests={requests} loading={loading} onAppoint={openAppointmentFromRequest} onDismiss={handleDismiss} dismissingId={dismissingId} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="mine" className="space-y-4">
          <TabsList><TabsTrigger value="mine">My appointments</TabsTrigger><TabsTrigger value="requests">My requests</TabsTrigger></TabsList>
          <TabsContent value="mine" className="space-y-4">
            <AppointmentList mode="self-service" appointments={[]} asActing={asActing} asPrincipal={asPrincipal} loading={loading} endingId={endingId} onEnd={handleEnd} />
          </TabsContent>
          <TabsContent value="requests" className="space-y-4">
            <RequestList mode="self-service" requests={requests} loading={loading} />
          </TabsContent>
        </Tabs>
      )}

      <ActingAppointmentDialog
        mode={mode}
        open={appointOpen}
        onOpenChange={(open) => { setAppointOpen(open); if (!open) setAppointmentRequest(null); }}
        currentUser={currentUser}
        offices={offices}
        principalOffices={principalOffices}
        officeMemberships={officeMemberships}
        users={users}
        initialRequest={appointmentRequest}
        onCompleted={load}
      />
      {!isAdmin ? <ActingRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        memberOffices={myMemberships}
        offices={offices}
        onCompleted={load}
      /> : null}
    </div>
  );
}

export const ActingWorkspace = forwardRef<ActingWorkspaceHandle, ActingWorkspaceProps>(ActingWorkspaceBase);

function AppointmentList({
  mode, appointments, asActing = [], asPrincipal = [], loading, endingId, onEnd,
}: {
  mode: ActingMode;
  appointments: ActingAppointment[];
  asActing?: ActingAppointment[];
  asPrincipal?: ActingAppointment[];
  loading: boolean;
  endingId: string | null;
  onEnd: (appointment: ActingAppointment) => void;
}) {
  if (loading) return <LoadingState message="Loading acting appointments…" />;
  if (mode === "self-service") {
    if (!asActing.length && !asPrincipal.length) return <EmptyState icon="inbox" title="No active acting appointments" message="Appoint an acting officer before leave, or request help if a seat holder is away without handover." />;
    return <div className="space-y-4">{asActing.map((appointment) => <div key={`acting-${appointment.id}`} className="rounded-xl border border-border/60 bg-muted/20 p-4"><p className="flex items-center gap-2 text-base font-semibold"><UserCheck className="h-4 w-4" />You are acting as {appointment.principalName}</p><div className="space-y-2 text-sm text-muted-foreground"><p>{appointment.officeName} · {formatDate(appointment.startsAt)} → {formatDate(appointment.endsAt)} · {appointment.itemsTransferred} items transferred</p>{appointment.reason ? <p className="text-xs">Reason: {appointment.reason.split("\n")[0]}</p> : null}</div></div>)}{asPrincipal.map((appointment) => <div key={`principal-${appointment.id}`} className="rounded-xl border border-border/60 bg-muted/20 p-4"><div className="flex items-start justify-between pb-2"><div><p className="text-base font-semibold">{appointment.actingUserName} is acting for you</p><p className="mt-1 text-sm text-muted-foreground">{appointment.officeName} · {formatDate(appointment.startsAt)} → {formatDate(appointment.endsAt)}</p></div><Badge>Active</Badge></div><Button variant="outline" size="sm" onClick={() => onEnd(appointment)} disabled={endingId === appointment.id}><Ban className="mr-2 h-3.5 w-3.5" />{endingId === appointment.id ? "Ending…" : "End & reclaim seat"}</Button></div>)}</div>;
  }
  if (!appointments.length) return <EmptyState icon="inbox" title="No acting appointments" message="No appointments match this view." />;
  return <div className="grid gap-4">{appointments.map((appointment) => (
    <ListRowCard key={appointment.id} density="dense" leading={<div className="rounded-md bg-primary/10 p-2 text-primary"><UserCheck className="h-4 w-4" /></div>}
      actions={appointment.isActive ? <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={() => onEnd(appointment)} disabled={endingId === appointment.id}><Ban className="mr-1.5 h-3.5 w-3.5" />{endingId === appointment.id ? "Ending…" : mode === "admin" ? "End appointment" : "End & reclaim seat"}</Button> : null}>
      <div className="space-y-1.5"><p className="truncate text-sm font-semibold tracking-tight">{appointment.officeName}{appointment.officeCode ? ` (${appointment.officeCode})` : ""}</p><div className="flex flex-wrap items-center gap-1.5"><span className="text-xs text-muted-foreground">{appointment.actingUserName} acting for {appointment.principalName}</span><Badge variant={appointment.isActive ? "default" : "secondary"} className="text-[10px]">{appointment.isActive ? appointment.isCurrentlyEffective ? "Active" : "Scheduled" : "Ended"}</Badge></div><p className="text-xs text-muted-foreground">From {formatDate(appointment.startsAt)} · Until {formatDate(appointment.endsAt)} · {appointment.itemsTransferred} transferred{!appointment.isActive ? ` · ${appointment.itemsReclaimed} reclaimed` : ""}</p>{appointment.reason ? <p className="text-xs text-muted-foreground">{appointment.reason}</p> : null}</div>
    </ListRowCard>
  ))}</div>;
}

function RequestList({
  mode, requests, loading, onAppoint, onDismiss, dismissingId,
}: {
  mode: ActingMode;
  requests: ActingRequest[];
  loading: boolean;
  onAppoint?: (request: ActingRequest) => void;
  onDismiss?: (request: ActingRequest) => void;
  dismissingId?: string | null;
}) {
  if (loading) return <LoadingState message="Loading acting requests…" />;
  if (!requests.length) return <EmptyState icon="inbox" title={mode === "admin" ? "No pending requests" : "No acting requests"} message={mode === "admin" ? "There are no pending acting requests." : "Office members can request help when a seat holder is unreachable."} />;
  return <div className="space-y-4">{requests.map((request) => mode === "admin" ? (
    <ListRowCard key={request.id} density="dense" leading={<div className="rounded-md bg-primary/10 p-2 text-primary"><UserCheck className="h-4 w-4" /></div>}
      actions={<div className="flex flex-wrap gap-1"><Button size="sm" className="h-8 px-2.5 text-xs" onClick={() => onAppoint?.(request)}>Appoint</Button><Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" onClick={() => onDismiss?.(request)} disabled={dismissingId === request.id}>{dismissingId === request.id ? "Dismissing…" : "Dismiss"}</Button></div>}>
      <div className="space-y-1.5"><p className="truncate text-sm font-semibold tracking-tight">{request.officeName}</p><span className="text-xs text-muted-foreground">For {request.principalName} · requested by {request.requestedByName}</span><Badge className="ml-2 text-[10px]">{request.pendingItemCount} open items</Badge><p className="text-xs text-muted-foreground">{request.reason}</p>{request.suggestedActingUserName ? <p className="text-xs text-muted-foreground">Suggested: {request.suggestedActingUserName}</p> : null}</div>
    </ListRowCard>
  ) : (
    <div key={request.id} className="rounded-xl border border-border/60 bg-muted/20 p-4"><div className="flex flex-row items-start justify-between pb-2"><div><p className="text-base font-semibold">{request.officeName}</p><p className="mt-1 text-sm text-muted-foreground">For {request.principalName} · by {request.requestedByName}</p></div><Badge variant={request.status === "pending" ? "default" : "secondary"}>{request.status}</Badge></div><div className="text-sm text-muted-foreground"><p>{request.reason}</p><p className="mt-2">{request.pendingItemCount} open seat item(s){request.suggestedActingUserName ? ` · suggested ${request.suggestedActingUserName}` : ""}</p></div></div>
  ))}</div>;
}
