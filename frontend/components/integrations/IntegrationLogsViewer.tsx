"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { getIntegrationLogs, type IntegrationLog } from "@/lib/api/integrations";
import { logError } from "@/lib/client-logger";
import { toast } from "@/components/ui/sonner";
import { formatDateTime } from "@/lib/datetime";

export function IntegrationLogsViewer() {
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logType, setLogType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getIntegrationLogs({
        log_type: logType === "all" ? undefined : logType,
        status: status === "all" ? undefined : status,
      });
      setLogs(data);
    } catch (error) {
      logError("Failed to load integration logs", error);
      toast.error("Failed to load integration logs");
    } finally {
      setLoading(false);
    }
  }, [logType, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusVariant = (s: IntegrationLog["status"]) => {
    if (s === "success") return "default" as const;
    if (s === "failed") return "destructive" as const;
    return "secondary" as const;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Recent webhook, email, ERP, and HRMS activity (last 100 entries)
      </p>

      <div className="rounded-xl bg-muted/30 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={logType} onValueChange={setLogType}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="erp">ERP</SelectItem>
              <SelectItem value="hrms">HRMS</SelectItem>
              <SelectItem value="sso">SSO</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Refresh logs">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No integration logs found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell className="capitalize text-xs">{log.log_type}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate text-sm" title={log.error_message || log.message}>
                    {log.message}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
