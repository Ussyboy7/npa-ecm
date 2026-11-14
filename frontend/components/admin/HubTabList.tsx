"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type HubTabLink = {
  href: string;
  label: string;
  /** True when this tab should look selected */
  isActive: (pathname: string, searchTab: string | null) => boolean;
};

type HubTabListProps = {
  tabs: HubTabLink[];
  className?: string;
  appearance?: "default" | "outlined";
};

/** Single standard tab row for admin hubs (links, not nested Tabs). */
export function HubTabList({ tabs, className, appearance = "default" }: HubTabListProps) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const searchTab = searchParams.get("tab");

  return (
    <div
      className={cn(
        "inline-flex h-9 max-w-full flex-wrap items-center justify-start gap-1 p-1 text-muted-foreground",
        appearance === "outlined"
          ? "h-auto w-fit rounded-xl border border-border/60 bg-card/60"
          : "rounded-lg bg-muted",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.isActive(pathname, searchTab);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-all",
              active
                ? appearance === "outlined"
                  ? "rounded-lg bg-muted text-foreground shadow-none"
                  : "bg-background text-foreground shadow-sm"
                : "hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
