"use client";

import { useState, useEffect } from 'react';
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, FileText, ArrowUp, ArrowDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

interface DocumentThreadCardProps {
  documentId: string;
  parentDocumentId?: string | null;
}

interface ThreadDocument {
  id: string;
  title: string;
  reference_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
  };
}

export const DocumentThreadCard = ({ documentId, parentDocumentId }: DocumentThreadCardProps) => {
  const router = useRouter();
  const [parentDocument, setParentDocument] = useState<ThreadDocument | null>(null);
  const [childDocuments, setChildDocuments] = useState<ThreadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadThreadDocuments = async () => {
    try {
      setLoading(true);
      
      // Load parent document if parentDocumentId is provided
      if (parentDocumentId) {
        try {
          const parent = await apiFetch(`/dms/documents/${parentDocumentId}/`);
          setParentDocument({
            id: parent.id,
            title: parent.title,
            reference_number: parent.reference_number || 'N/A',
            status: parent.status,
            created_at: parent.created_at,
            updated_at: parent.updated_at,
            author: parent.author,
          });
        } catch (error: unknown) {
          logError('Failed to load parent document:', error);
        }
      }
      
      // Load child documents (response documents)
      try {
        const response = await apiFetch(`/dms/documents/?parent_document=${documentId}&page_size=100`);
        const children = (response.results || response || []).map((doc: Record<string, unknown>) => ({
          id: doc.id,
          title: doc.title,
          reference_number: doc.reference_number || 'N/A',
          status: doc.status,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          author: doc.author,
        }));
        setChildDocuments(children);
      } catch (error: unknown) {
        logError('Failed to load child documents:', error);
      }
      } catch (error: unknown) {
      logError('Failed to load thread documents:', error);
      toast.error('Failed to load document thread');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      loadThreadDocuments();
    }
  }, [documentId, parentDocumentId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadThreadDocuments();
      toast.success('Document thread refreshed');
      } catch (error: unknown) {
      toast.error('Failed to refresh document thread');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'published':
        return 'default';
      case 'draft':
        return 'outline';
      case 'archived':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Don't show card if no parent and no children
  if (!parentDocument && childDocuments.length === 0) {
    return null;
  }

  return (
    <Card className="flex flex-col flex-1 min-h-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Document Thread
            </CardTitle>
            <CardDescription>
              Related documents in this correspondence thread
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh document thread"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col space-y-4">
        {/* Parent Document */}
        {parentDocument && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowUp className="h-3 w-3" />
              <span>Parent Document</span>
            </div>
            <div
              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/dms/${parentDocument.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{parentDocument.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>Ref: {parentDocument.reference_number}</span>
                    <Badge variant={getStatusVariant(parentDocument.status)} className="text-xs">
                      {parentDocument.status}
                    </Badge>
                  </div>
                  {parentDocument.author && (
                    <div className="text-xs text-muted-foreground mt-1">
                      By: {parentDocument.author.name}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* Current Document Indicator */}
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
          <FileText className="h-4 w-4 text-primary" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">Current Document</div>
            <div className="text-xs text-muted-foreground">You are viewing this document</div>
          </div>
        </div>

        {/* Child Documents (Responses) */}
        {childDocuments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowDown className="h-3 w-3" />
              <span>Response Documents ({childDocuments.length})</span>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {childDocuments.map((child) => (
                <div
                  key={child.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dms/${child.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{child.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>Ref: {child.reference_number}</span>
                        <Badge variant={getStatusVariant(child.status)} className="text-xs">
                          {child.status}
                        </Badge>
                      </div>
                      {child.author && (
                        <div className="text-xs text-muted-foreground mt-1">
                          By: {child.author.name}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDateShort(child.created_at)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!parentDocument && childDocuments.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No related documents in this thread
          </div>
        )}
      </CardContent>
    </Card>
  );
};

