import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { appType } from "@/lib/app-type";

interface AdminPageShellProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  actions?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
  className?: string;
  stats?: ReactNode;
}

/** Shared layout shell for Administration section pages (tokens aligned). */
export function AdminPageShell({
  title,
  subtitle,
  icon: Icon,
  actions,
  tabs,
  children,
  className,
  stats,
}: AdminPageShellProps) {
  return (
    <div className={cn("container mx-auto space-y-5 p-4 md:p-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className={cn(appType.pageTitleList, "flex items-center gap-2.5")}>
            <Icon className="h-6 w-6 shrink-0 text-primary" />
            {title}
          </h1>
          <p className={cn(appType.pageSubtitle, "max-w-2xl")}>{subtitle}</p>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
        ) : null}
      </div>
      {stats}
      {tabs}
      {children}
    </div>
  );
}
