import type { ReactNode } from 'react';

interface QueuePageShellProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
}

/** Shared layout for correspondence/case queue pages. */
export function QueuePageShell({
  title,
  subtitle,
  actions,
  tabs,
  children,
}: QueuePageShellProps) {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-muted-foreground">{subtitle}</p>
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {tabs}
      {children}
    </div>
  );
}
