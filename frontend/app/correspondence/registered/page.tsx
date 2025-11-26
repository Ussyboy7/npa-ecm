"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { useCorrespondence } from "@/contexts/CorrespondenceContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { formatDateShort } from "@/lib/correspondence-helpers";
import type { Correspondence } from "@/lib/npa-structure";

import { ChevronLeft, ChevronRight } from 'lucide-react';

const DEFAULT_PAGE_SIZE = 25;

const statusFilters = ["all", "pending", "in-progress", "completed", "archived"] as const;
const priorityFilters = ["all", "urgent", "high", "medium", "low"] as const;

type StatusFilter = (typeof statusFilters)[number];
type PriorityFilter = (typeof priorityFilters)[number];

const getPriorityBadgeVariant = (priority: Correspondence["priority"]) => {
  switch (priority) {
    case "urgent":
      return "destructive" as const;
    case "high":
      return "default" as const;
    case "medium":
      return "secondary" as const;
    case "low":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

const getStatusBadgeClass = (status: Correspondence["status"]) => {
  switch (status) {
    case "pending":
      return "bg-warning/10 text-warning";
    case "in-progress":
      return "bg-info/10 text-info";
    case "completed":
      return "bg-success/10 text-success";
    case "archived":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-foreground";
  }
};

const RegisteredCorrespondencePage = () => {
  const { correspondence, syncFromApi } = useCorrespondence();
  const { users, divisions, departments } = useOrganization();
  const { currentUser, hydrated } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [goToPageInput, setGoToPageInput] = useState('');

  useEffect(() => {
    void syncFromApi();
  }, [syncFromApi]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, priorityFilter, pageSize]);

  const canViewRegistry = permissions.canViewCorrespondenceRegistry;

  const searchableCorrespondence = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return correspondence
      .filter((item) => {
        if (statusFilter !== "all" && item.status !== statusFilter) {
          return false;
        }

        if (priorityFilter !== "all" && item.priority !== priorityFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const divisionName = item.divisionId
          ? divisions.find((division) => division.id === item.divisionId)?.name ?? ""
          : "";
        const registeredByName = item.createdById
          ? users.find((user) => user.id === item.createdById)?.name ?? ""
          : "";

        return (
          item.referenceNumber.toLowerCase().includes(normalizedSearch) ||
          item.subject.toLowerCase().includes(normalizedSearch) ||
          item.senderName.toLowerCase().includes(normalizedSearch) ||
          divisionName.toLowerCase().includes(normalizedSearch) ||
          registeredByName.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.receivedDate).getTime();
        const dateB = new Date(b.receivedDate).getTime();
        return dateB - dateA;
      });
  }, [
    correspondence,
    divisions,
    users,
    priorityFilter,
    searchQuery,
    statusFilter,
  ]);

  const totalCount = searchableCorrespondence.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedCorrespondence = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return searchableCorrespondence.slice(startIndex, startIndex + pageSize);
  }, [searchableCorrespondence, page, pageSize]);

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput, 10);
    if (pageNum >= 1 && pageNum <= pageCount) {
      setPage(pageNum);
      setGoToPageInput('');
    }
  };

  if (!hydrated && !currentUser) {
    return null;
  }

  if (!canViewRegistry) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Registered Correspondence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You do not have permission to view the correspondence registry. Executive access is
                available from Assistant General Manager grade and above. If you believe this is an
                error, please contact the ECM administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Registered Correspondence</h1>
              <p className="text-muted-foreground max-w-2xl">
                Executive registry of all inbound correspondence captured by the ECM. Use search and
                filters to audit registrations across directorates and support handovers when an
                office changes leadership.
              </p>
            </div>
          </div>

          <HelpGuideCard
            title="Executive Correspondence Registry"
            description="Review every correspondence entry captured by registry officers. Track who registered it, the receiving division, and the current workflow owner."
            links={[
              { label: "Correspondence Inbox", href: "/correspondence/inbox" },
              { label: "Archived", href: "/correspondence/archived" },
            ]}
          />
        </div>

        <Card>
          <CardHeader className="gap-4 md:flex md:items-center md:justify-between">
            <CardTitle className="text-lg font-semibold">Filters</CardTitle>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Input
                  placeholder="Search by subject, reference, division, or registrar"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pr-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "all" ? "All statuses" : status.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={priorityFilter}
                onValueChange={(value) => setPriorityFilter(value as PriorityFilter)}
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityFilters.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority === "all" ? "All priorities" : priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="max-h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Registered By</TableHead>
                    <TableHead>Current Owner</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCorrespondence.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        No correspondence matches the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCorrespondence.map((item, index) => {
                      const division = item.divisionId
                        ? divisions.find((divisionItem) => divisionItem.id === item.divisionId)
                        : undefined;
                      const registeredBy = item.createdById
                        ? users.find((user) => user.id === item.createdById)
                        : undefined;
                      const currentOwner = item.currentApproverId
                        ? users.find((user) => user.id === item.currentApproverId)
                        : undefined;
                      const registeredByName = registeredBy?.name ?? item.createdByName ?? '—';
                      const currentOwnerName = currentOwner?.name ?? item.currentApproverName ?? '—';

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{(page - 1) * pageSize + index + 1}</TableCell>
                          <TableCell>
                            <Link
                              href={`/correspondence/${item.id}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {item.referenceNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="truncate" title={item.subject}>
                              {item.subject}
                            </p>
                          </TableCell>
                          <TableCell>{division?.name ?? "—"}</TableCell>
                          <TableCell>{registeredByName}</TableCell>
                          <TableCell>{currentOwnerName}</TableCell>
                          <TableCell>{formatDateShort(item.receivedDate)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusBadgeClass(item.status)}>
                              {item.status.replace("-", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityBadgeVariant(item.priority)}>
                              {item.priority.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing{' '}
              {totalCount === 0
                ? 0
                : `${(page - 1) * pageSize + 1}-${Math.min(totalCount, (page - 1) * pageSize + paginatedCorrespondence.length)}`}{' '}
              of {totalCount} records
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="registered-page-size" className="text-sm text-muted-foreground">
                Per page:
              </label>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger id="registered-page-size" className="w-20 h-8" aria-label="Items per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                let pageNum: number;
                if (pageCount <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= pageCount - 2) {
                  pageNum = pageCount - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                if (pageNum > pageCount) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setPage(pageNum)}
                    aria-label={`Go to page ${pageNum}`}
                    aria-current={page === pageNum ? 'page' : undefined}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            {/* Go to page input */}
            {pageCount > 5 && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={goToPageInput}
                  onChange={(e) => setGoToPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGoToPage();
                    }
                  }}
                  placeholder="Page"
                  className="w-16 h-8 text-xs"
                  aria-label="Go to page number"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={handleGoToPage}
                  aria-label="Go to page"
                >
                  Go
                </Button>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
              disabled={page >= pageCount}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RegisteredCorrespondencePage;
