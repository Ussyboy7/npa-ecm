import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface AdminPageShellProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  actions?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
}

/** Shared layout shell for Administration section pages. */
export function AdminPageShell({
  title,
  subtitle,
  icon: Icon,
  actions,
  tabs,
  children,
}: AdminPageShellProps) {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
            <Icon className="h-8 w-8 shrink-0 text-primary" />
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{subtitle}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div> : null}
      </div>
      {tabs}
      {children}
    </div>
  );
}
