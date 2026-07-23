"use client";

import { useState, useRef } from "react";
import { Send, FileCheck } from "lucide-react";
import { logError } from "@/lib/client-logger";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

interface DispatchModalProps {
  correspondenceId: string;
  onSuccess: () => void;
}

export function DispatchModal({ correspondenceId, onSuccess }: DispatchModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [dispatchMode, setDispatchMode] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [notes, setNotes] = useState("");

  const handleDispatch = async () => {
    if (!dispatchMode) {
      toast.error("Please select a dispatch mode");
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      await apiFetch(`/correspondence/items/${correspondenceId}/dispatch/`, {
        method: "POST",
        body: JSON.stringify({
          dispatch_mode: dispatchMode,
          dispatched_date: new Date().toISOString().split("T")[0],
          tracking_number: trackingNumber,
          courier_name: courierName,
          recipient_name: recipientName,
          recipient_address: recipientAddress,
          notes,
        }),
      });
      toast.success("Correspondence dispatched successfully");
      setOpen(false);
      onSuccess();
    } catch (err) {
      logError("Failed to dispatch correspondence", err);
      toast.error("Failed to dispatch correspondence");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full">
          <Send className="h-4 w-4 mr-2" />
          Dispatch
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Dispatch Correspondence</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Dispatch Mode</Label>
            <Select value={dispatchMode} onValueChange={setDispatchMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="courier">Courier</SelectItem>
                <SelectItem value="hand_delivery">Hand Delivery</SelectItem>
                <SelectItem value="postal">Postal Service</SelectItem>
                <SelectItem value="internal">Internal Routing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Courier Name</Label>
              <Input value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Recipient Name</Label>
            <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Recipient Address</Label>
            <Textarea value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleDispatch} disabled={loading} className="w-full">
            {loading ? "Dispatching..." : "Confirm Dispatch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AcknowledgeButton({ correspondenceId, onSuccess }: { correspondenceId: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      await apiFetch(`/correspondence/items/${correspondenceId}/acknowledge/`, {
        method: "POST",
        body: JSON.stringify({
          acknowledged_date: new Date().toISOString().split("T")[0],
        }),
      });
      toast.success("Correspondence acknowledged");
      onSuccess();
    } catch (_err) {
      toast.error("Failed to acknowledge");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleAcknowledge} disabled={loading}>
      <FileCheck className="h-4 w-4 mr-1" />
      {loading ? "Acknowledging..." : "Mark Acknowledged"}
    </Button>
  );
}
