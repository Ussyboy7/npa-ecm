"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  fetchCollections,
  createCollection,
  addDocumentsToCollection,
  removeDocumentsFromCollection,
  type DocumentCollection,
  type DocumentRecord,
} from '@/lib/dms-storage';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { Loader2, FolderKanban, Plus, X, Users, Globe, Lock } from 'lucide-react';
import { CollectionActions } from './CollectionActions';

interface CollectionManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentRecord | null;
  onComplete?: () => void;
  currentUser?: import('@/lib/npa-structure').User;
}

export const CollectionManagementDialog = ({
  open,
  onOpenChange,
  document,
  onComplete,
  currentUser,
}: CollectionManagementDialogProps) => {
  const [collections, setCollections] = useState<DocumentCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionIsPublic, setNewCollectionIsPublic] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(new Set());

  const loadCollections = useCallback(async () => {
    if (!open) return;
    
    setLoading(true);
    try {
      const allCollections = await fetchCollections();
      setCollections(allCollections);
      
      // Pre-select collections that contain this document
      if (document) {
        const documentCollectionIds = allCollections
          .filter((c) => c.documentIds.includes(document.id))
          .map((c) => c.id);
        setSelectedCollectionIds(new Set(documentCollectionIds));
      }
    } catch (error: unknown) {
      logError('Failed to load collections', error);
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, [open, document]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  const handleCreateCollection = useCallback(async () => {
    if (!newCollectionName.trim()) {
      toast.error('Please enter a collection name');
      return;
    }

    setCreating(true);
    try {
      const collection = await createCollection({
        name: newCollectionName.trim(),
        description: newCollectionDescription.trim() || undefined,
        documentIds: document ? [document.id] : [],
        isPublic: newCollectionIsPublic,
      });

      setCollections((prev) => [...prev, collection]);
      setSelectedCollectionIds((prev) => new Set([...prev, collection.id]));
      setNewCollectionName('');
      setNewCollectionDescription('');
      setNewCollectionIsPublic(false);
      setShowCreateForm(false);
      toast.success('Collection created successfully');
    } catch (error: unknown) {
      logError('Failed to create collection', error);
      toast.error('Failed to create collection');
    } finally {
      setCreating(false);
    }
  }, [newCollectionName, newCollectionDescription, newCollectionIsPublic, document]);

  const handleToggleCollection = useCallback(async (collectionId: string, isSelected: boolean) => {
    if (!document) return;

    try {
      if (isSelected) {
        await addDocumentsToCollection(collectionId, [document.id]);
        setSelectedCollectionIds((prev) => new Set([...prev, collectionId]));
        toast.success('Document added to collection');
      } else {
        await removeDocumentsFromCollection(collectionId, [document.id]);
        setSelectedCollectionIds((prev) => {
          const next = new Set(prev);
          next.delete(collectionId);
          return next;
        });
        toast.success('Document removed from collection');
      }
      onComplete?.();
    } catch (error: unknown) {
      logError('Failed to update collection', error);
      toast.error('Failed to update collection');
    }
  }, [document, onComplete]);

  const handleClose = useCallback(() => {
    setShowCreateForm(false);
    setNewCollectionName('');
    setNewCollectionDescription('');
    setNewCollectionIsPublic(false);
    onOpenChange(false);
  }, [onOpenChange]);

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Manage Collections
          </DialogTitle>
          <DialogDescription>
            Add or remove this document from collections. Collections help organize related documents for projects.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Create New Collection */}
            {!showCreateForm ? (
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Collection
              </Button>
            ) : (
              <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Create Collection</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewCollectionName('');
                      setNewCollectionDescription('');
                      setNewCollectionIsPublic(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collection-name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="collection-name"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="e.g., ECM Project Documents"
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collection-description">Description</Label>
                  <Textarea
                    id="collection-description"
                    value={newCollectionDescription}
                    onChange={(e) => setNewCollectionDescription(e.target.value)}
                    placeholder="Optional description..."
                    rows={2}
                    disabled={creating}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="collection-public"
                    checked={newCollectionIsPublic}
                    onCheckedChange={(checked) => setNewCollectionIsPublic(checked === true)}
                    disabled={creating}
                  />
                  <Label htmlFor="collection-public" className="flex items-center gap-2 cursor-pointer">
                    <Globe className="h-4 w-4" />
                    Make collection public (visible to all users)
                  </Label>
                </div>
                <Button
                  onClick={handleCreateCollection}
                  disabled={creating || !newCollectionName.trim()}
                  className="w-full"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Collection
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Collections List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : collections.length === 0 ? (
              <Alert>
                <FolderKanban className="h-4 w-4" />
                <AlertDescription>
                  No collections found. Create a new collection to get started.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <Label>Available Collections</Label>
                {collections.map((collection) => {
                  const isSelected = selectedCollectionIds.has(collection.id);
                  return (
                    <div
                      key={collection.id}
                      className={`p-3 border rounded-lg flex items-center justify-between ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleToggleCollection(collection.id, checked === true)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{collection.name}</p>
                            {currentUser && (
                              <CollectionActions
                                collection={collection}
                                currentUser={currentUser}
                                onCollectionUpdate={loadCollections}
                              />
                            )}
                            {collection.isPublic ? (
                              <Badge variant="outline" className="text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <Lock className="h-3 w-3 mr-1" />
                                Private
                              </Badge>
                            )}
                          </div>
                          {collection.description && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {collection.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FolderKanban className="h-3 w-3" />
                              {collection.documentCount ?? collection.documentIds.length} document(s)
                            </span>
                            {collection.memberIds.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {collection.memberIds.length} member(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

