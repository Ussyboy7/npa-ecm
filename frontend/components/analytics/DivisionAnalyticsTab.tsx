"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useOrganization } from "@/contexts/OrganizationContext";
import { fetchEnhancedDivisionPerformance, type EnhancedDivisionPerformance } from "@/lib/sla-client";
import { ArrowRight, Target } from "lucide-react";

const COMPLIANCE_COLORS = {
  good: "#22c55e",
  warn: "#eab308",
  bad: "#ef4444",
};

function complianceColor(rate: number) {
  if (rate >= 85) return COMPLIANCE_COLORS.good;
  if (rate >= 70) return COMPLIANCE_COLORS.warn;
  return COMPLIANCE_COLORS.bad;
}

export function DivisionAnalyticsTab() {
  const { directorates } = useOrganization();
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [directorateId, setDirectorateId] = useState("all");
  const [data, setData] = useState<EnhancedDivisionPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchEnhancedDivisionPerformance({
          range: parseInt(selectedPeriod, 10),
          directorateId,
        });
        if (!ignore) setData(response);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Failed to load division analytics");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [selectedPeriod, directorateId]);

  const divisions = useMemo(() => {
    const rows = data?.divisions ?? [];
    return rows.filter(
      (div) =>
        div.name.toLowerCase() !== "unassigned" &&
        div.name.toLowerCase() !== "unassigned division",
    );
  }, [data?.divisions]);

  if (loading) return <LoadingState message="Loading division & port analytics…" />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={directorateId} onValueChange={setDirectorateId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Directorate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directorates</SelectItem>
            {directorates.map((d) => (
              <SelectItem key={d.id as string} value={d.id as string}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Divisions / Ports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalDivisions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Workload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalWorkload}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgCompletionRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" /> Avg SLA Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgSlaCompliance}%</div>
            <Progress value={data.summary.avgSlaCompliance} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SLA Compliance by Division / Port</CardTitle>
            <CardDescription>Compliance rate across operational units</CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            {divisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No division data for this filter.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={divisions.slice(0, 10)} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${value}%`, "SLA Compliance"]} />
                  <Bar dataKey="slaComplianceRate" radius={[0, 4, 4, 0]}>
                    {divisions.slice(0, 10).map((entry) => (
                      <Cell key={entry.id ?? entry.name} fill={complianceColor(entry.slaComplianceRate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs Attention</CardTitle>
            <CardDescription>Divisions below 80% SLA compliance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.needsAttention ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">All divisions are within target SLA range.</p>
            ) : (
              (data.needsAttention ?? []).slice(0, 6).map((div) => (
                <div key={div.id ?? div.name} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{div.name}</p>
                    <p className="text-xs text-muted-foreground">{div.fullName}</p>
                  </div>
                  <Badge variant={div.slaComplianceRate < 60 ? "destructive" : "secondary"}>
                    {div.slaComplianceRate}%
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Division / Port Detail</CardTitle>
          <CardDescription>Workload, backlog, and throughput by unit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {divisions.map((div) => (
            <div key={div.id ?? div.name} className="rounded-lg border p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{div.name}</p>
                  <p className="text-xs text-muted-foreground">{div.fullName}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">{div.workload} workload</Badge>
                  <Badge variant="outline">{div.backlog} backlog</Badge>
                  <Badge variant="outline">{div.throughput}/day throughput</Badge>
                </div>
              </div>
              <Progress value={div.slaComplianceRate} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{div.completed} completed · {div.pending} pending</span>
                <span>{div.slaComplianceRate}% SLA · {div.completionRate}% completion</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <Link href="/analytics/executive" className="inline-flex items-center gap-1 hover:underline">
          View executive dashboard <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
