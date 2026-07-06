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
}

function itemHref(item: RelatedSearchItem) {
  if (item.type === "document") return `/dms/${item.id}`;
  if (item.type === "case") return `/cases/${item.id}`;
  return `/correspondence/${item.id}`;
}

export function RelatedItemsPanel({ type, id }: RelatedItemsPanelProps) {
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
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Finding related items…
        </CardContent>
      </Card>
    );
  }

  if (related.length === 0 && duplicates.length === 0) return null;

  const renderList = (items: RelatedSearchItem[], variant: "outline" | "destructive") => (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={`${item.type}-${item.id}`}>
          <Link
            href={itemHref(item)}
            className="flex items-start justify-between gap-2 rounded-md border p-2 hover:bg-muted/50 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.reference ? `${item.reference} · ` : ""}
                {item.reason}
              </p>
            </div>
            <Badge variant={variant} className="shrink-0 capitalize text-[10px]">
              {item.type}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Related & Similar
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
