"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiFetch } from "@/lib/dms-storage";
import { logError } from "@/lib/client-logger";
import { toast } from "sonner";
import { Mail, Send, Building2, User as UserIcon, Search, Loader2, AlertTriangle } from "lucide-react";
import type { DocumentRecord } from "@/lib/dms-storage";
import { filterUsersBySearch } from "@/lib/routing-utils";

interface CorrespondenceRoutingViewProps {
  document: DocumentRecord;
  onComplete?: () => void;
}

export function CorrespondenceRoutingView({
  document,
  onComplete,
}: CorrespondenceRoutingViewProps) {
  const { users, directorates, divisions, departments, offices, officeMemberships } = useOrganization();
  const { currentUser } = useCurrentUser();
  
  const [routeType, setRouteType] = useState<'person' | 'office'>('person');
  const [recipient, setRecipient] = useState<string>('');
  const [targetOfficeId, setTargetOfficeId] = useState<string>('');
  const [personSearchQuery, setPersonSearchQuery] = useState('');
  const [officeSearchQuery, setOfficeSearchQuery] = useState('');
  const [officeFilterDirectorate, setOfficeFilterDirectorate] = useState<string>('all');
  const [officeFilterDivision, setOfficeFilterDivision] = useState<string>('all');
  const [purpose, setPurpose] = useState<'action' | 'information' | 'comment' | 'approval'>('action');
  const [notes, setNotes] = useState<string>('');
  const [subject, setSubject] = useState<string>(document.title || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter users for person routing
  const filteredUsers = useMemo(() => {
    if (!personSearchQuery.trim()) return [];
    const baseUsers = users
      .filter((u) => (u.active ?? true))
      .filter((u) => (currentUser ? u.id !== currentUser.id : true));
    return filterUsersBySearch(baseUsers, personSearchQuery, {
      includeDivision: true,
      includeDepartment: true,
      includeEmail: true,
    }).slice(0, 10);
  }, [users, personSearchQuery, currentUser]);

  // Filter offices
  const filteredOffices = useMemo(() => {
    let filtered = offices.filter((o) => o.isActive);
    
    if (officeSearchQuery.trim()) {
      const query = officeSearchQuery.toLowerCase();
      filtered = filtered.filter((o) =>
        o.name.toLowerCase().includes(query) ||
        o.code?.toLowerCase().includes(query)
      );
    }
    
    if (officeFilterDirectorate !== 'all') {
      filtered = filtered.filter((o) => o.directorateId === officeFilterDirectorate);
    }
    
    if (officeFilterDivision !== 'all') {
      filtered = filtered.filter((o) => o.divisionId === officeFilterDivision);
    }
    
    return filtered.slice(0, 20);
  }, [offices, officeSearchQuery, officeFilterDirectorate, officeFilterDivision]);

  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error('User not found');
      return;
    }

    if (routeType === 'office' && !targetOfficeId) {
      toast.error('Please select an office');
      return;
    }
    if (routeType === 'person' && !recipient) {
      toast.error('Please select a person');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subject', subject.trim() || document.title || 'Document');
      formData.append('sender_name', currentUser.name || 'System');
      formData.append('sender_organization', 'Internal');
      formData.append('received_date', new Date().toISOString().split('T')[0]);
      formData.append('priority', priority);
      formData.append('source', 'internal');
      formData.append('direction', 'upward');
      formData.append('document_type', 'letter');
      
      if (routeType === 'office') {
        const office = offices.find((o) => o.id === targetOfficeId);
        if (office) {
          const primaryMember = officeMemberships.find(
            (m) => m.officeId === office.id && m.isPrimary && m.isActive
          );
          if (primaryMember) {
            formData.append('current_approver_id', primaryMember.userId);
          }
          formData.append('current_office', targetOfficeId);
        }
      } else {
        formData.append('current_approver_id', recipient);
      }

      const correspondenceResponse = await apiFetch<{ id: string; reference_number?: string }>(
        '/correspondence/items/',
        {
          method: 'POST',
          body: formData,
        }
      );

      await apiFetch(`/correspondence/document-links/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correspondence: correspondenceResponse.id,
          document: document.id,
          notes: notes.trim() || undefined,
        }),
      });

      if (notes.trim()) {
        await apiFetch('/correspondence/minutes/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            correspondence: correspondenceResponse.id,
            user_id: currentUser.id,
            action_type: 'minute',
            minute_text: notes.trim(),
            direction: 'upward',
            step_number: 1,
          }),
        });
      }

      toast.success('Document sent via correspondence', {
        description: `Reference: ${correspondenceResponse.reference_number || correspondenceResponse.id}`,
        action: {
          label: 'View',
          onClick: () => {
            window.open(`/correspondence/${correspondenceResponse.id}`, '_blank');
          },
        },
      });

      onComplete?.();
    } catch (error: unknown) {
      logError('Failed to create correspondence', error);
      toast.error('Failed to send document via correspondence');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Send Document via Correspondence
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Create a correspondence item and route this document to a person or office for action.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="corr-subject">Subject</Label>
          <Input
            id="corr-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Correspondence subject"
          />
        </div>

        <div className="space-y-2">
          <Label>Route To</Label>
          <RadioGroup value={routeType} onValueChange={(value) => setRouteType(value as 'person' | 'office')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="person" id="route-person" />
              <Label htmlFor="route-person" className="font-normal cursor-pointer flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Person
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="office" id="route-office" />
              <Label htmlFor="route-office" className="font-normal cursor-pointer flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Office
              </Label>
            </div>
          </RadioGroup>
        </div>

        {routeType === 'person' ? (
          <div className="space-y-2">
            <Label htmlFor="person-search">Search Person</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="person-search"
                value={personSearchQuery}
                onChange={(e) => setPersonSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="pl-8"
              />
            </div>
            {personSearchQuery && (
              <ScrollArea className="h-40 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2 text-center">No users found</p>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`p-2 rounded cursor-pointer transition-colors ${
                          recipient === user.id
                            ? 'bg-primary/10 border border-primary'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setRecipient(user.id)}
                      >
                        <p className="text-sm font-medium">{user.name}</p>
                        {user.email && (
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Directorate</Label>
                <Select value={officeFilterDirectorate} onValueChange={setOfficeFilterDirectorate}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Directorates</SelectItem>
                    {directorates.map((dir) => (
                      <SelectItem key={dir.id} value={dir.id}>
                        {dir.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Division</Label>
                <Select value={officeFilterDivision} onValueChange={setOfficeFilterDivision}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {divisions
                      .filter((div) => 
                        officeFilterDirectorate === 'all' || div.directorateId === officeFilterDirectorate
                      )
                      .map((div) => (
                        <SelectItem key={div.id} value={div.id}>
                          {div.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="office-search">Search Office</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="office-search"
                  value={officeSearchQuery}
                  onChange={(e) => setOfficeSearchQuery(e.target.value)}
                  placeholder="Search offices..."
                  className="pl-8"
                />
              </div>
              {officeSearchQuery && (
                <ScrollArea className="h-40 border rounded-md">
                  <div className="p-2 space-y-1">
                    {filteredOffices.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2 text-center">No offices found</p>
                    ) : (
                      filteredOffices.map((office) => (
                        <div
                          key={office.id}
                          className={`p-2 rounded cursor-pointer transition-colors ${
                            targetOfficeId === office.id
                              ? 'bg-primary/10 border border-primary'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => setTargetOfficeId(office.id)}
                        >
                          <p className="text-sm font-medium">{office.name}</p>
                          {office.code && (
                            <p className="text-xs text-muted-foreground">{office.code}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Purpose</Label>
            <Select value={purpose} onValueChange={(value) => setPurpose(value as typeof purpose)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="action">Action</SelectItem>
                <SelectItem value="information">Information</SelectItem>
                <SelectItem value="comment">Comment</SelectItem>
                <SelectItem value="approval">Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="corr-notes">Notes</Label>
          <Textarea
            id="corr-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes or instructions..."
            rows={3}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (routeType === 'person' && !recipient) || (routeType === 'office' && !targetOfficeId)}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send via Correspondence
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

