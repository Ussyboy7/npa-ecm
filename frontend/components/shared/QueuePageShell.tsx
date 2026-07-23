import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { appType } from "@/lib/app-type";

interface QueuePageShellProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Optional quiet stats row under the header */
  stats?: ReactNode;
}

/** Shared layout for product queue / list pages (Apple-density titles). */
export function QueuePageShell({
  title,
  subtitle,
  actions,
  tabs,
  children,
  className,
  stats,
}: QueuePageShellProps) {
  return (
    <div className={cn("container mx-auto space-y-5 p-4 md:p-6", className)}>
      <div className="flex items-start justify-between gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className={appType.pageTitleList}>{title}</h1>
          <p className={appType.pageSubtitle}>{subtitle}</p>
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {stats}
      {tabs}
      {children}
    </div>
  );
}
