"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import Link from "next/link";

interface Activity {
  id: string;
  timestamp: string;
  user_name?: string;
  action: string;
  module: string;
  description: string;
}

interface RecentActivityTableProps {
  activities: Activity[];
  loading?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentActivityTable({ activities, loading }: RecentActivityTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Activity
        </CardTitle>
        <Link href="/audit" className="text-xs text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="text-sm text-muted-foreground">No recent activity</div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{activity.user_name || "System"}</span>
                  <span className="mx-1.5 text-muted-foreground">&middot;</span>
                  <Badge variant="outline" className="text-xs">{activity.action}</Badge>
                  <span className="mx-1.5 text-muted-foreground">&middot;</span>
                  <span className="text-muted-foreground">{activity.description}</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {timeAgo(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
