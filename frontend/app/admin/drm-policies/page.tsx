"use client";

import { useEffect, useState } from "react";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createDrmPolicy,
  fetchDrmPolicies,
  type DocumentRightsPolicy,
} from "@/lib/drm-api";

export default function DrmPoliciesPage() {
  const [policies, setPolicies] = useState<DocumentRightsPolicy[]>([]);
  const [name, setName] = useState("");
  const [viewOnly, setViewOnly] = useState(false);

  const load = async () => {
    setPolicies(await fetchDrmPolicies());
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Policy name is required");
      return;
    }
    try {
      await createDrmPolicy({
        name: name.trim(),
        description: "",
        allow_download: !viewOnly,
        allow_print: !viewOnly,
        allow_external_share: false,
        view_only: viewOnly,
        watermark_text: viewOnly ? "CONFIDENTIAL" : "",
      });
      toast.success("DRM policy created");
      setName("");
      await load();
    } catch {
      toast.error("Failed to create policy");
    }
  };

  return (
    <AdminPageShell title="DRM Policies" subtitle="Document rights: download, print, watermark, expiry." icon={Shield}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="policy-name">Name</Label>
              <Input id="policy-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="view-only" checked={viewOnly} onCheckedChange={setViewOnly} />
              <Label htmlFor="view-only">View only (block download/print)</Label>
            </div>
            <Button onClick={() => void handleCreate()}>
              <Plus className="h-4 w-4 mr-2" />
              Create policy
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {policies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No policies yet.</p>
            ) : (
              policies.map((policy) => (
                <div key={policy.id} className="border rounded-lg p-3 text-sm">
                  <p className="font-medium">{policy.name}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {policy.view_only ? "View only" : "Download allowed"} ·{" "}
                    {policy.watermark_text ? `Watermark: ${policy.watermark_text}` : "No watermark"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
