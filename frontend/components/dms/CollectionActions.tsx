"use client";

import { useState, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchCollectionById, shareDocument, type DocumentCollection } from '@/lib/dms-storage';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { MoreVertical, Share2, Download, FileText, Loader2, AlertTriangle } from 'lucide-react';
import type { User } from '@/lib/npa-structure';

interface CollectionActionsProps {
  collection: DocumentCollection;
  currentUser: User;
  onCollectionUpdate?: () => void;
}

export const CollectionActions = ({
  collection,
  currentUser,
  onCollectionUpdate,
}: CollectionActionsProps) => {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleShareCollection = useCallback(async () => {
    if (!collection.documentIds || collection.documentIds.length === 0) {
      toast.error('Collection has no documents to share');
      return;
    }

    setIsSharing(true);
    try {
      // Share each document in the collection
      const sharePromises = collection.documentIds.map((docId) =>
        shareDocument(docId, {
          access: 'read',
          note: shareNote.trim() || `Shared via collection: ${collection.name}`,
          userIds: [],
          divisionIds: [],
          departmentIds: [],
        }).catch((error) => {
          logError(`Failed to share document ${docId}`, error);
          return null;
        })
      );

      await Promise.all(sharePromises);
      toast.success(`Shared ${collection.documentIds.length} document(s) from collection`);
      setShareDialogOpen(false);
      setShareNote('');
      onCollectionUpdate?.();
    } catch (error: unknown) {
      logError('Failed to share collection', error);
      toast.error('Failed to share collection');
    } finally {
      setIsSharing(false);
    }
  }, [collection, shareNote, onCollectionUpdate]);

  const handleExportMetadata = useCallback(async () => {
    setIsExporting(true);
    try {
      const fullCollection = await fetchCollectionById(collection.id);
      
      const metadata = {
        collection: {
          id: fullCollection.id,
          name: fullCollection.name,
          description: fullCollection.description,
          createdAt: fullCollection.createdAt,
          updatedAt: fullCollection.updatedAt,
          documentCount: fullCollection.documentCount,
          isPublic: fullCollection.isPublic,
        },
        documents: fullCollection.documents?.map((doc) => ({
          id: doc.id,
          title: doc.title,
          documentType: doc.documentType,
          status: doc.status,
          referenceNumber: doc.referenceNumber,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        })) || [],
      };

      const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${collection.name.replace(/[^a-z0-9]/gi, '_')}_metadata.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Collection metadata exported');
    } catch (error: unknown) {
      logError('Failed to export collection metadata', error);
      toast.error('Failed to export metadata');
    } finally {
      setIsExporting(false);
    }
  }, [collection]);

  const handleGenerateCombinedPDF = useCallback(() => {
    // This would require backend support for PDF merging
    // For now, show a message
    toast.info('Combined PDF generation requires backend support. This feature will be available soon.');
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Collection
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportMetadata} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            Export Metadata
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleGenerateCombinedPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Combined PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Collection</DialogTitle>
            <DialogDescription>
              Share all documents in this collection. Each document will be shared with the same permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will share {collection.documentIds?.length || 0} document(s) from the collection.
                You can specify additional sharing details per document after sharing.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="share-note">Share Note (optional)</Label>
              <Textarea
                id="share-note"
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
                placeholder="Add a note to explain why you're sharing this collection..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)} disabled={isSharing}>
              Cancel
            </Button>
            <Button onClick={handleShareCollection} disabled={isSharing}>
              {isSharing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Collection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

