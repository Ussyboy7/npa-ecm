import type { ReactNode } from 'react';
import { appType } from '@/lib/app-type';
import { cn } from '@/lib/utils';

interface AnalyticsPanelProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Quiet analytics section used across the dashboard and Analytics tabs.
 * Matches the dashboard's section strips rather than a grid of heavy cards.
 */
export function AnalyticsPanel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: AnalyticsPanelProps) {
  return (
    <section className={cn('rounded-xl border border-border/50 bg-muted/15 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={appType.panelTitle}>{title}</h3>
          {description ? <p className={cn(appType.caption, 'mt-0.5')}>{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className={cn('mt-3', bodyClassName)}>{children}</div>
    </section>
  );
}
