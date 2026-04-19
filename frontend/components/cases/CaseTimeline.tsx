"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Mail, FileCheck, User, Calendar, Clock, CheckCircle2, AlertCircle, Archive, FolderTree, Filter } from 'lucide-react';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { logError } from '@/lib/client-logger';
import { apiFetch } from '@/lib/api-client';
import type { CaseDetail } from '@/lib/npa-structure';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TimelineActivity {
  id: string;
  type: 'case_created' | 'status_change' | 'correspondence_linked' | 'document_linked' | 'form_linked' | 'assignment' | 'completion_package';
  timestamp: string;
  user: {
    id: string;
    name: string;
    email?: string;
  };
  description: string;
  metadata?: {
    old_status?: string;
    new_status?: string;
    item_title?: string;
    item_id?: string;
    item_type?: string;
  };
}

interface CaseTimelineProps {
  caseId: string;
  caseData: CaseDetail | null;
}

export const CaseTimeline = ({ caseId, caseData }: CaseTimelineProps) => {
  const { currentUser } = useCurrentUser();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const canViewAuditDetails = useMemo(() => {
    if (currentUser?.isSuperuser) return true;
    const role = (currentUser?.systemRole || "").toLowerCase();
    return role.includes("managing director")
      || role.includes("executive director")
      || role.includes("general manager")
      || role.includes("director")
      || role.includes("audit")
      || role.includes("super admin");
  }, [currentUser?.isSuperuser, currentUser?.systemRole]);

  useEffect(() => {
    if (!caseId) {
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loadTimeline = async () => {
      setLoading(true);
      setAuditError(null);
      try {
        // Try to fetch audit logs for this case, but handle gracefully if endpoint doesn't exist
        let auditLogs: Array<{
          id: string;
          action: string;
          timestamp: string;
          user: string | null;
          user_name: string;
          user_email?: string;
          description: string;
          metadata?: Record<string, unknown>;
        }> = [];
        
        try {
          const auditResponse = await apiFetch<Record<string, unknown>>(`/audit/logs/?object_type=case&object_id=${caseId}&ordering=-timestamp`, {
            signal,
          });
          
          if (signal.aborted) return;
          
          // Handle paginated response (with results property) or direct array
          if (Array.isArray(auditResponse)) {
            auditLogs = auditResponse;
          } else if (auditResponse && Array.isArray(auditResponse.results)) {
            auditLogs = auditResponse.results;
          } else {
            // If response is not in expected format, default to empty array
            auditLogs = [];
            logError('Unexpected audit logs response format', { response: auditResponse });
          }
        } catch (auditErr: unknown) {
          if (auditErr instanceof Error && auditErr.name === 'AbortError') return;
          // If audit endpoint doesn't exist or returns 404, just log and continue
          if ((auditErr instanceof Error && 'status' in auditErr && (auditErr as any).status === 404) || (auditErr instanceof Error && auditErr.message?.includes('Not found'))) {
            setAuditError("Audit logs unavailable");
            logError('Audit logs endpoint not found, continuing without audit data', auditErr);
          } else {
            setAuditError("Failed to load audit logs");
            logError('Failed to fetch audit logs', auditErr);
          }
          // Continue with case data only
          auditLogs = [];
        }

        // Ensure auditLogs is an array before mapping
        if (!Array.isArray(auditLogs)) {
          auditLogs = [];
        }

        // Transform audit logs to timeline activities
        const timelineActivities: TimelineActivity[] = auditLogs.map((log) => ({
          id: log.id,
          type: log.action as TimelineActivity['type'],
          timestamp: log.timestamp,
          user: {
            id: log.user || '',
            name: log.user_name || 'System',
            email: log.user_email,
          },
          description: log.description,
          metadata: log.metadata,
        }));

        // Add case creation activity
        if (caseData) {
          timelineActivities.unshift({
            id: `case-created-${caseData.id}`,
            type: 'case_created',
            timestamp: caseData.openedAt || caseData.createdAt,
            user: {
              id: caseData.createdById || '',
              name: caseData.createdByName || 'System',
            },
            description: `Case ${caseData.caseNumber} created: ${caseData.title}`,
          });

          // Add status changes from case data
          if (caseData.statusHistory) {
            caseData.statusHistory.forEach((statusChange) => {
              timelineActivities.push({
                id: `status-${statusChange.timestamp}`,
                type: 'status_change',
                timestamp: statusChange.timestamp,
                user: {
                  id: statusChange.changedBy?.id || '',
                  name: statusChange.changedBy?.name || 'System',
                },
                description: `Status changed to ${statusChange.status}`,
                metadata: {
                  old_status: statusChange.previousStatus,
                  new_status: statusChange.status,
                },
              });
            });
          }

          // Add linked items
          if (caseData.correspondence && caseData.correspondence.length > 0) {
            caseData.correspondence.forEach((corr) => {
              const correspondenceLabel =
                corr.subject?.trim() ||
                corr.referenceNumber?.trim() ||
                "Correspondence";
              timelineActivities.push({
                id: `corr-${corr.id}`,
                type: 'correspondence_linked',
                timestamp: corr.linkedAt || corr.createdAt,
                user: {
                  id: corr.createdById || '',
                  name: corr.createdByName || 'System',
                },
                description: `Correspondence linked: ${correspondenceLabel}`,
                metadata: {
                  item_title: correspondenceLabel,
                  item_id: corr.id,
                  item_type: 'correspondence',
                },
              });
            });
          }

          if (caseData.documents && caseData.documents.length > 0) {
            caseData.documents.forEach((doc) => {
              const documentLabel = doc.documentTitle?.trim() || `Document ${doc.documentId}`;
              timelineActivities.push({
                id: `doc-${doc.id}`,
                type: 'document_linked',
                timestamp: doc.createdAt,
                user: {
                  id: '',
                  name: 'System',
                },
                description: `Document linked: ${documentLabel}`,
                metadata: {
                  item_title: documentLabel,
                  item_id: doc.id,
                  item_type: 'document',
                },
              });
            });
          }

          if (caseData.forms && caseData.forms.length > 0) {
            caseData.forms.forEach((form) => {
              const formLabel = form.formTitle?.trim() || `Form ${form.formDocumentId}`;
              timelineActivities.push({
                id: `form-${form.id}`,
                type: 'form_linked',
                timestamp: form.createdAt,
                user: {
                  id: '',
                  name: 'System',
                },
                description: `Form linked: ${formLabel}`,
                metadata: {
                  item_title: formLabel,
                  item_id: form.id,
                  item_type: 'form',
                },
              });
            });
          }

          // Add completion package if exists
          if (caseData.completionPackage) {
            timelineActivities.push({
              id: `completion-${caseData.completionPackage.id}`,
              type: 'completion_package',
              timestamp: caseData.completionPackageGeneratedAt || caseData.closedAt || '',
              user: {
                id: caseData.createdById || '',
                  name: (caseData as any).createdByName || 'System',
              },
              description: `Completion package generated`,
              metadata: {
                item_title: caseData.completionPackage.title,
                item_id: caseData.completionPackage.id,
                item_type: 'document',
              },
            });
          }
        }

        // Sort by timestamp (newest first)
        timelineActivities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        if (signal.aborted) return;

        setActivities(timelineActivities);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        logError('Failed to load case timeline', error);
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadTimeline();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [caseId, caseData]);

  const getActivityIcon = (type: TimelineActivity['type']) => {
    switch (type) {
      case 'case_created':
        return <FolderTree className="h-4 w-4 text-primary" />;
      case 'status_change':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case 'correspondence_linked':
        return <Mail className="h-4 w-4 text-green-500" />;
      case 'document_linked':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'form_linked':
        return <FileCheck className="h-4 w-4 text-orange-500" />;
      case 'assignment':
        return <User className="h-4 w-4 text-amber-500" />;
      case 'completion_package':
        return <Archive className="h-4 w-4 text-emerald-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filteredActivities = useMemo(() => {
    if (filterType === 'all') {
      return activities;
    }
    return activities.filter(activity => activity.type === filterType);
  }, [activities, filterType]);
  
  const getActivityBadge = (type: TimelineActivity['type']) => {
    switch (type) {
      case 'case_created':
        return <Badge variant="default">Created</Badge>;
      case 'status_change':
        return <Badge variant="secondary">Status</Badge>;
      case 'correspondence_linked':
        return <Badge variant="outline" className="bg-green-50 dark:bg-green-950">Correspondence</Badge>;
      case 'document_linked':
        return <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950">Document</Badge>;
      case 'form_linked':
        return <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950">Form</Badge>;
      case 'assignment':
        return <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950">Assignment</Badge>;
      case 'completion_package':
        return <Badge variant="default" className="bg-emerald-600">Package</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No timeline activities yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (filteredActivities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeline
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]" aria-label="Filter timeline by activity type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="case_created">Case Created</SelectItem>
                  <SelectItem value="status_change">Status Changes</SelectItem>
                  <SelectItem value="correspondence_linked">Correspondence</SelectItem>
                  <SelectItem value="document_linked">Documents</SelectItem>
                  <SelectItem value="form_linked">Forms</SelectItem>
                  <SelectItem value="assignment">Assignments</SelectItem>
                  <SelectItem value="completion_package">Completion Packages</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activities match the selected filter</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]" aria-label="Filter timeline by activity type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="case_created">Case Created</SelectItem>
                <SelectItem value="status_change">Status Changes</SelectItem>
                <SelectItem value="correspondence_linked">Correspondence</SelectItem>
                <SelectItem value="document_linked">Documents</SelectItem>
                <SelectItem value="form_linked">Forms</SelectItem>
                <SelectItem value="assignment">Assignments</SelectItem>
                <SelectItem value="completion_package">Completion Packages</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {auditError && (
          <Alert variant="default" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {auditError}. Showing timeline from case data only.
            </AlertDescription>
          </Alert>
        )}
        
        <ScrollArea className="h-[600px]" aria-label="Case timeline">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" aria-hidden="true" />
            
            <div className="space-y-6" role="list">
              {filteredActivities.map((activity, index) => (
                <div key={activity.id} className="relative flex gap-4" role="listitem">
                  {/* Icon */}
                  <div className="relative z-10 flex-shrink-0" aria-hidden="true">
                    <div className="h-12 w-12 rounded-full bg-background border-2 border-border flex items-center justify-center">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-6">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getActivityBadge(activity.type)}
                        <span className="text-sm font-medium">{activity.user.name}</span>
                      </div>
                      <time className="text-xs text-muted-foreground whitespace-nowrap" dateTime={activity.timestamp}>
                        {formatDateTime(activity.timestamp)}
                      </time>
                    </div>
                    <p className="text-sm text-foreground mb-2">{activity.description}</p>
                    
                    {/* Metadata */}
                    {activity.metadata && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        {activity.metadata.old_status && activity.metadata.new_status && (
                          <div className="flex items-center gap-2">
                            <span className="line-through">{activity.metadata.old_status.replace('_', ' ')}</span>
                            <span aria-label="changed to">→</span>
                            <span className="font-medium">{activity.metadata.new_status.replace('_', ' ')}</span>
                          </div>
                        )}
                        {activity.metadata.item_title && (
                          <div className="flex items-center gap-1">
                            <span>Item:</span>
                            <span className="font-medium">{activity.metadata.item_title}</span>
                          </div>
                        )}
                        {canViewAuditDetails && activity.metadata.item_id && (
                          <div className="flex items-center gap-1">
                            <span>ID:</span>
                            <span className="font-mono">{activity.metadata.item_id}</span>
                          </div>
                        )}
                        {canViewAuditDetails && activity.metadata.item_type && (
                          <div className="flex items-center gap-1">
                            <span>Type:</span>
                            <span className="font-medium">{activity.metadata.item_type}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Expandable Details */}
                    {canViewAuditDetails && (activity.metadata || activity.user.email) && (
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newExpanded = new Set(expandedActivities);
                            if (newExpanded.has(activity.id)) {
                              newExpanded.delete(activity.id);
                            } else {
                              newExpanded.add(activity.id);
                            }
                            setExpandedActivities(newExpanded);
                          }}
                          className="h-6 text-xs"
                          aria-label={expandedActivities.has(activity.id) ? "Hide details" : "Show details"}
                        >
                          {expandedActivities.has(activity.id) ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Show Details
                            </>
                          )}
                        </Button>
                        
                        {expandedActivities.has(activity.id) && (
                          <div className="mt-2 p-3 bg-muted rounded-md space-y-2 text-xs">
                            {activity.user.email && (
                              <div>
                                <span className="font-medium">User Email:</span> {activity.user.email}
                              </div>
                            )}
                            {activity.user.id && (
                              <div>
                                <span className="font-medium">User ID:</span> <span className="font-mono">{activity.user.id}</span>
                              </div>
                            )}
                            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                              <div>
                                <span className="font-medium">Full Metadata:</span>
                                <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-32">
                                  {JSON.stringify(activity.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
