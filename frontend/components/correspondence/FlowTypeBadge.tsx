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
          iconClass: 'text-blue-600 dark:text-blue-400',
          bgClass: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
          textClass: 'text-blue-700 dark:text-blue-300',
        };
      case 'inward-external':
        return {
          label: 'Inward (External)',
          icon: ArrowDown,
          iconClass: 'text-purple-600 dark:text-purple-400',
          bgClass: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
          textClass: 'text-purple-700 dark:text-purple-300',
        };
      case 'outward-internal':
        return {
          label: 'Outward (Internal)',
          icon: ArrowUp,
          iconClass: 'text-green-600 dark:text-green-400',
          bgClass: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
          textClass: 'text-green-700 dark:text-green-300',
        };
      case 'outward-external':
        return {
          label: 'Outward (External)',
          icon: ArrowUp,
          iconClass: 'text-orange-600 dark:text-orange-400',
          bgClass: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
          textClass: 'text-orange-700 dark:text-orange-300',
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

