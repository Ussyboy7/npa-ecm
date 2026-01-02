"use client";

import { useState, useEffect } from 'react';
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, ExternalLink, Calendar, User as UserIcon, Building2, ArrowUp, ArrowDown, RefreshCw, MessageSquare, ChevronDown, ChevronUp, Clock, Send, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDateShort, formatDateTime } from '@/lib/correspondence-helpers';
import type { Correspondence, Minute } from '@/lib/npa-structure';
import type { User, Division, Department } from '@/lib/npa-structure';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RelatedCorrespondenceCardProps {
  relatedCorrespondence: Array<{
    correspondence: Correspondence;
    minutes: Minute[];
    linkNotes?: string;
  }>;
  userLookup: Map<string, User>;
  divisionLookup: Map<string, string>;
  departmentLookup: Map<string, string>;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}

export const RelatedCorrespondenceCard = ({
  relatedCorrespondence,
  userLookup,
  divisionLookup,
  departmentLookup,
  onRefresh,
  isLoading = false,
}: RelatedCorrespondenceCardProps) => {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Expand all correspondence by default to show routing history immediately
  const [expandedCorrespondence, setExpandedCorrespondence] = useState<Set<string>>(() => 
    new Set(relatedCorrespondence.map(item => item.correspondence.id))
  );
  
  // Update expanded state when relatedCorrespondence changes - ensure all are expanded by default
  useEffect(() => {
    if (relatedCorrespondence.length > 0) {
      // Always expand all correspondence by default to show routing history immediately
      const allIds = new Set(relatedCorrespondence.map(item => item.correspondence.id));
      setExpandedCorrespondence(allIds);
    }
  }, [relatedCorrespondence]);

  const getPriorityVariant = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'in-progress':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast.success('Related correspondence refreshed');
    } catch (error) {
      toast.error('Failed to refresh related correspondence');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Debug logging
  useEffect(() => {
    logInfo('[RelatedCorrespondenceCard] Rendering with:', {
      relatedCorrespondenceCount: relatedCorrespondence.length,
      expandedCount: expandedCorrespondence.size,
      relatedCorrespondence: relatedCorrespondence.map(item => ({
        id: item.correspondence.id,
        referenceNumber: item.correspondence.referenceNumber,
        minutesCount: item.minutes.length,
        minutes: item.minutes.map(m => ({
          id: m.id,
          actionType: m.actionType,
          minuteText: m.minuteText?.substring(0, 50),
          userId: m.userId,
          timestamp: m.timestamp
        }))
      }))
    });
  }, [relatedCorrespondence, expandedCorrespondence]);

  return (
    <Card className="flex flex-col flex-1 min-h-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link className="h-4 w-4 text-primary" />
              Related Correspondence
              {relatedCorrespondence.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {relatedCorrespondence.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Workflows that reference this document, including minute history.</CardDescription>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              aria-label="Refresh related correspondence"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 min-h-0 flex flex-col">
        {relatedCorrespondence.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium mb-1">No related correspondence</p>
            <p className="text-xs">This document hasn't been linked to any correspondence workflows.</p>
          </div>
        ) : (
          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {relatedCorrespondence.map(({ correspondence, minutes, linkNotes }) => {
              logInfo(`[RelatedCorrespondenceCard] Rendering correspondence ${correspondence.id}:`, {
                minutesCount: minutes.length,
                minutes: minutes,
                isExpanded: expandedCorrespondence.has(correspondence.id)
              });
              
              const createdBy = userLookup.get(correspondence.createdById ?? '');
              const currentApprover = userLookup.get(correspondence.currentApproverId ?? '');
              const divisionName = correspondence.divisionId
                ? divisionLookup.get(correspondence.divisionId)
                : undefined;
              const departmentName = correspondence.departmentId
                ? departmentLookup.get(correspondence.departmentId)
                : undefined;

              return (
                <div
                  key={correspondence.id}
                  className="border rounded-lg p-3 space-y-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Button
                          variant="link"
                          className="h-auto p-0 font-semibold text-sm text-primary hover:underline"
                          onClick={() => router.push(`/correspondence/${correspondence.id}`)}
                          aria-label={`View correspondence ${correspondence.referenceNumber}`}
                        >
                          {correspondence.referenceNumber || 'N/A'}
                        </Button>
                        <Badge
                          variant={getStatusVariant(correspondence.status)}
                          className="text-xs capitalize"
                        >
                          {correspondence.status?.replace('-', ' ') || 'Unknown'}
                        </Badge>
                        <Badge variant={getPriorityVariant(correspondence.priority)} className="text-xs">
                          {correspondence.priority?.toUpperCase() || 'MEDIUM'}
                        </Badge>
                        {correspondence.direction === 'downward' ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <ArrowDown className="h-3 w-3 text-info" />
                            Downward
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1">
                            <ArrowUp className="h-3 w-3 text-success" />
                            Upward
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">{correspondence.subject}</p>
                      {linkNotes && (
                        <p className="text-xs text-muted-foreground italic">Link note: {linkNotes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => router.push(`/correspondence/${correspondence.id}`)}
                      aria-label="Open correspondence"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {createdBy && (
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="h-3 w-3" />
                        <span>Created by {createdBy.name}</span>
                      </div>
                    )}
                    {correspondence.receivedDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDateShort(correspondence.receivedDate)}</span>
                      </div>
                    )}
                    {divisionName && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" />
                        <span>{divisionName}</span>
                      </div>
                    )}
                    {departmentName && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" />
                        <span>{departmentName}</span>
                      </div>
                    )}
                  </div>

                  {/* Routing History & Minutes - Always show, even if no minutes yet */}
                  <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          Routing History {minutes.length > 0 && `(${minutes.length} ${minutes.length === 1 ? 'action' : 'actions'})`}
                        </p>
                        {minutes.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => {
                              const newExpanded = new Set(expandedCorrespondence);
                              if (newExpanded.has(correspondence.id)) {
                                newExpanded.delete(correspondence.id);
                              } else {
                                newExpanded.add(correspondence.id);
                              }
                              setExpandedCorrespondence(newExpanded);
                            }}
                            aria-label={expandedCorrespondence.has(correspondence.id) ? 'Collapse routing history' : 'Expand routing history'}
                          >
                            {expandedCorrespondence.has(correspondence.id) ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Collapse
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Expand
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {minutes.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/30">
                          <Clock className="h-4 w-4 mx-auto mb-2 opacity-50" />
                          <p className="font-medium mb-1">No routing actions yet</p>
                          <p>This correspondence hasn't been routed or minuted yet.</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs mt-2"
                            onClick={() => router.push(`/correspondence/${correspondence.id}`)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open Correspondence to Add Minutes
                          </Button>
                        </div>
                      ) : expandedCorrespondence.has(correspondence.id) ? (
                        <ScrollArea className="max-h-[400px]">
                          <div className="space-y-2 pr-4">
                            {minutes.map((minute, index) => {
                              const minuteUser = userLookup.get(minute.userId);
                              const minuteDirection = minute.direction || 'downward';
                              const toUser = minute.toUserId ? userLookup.get(minute.toUserId) : null;
                              const toOfficeName = minute.toOfficeName;
                              
                              return (
                                <div
                                  key={minute.id}
                                  className="relative pl-6 pb-4 border-l-2 border-primary/20 last:border-l-0 last:pb-0"
                                >
                                  {/* Timeline dot */}
                                  <div className="absolute left-0 top-1.5 -translate-x-1/2">
                                    <div className="h-3 w-3 rounded-full bg-primary border-2 border-background" />
                                  </div>
                                  
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-semibold text-foreground">
                                        Step {minute.stepNumber || index + 1}
                                      </span>
                                      <Badge 
                                        variant={minute.actionType === 'approve' ? 'default' : minute.actionType === 'reject' ? 'destructive' : 'outline'} 
                                        className="text-[10px] h-4"
                                      >
                                        {minute.actionType || 'minute'}
                                      </Badge>
                                      {minute.isRecalled && (
                                        <Badge variant="destructive" className="text-[10px] h-4">
                                          Recalled
                                        </Badge>
                                      )}
                                      {minuteDirection === 'downward' ? (
                                        <Badge variant="outline" className="text-[10px] h-4 gap-0.5">
                                          <ArrowDown className="h-2.5 w-2.5 text-info" />
                                          Outward
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px] h-4 gap-0.5">
                                          <ArrowUp className="h-2.5 w-2.5 text-success" />
                                          Inward
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <UserIcon className="h-3 w-3" />
                                      <span className="font-medium">{minuteUser?.name ?? 'Unknown'}</span>
                                      {minute.actedBySecretary && (
                                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                                          Secretary
                                        </Badge>
                                      )}
                                      {minute.actedByAssistant && (
                                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                                          {minute.assistantType || 'Assistant'}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {(toUser || toOfficeName) && (
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Send className="h-3 w-3" />
                                        <span>
                                          Routed to: {toUser ? toUser.name : toOfficeName || 'Unknown'}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {minute.minuteText && (
                                      <div className={`p-2 bg-muted/50 rounded text-xs text-foreground ${minute.isRecalled ? 'opacity-60 line-through' : ''}`}>
                                        {minute.minuteText}
                                      </div>
                                    )}
                                    
                                    {minute.recallReason && (
                                      <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                                        <span className="font-medium">Recall reason:</span> {minute.recallReason}
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>{formatDateTime(minute.timestamp)}</span>
                                      {minute.recalledAt && (
                                        <>
                                          <span>•</span>
                                          <span className="text-destructive">Recalled {formatDateTime(minute.recalledAt)}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="space-y-1.5">
                          {minutes.slice(0, 2).map((minute) => {
                            const minuteUser = userLookup.get(minute.userId);
                            const minuteDirection = minute.direction || 'downward';
                            return (
                              <div
                                key={minute.id}
                                className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                    <span className={`font-medium ${minute.isRecalled ? 'line-through opacity-60' : ''}`}>{minuteUser?.name ?? 'Unknown'}</span>
                                    <Badge variant="outline" className="text-[10px] h-4">
                                      {minute.actionType || 'minute'}
                                    </Badge>
                                    {minute.isRecalled && (
                                      <Badge variant="destructive" className="text-[10px] h-4">
                                        Recalled
                                      </Badge>
                                    )}
                                    {minuteDirection === 'downward' ? (
                                      <Badge variant="outline" className="text-[10px] h-4 gap-0.5">
                                        <ArrowDown className="h-2.5 w-2.5 text-info" />
                                        Outward
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] h-4 gap-0.5">
                                        <ArrowUp className="h-2.5 w-2.5 text-success" />
                                        Inward
                                      </Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatDateTime(minute.timestamp)}
                                    </span>
                                  </div>
                                  {minute.minuteText && (
                                    <p className={`text-muted-foreground line-clamp-2 ${minute.isRecalled ? 'line-through opacity-60' : ''}`}>{minute.minuteText}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {minutes.length > 2 && (
                            <p className="text-xs text-muted-foreground text-center py-1">
                              + {minutes.length - 2} more actions. Click "Expand" to view full routing history.
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Distribution (CC) Section */}
                      {correspondence.distribution && correspondence.distribution.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs font-medium text-muted-foreground">
                              Distribution (CC) ({correspondence.distribution.length} {correspondence.distribution.length === 1 ? 'recipient' : 'recipients'})
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            {correspondence.distribution.map((recipient, idx) => {
                              // Use the exact name from the API - what was selected at minute creation time
                              const recipientName = recipient.name || 'Unknown';
                              
                              return (
                                <div key={recipient.id || idx} className="flex items-start gap-2 text-xs">
                                  <Badge variant="outline" className="text-[10px] h-4 flex-shrink-0">
                                    {recipient.type === 'directorate' ? 'Dir' : recipient.type === 'department' ? 'Dept' : 'Div'}
                                  </Badge>
                                  <span className="text-muted-foreground flex-1">{recipientName}</span>
                                  {recipient.purpose && (
                                    <Badge variant="outline" className="text-[10px] h-4 flex-shrink-0">
                                      {recipient.purpose === 'information' ? 'Info' : recipient.purpose === 'action' ? 'Action' : 'Comment'}
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs w-full"
                          onClick={() => router.push(`/correspondence/${correspondence.id}`)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Full Correspondence & Routing History
                        </Button>
                      </div>
                    </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


