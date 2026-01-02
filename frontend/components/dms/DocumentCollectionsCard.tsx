"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderKanban, Plus } from 'lucide-react';
import type { DocumentCollection } from '@/lib/dms-storage';

interface DocumentCollectionsCardProps {
  collections: DocumentCollection[];
  onManageCollections: () => void;
}

export const DocumentCollectionsCard = ({
  collections,
  onManageCollections,
}: DocumentCollectionsCardProps) => {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-primary" />
              Collections
            </CardTitle>
            <CardDescription className="mt-1">
              Group this document with related documents for projects
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={onManageCollections}
            aria-label="Manage collections"
          >
            <Plus className="h-3 w-3" />
            Manage
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg">
              <FolderKanban className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground mb-1">No collections assigned</p>
              <p className="text-xs text-muted-foreground mb-3">
                Add this document to collections for project organization
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={onManageCollections}
                aria-label="Add to collection"
              >
                <Plus className="h-3 w-3" />
                Add to Collection
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {collections.map((collection) => (
                <Badge
                  key={collection.id}
                  variant="outline"
                  className="gap-1.5 text-xs py-1.5 px-2.5"
                >
                  <FolderKanban className="h-3 w-3" />
                  {collection.name}
                  {collection.documentCount !== undefined && (
                    <span className="text-muted-foreground">({collection.documentCount})</span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


