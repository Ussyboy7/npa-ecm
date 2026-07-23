"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, Copy } from "lucide-react";
import { fetchRelatedItems, type RelatedSearchItem } from "@/lib/search-storage";

interface RelatedItemsPanelProps {
  type: "document" | "correspondence" | "case";
  id: string;
  title?: string;
  compact?: boolean;
}

function itemHref(item: RelatedSearchItem) {
  if (item.type === "document") return `/dms/${item.id}`;
  if (item.type === "case") return `/cases/${item.id}`;
  return `/correspondence/${item.id}`;
}

export function RelatedItemsPanel({ type, id, compact = false }: RelatedItemsPanelProps) {
  const [related, setRelated] = useState<RelatedSearchItem[]>([]);
  const [duplicates, setDuplicates] = useState<RelatedSearchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchRelatedItems(type, id);
        if (!ignore) {
          setRelated(data.related);
          setDuplicates(data.duplicates);
        }
      } catch {
        if (!ignore) {
          setRelated([]);
          setDuplicates([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [type, id]);

  if (loading) {
    return (
      <div className="py-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Finding related…
      </div>
    );
  }

  if (related.length === 0 && duplicates.length === 0) return null;

  const renderList = (items: RelatedSearchItem[], variant: "outline" | "destructive") => (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={`${item.type}-${item.id}`}>
          <Link
            href={itemHref(item)}
            className="block rounded-xl px-2.5 py-2 hover:bg-muted/50 transition-colors min-w-0 overflow-hidden"
          >
            <div className="flex items-start gap-2 min-w-0">
              <p
                className="min-w-0 flex-1 text-[13px] font-medium leading-snug break-words line-clamp-2"
                title={item.title}
              >
                {item.title}
              </p>
              <Badge variant={variant} className="shrink-0 capitalize text-[10px] h-5 mt-0.5">
                {item.type === "correspondence" ? "corr" : item.type}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {item.reference ? `${item.reference} · ` : ""}
              {item.reason}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );

  if (compact) {
    return (
      <div className="rounded-xl bg-muted/30 border border-border/40 px-3 py-2.5 space-y-3 min-w-0 overflow-hidden">
        <p className="text-[13px] font-semibold tracking-tight flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
          Related
        </p>
        {duplicates.length > 0 && (
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-destructive mb-1 flex items-center gap-1">
              <Copy className="h-3 w-3 shrink-0" />
              Possible duplicates
            </p>
            {renderList(duplicates, "destructive")}
          </div>
        )}
        {related.length > 0 && (
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Similar</p>
            {renderList(related, "outline")}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Similar Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {duplicates.length > 0 && (
          <div>
            <p className="text-xs font-medium text-destructive mb-2 flex items-center gap-1">
              <Copy className="h-3 w-3" />
              Possible duplicates
            </p>
            {renderList(duplicates, "destructive")}
          </div>
        )}
        {related.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Related items</p>
            {renderList(related, "outline")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
