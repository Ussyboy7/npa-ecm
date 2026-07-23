"use client";

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Building2, Globe } from 'lucide-react';

interface FlowTypeBadgeProps {
  flowType?: string;
  isInward?: boolean;
  isOutward?: boolean;
  isInternal?: boolean;
  isExternal?: boolean;
  variant?: 'default' | 'outline' | 'secondary';
  showIcon?: boolean;
  className?: string;
  /** Smaller badge and icons for dense list rows */
  compact?: boolean;
}

/**
 * FlowTypeBadge - Displays correspondence flow type with icons
 * 
 * Flow Types:
 * - inward-internal: Coming INTO office from another NPA office (minuted)
 * - inward-external: Coming INTO office from external org (physical copy)
 * - outward-internal: Going OUT OF office to another NPA office (minute it out)
 * - outward-external: Going OUT OF office to external org (print & mail)
 */
export function FlowTypeBadge({
  flowType,
  isInward,
  isOutward,
  isInternal,
  variant = 'outline',
  showIcon = true,
  className,
  compact = false,
}: FlowTypeBadgeProps) {
  // Determine flow type from props if not provided
  let actualFlowType = flowType;
  if (!actualFlowType) {
    if (isInward) {
      actualFlowType = isInternal ? 'inward-internal' : 'inward-external';
    } else if (isOutward) {
      actualFlowType = isInternal ? 'outward-internal' : 'outward-external';
    }
  }

  if (!actualFlowType) {
    return null;
  }

  const getBadgeConfig = () => {
    switch (actualFlowType) {
      case 'inward-internal':
        return {
          label: 'Inward (Internal)',
          icon: ArrowDown,
          iconClass: 'text-sky-900 dark:text-sky-100',
          bgClass: 'bg-sky-50 dark:bg-sky-950 border-sky-700/40 dark:border-sky-400/40',
          textClass: 'text-sky-900 dark:text-sky-100',
        };
      case 'inward-external':
        return {
          label: 'Inward (External)',
          icon: ArrowDown,
          iconClass: 'text-violet-900 dark:text-violet-100',
          bgClass: 'bg-violet-50 dark:bg-violet-950 border-violet-700/40 dark:border-violet-400/40',
          textClass: 'text-violet-900 dark:text-violet-100',
        };
      case 'outward-internal':
        return {
          label: 'Outward (Internal)',
          icon: ArrowUp,
          iconClass: 'text-emerald-900 dark:text-emerald-100',
          bgClass: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-700/40 dark:border-emerald-400/40',
          textClass: 'text-emerald-900 dark:text-emerald-100',
        };
      case 'outward-external':
        return {
          label: 'Outward (External)',
          icon: ArrowUp,
          iconClass: 'text-amber-950 dark:text-amber-100',
          bgClass: 'bg-amber-50 dark:bg-amber-950 border-amber-700/40 dark:border-amber-400/40',
          textClass: 'text-amber-950 dark:text-amber-100',
        };
      default:
        return null;
    }
  };

  const config = getBadgeConfig();
  if (!config) return null;

  const Icon = config.icon;
  const SourceIcon = isInternal ? Building2 : Globe;

  const iconSize = compact ? 'h-2.5 w-2.5' : 'h-3 w-3';

  return (
    <Badge
      variant={variant}
      className={cn(
        compact ? 'gap-0.5' : 'gap-1.5',
        variant === 'outline' ? config.bgClass : '',
        variant === 'outline' ? config.textClass : '',
        className,
      )}
      title={
        actualFlowType === 'inward-internal'
          ? 'Coming INTO office from another NPA office (minuted to you)'
          : actualFlowType === 'inward-external'
          ? 'Coming INTO office from external organization (physical copy received)'
          : actualFlowType === 'outward-internal'
          ? 'Going OUT OF office to another NPA office (you minute it out)'
          : 'Going OUT OF office to external organization (registered, printed, mailed)'
      }
    >
      {showIcon && <Icon className={cn(iconSize, config.iconClass)} />}
      <SourceIcon className={iconSize} />
      <span>{config.label}</span>
    </Badge>
  );
}

