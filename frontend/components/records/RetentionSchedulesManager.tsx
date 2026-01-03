"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Search, Loader2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { getRetentionSchedules } from '@/lib/records-storage';
import { toast } from 'sonner';
import { formatDate } from '@/lib/correspondence-helpers';
import { Alert, AlertDescription } from '@/components/ui/alert';

import type { RetentionSchedule } from '@/lib/records-storage';

export const RetentionSchedulesManager = () => {
  const [schedules, setSchedules] = useState<RetentionSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadSchedules = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      
      const params: unknown = {};
      if (typeFilter !== 'all') {
        params.record_type = typeFilter;
      }
      
      const items = await getRetentionSchedules(params);
      setSchedules(items);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      logError('Failed to load retention schedules:', error);
      toast.error('Failed to load retention schedules');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    loadSchedules();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadSchedules]);

  const getStatusBadge = (schedule: RetentionSchedule) => {
    const now = new Date();
    const endDate = new Date(schedule.retention_end_date);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (!schedule.is_active) {
      return (
        <Badge variant="secondary">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Inactive
        </Badge>
      );
    }
    
    if (daysRemaining <= 0) {
      return (
        <Badge variant="secondary">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }
    
    if (daysRemaining <= 30) {
      return (
        <Badge variant="destructive">
          <Clock className="h-3 w-3 mr-1" />
          Expires in {daysRemaining} days
        </Badge>
      );
    }
    
    return (
      <Badge variant="default">
        <Clock className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'delete':
        return <Badge variant="destructive">Delete</Badge>;
      case 'archive':
        return <Badge variant="secondary">Archive</Badge>;
      case 'review':
        return <Badge variant="outline">Review</Badge>;
      case 'transfer':
        return <Badge variant="outline">Transfer</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const filteredSchedules = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return schedules.filter((schedule) => {
      const matchesSearch =
        schedule.record_id.toLowerCase().includes(searchLower) ||
        schedule.policy?.name?.toLowerCase().includes(searchLower);
      
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const now = new Date();
        const endDate = new Date(schedule.retention_end_date);
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (statusFilter === 'active') {
          matchesStatus = schedule.is_active && daysRemaining > 0;
        } else if (statusFilter === 'expired') {
          matchesStatus = !schedule.is_active || daysRemaining <= 0;
        }
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [schedules, searchTerm, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Retention Schedules</h2>
          <p className="text-muted-foreground text-sm mt-1">
            View retention schedules for all records in the system
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Retention Schedules</CardTitle>
              <CardDescription>
                {filteredSchedules.length} schedule{filteredSchedules.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40" aria-label="Filter by record type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="correspondence">Correspondence</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search schedules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                  aria-label="Search retention schedules"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' ? (
                <>
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No schedules found matching your filters</p>
                </>
              ) : (
                <>
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No retention schedules found</p>
                  <p className="text-sm mt-1">Schedules are automatically calculated when retention policies are applied</p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days Remaining</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.map((schedule) => {
                  const now = new Date();
                  const endDate = new Date(schedule.retention_end_date);
                  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium font-mono text-sm">{schedule.record_id}</div>
                          {schedule.disposition_created && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Disposition Created
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{schedule.record_type}</Badge>
                      </TableCell>
                      <TableCell>{schedule.policy?.name || 'N/A'}</TableCell>
                      <TableCell>{formatDate(schedule.retention_start_date)}</TableCell>
                      <TableCell>{formatDate(schedule.retention_end_date)}</TableCell>
                      <TableCell>
                        <span className={daysRemaining <= 30 && daysRemaining > 0 ? 'text-destructive font-semibold' : ''}>
                          {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                        </span>
                      </TableCell>
                      <TableCell>{getActionBadge(schedule.policy?.disposition_action || 'review')}</TableCell>
                      <TableCell>
                        {getStatusBadge(schedule)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

