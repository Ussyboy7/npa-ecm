"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, Search, Calendar, FileText, QrCode, Filter, ExternalLink, Eye, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { apiFetch, getBaseUrl, getStoredAccessToken } from "@/lib/api-client";
import { format } from "date-fns";
import { toast } from "sonner";
import { SealBadge } from "@/components/seals/SealBadge";
import { EmptyState } from "@/components/shared/EmptyState";

interface ExecutiveApproval {
  id: string;
  correspondenceId: string;
  correspondenceSubject: string;
  correspondenceReference: string;
  sealedBy: string;
  sealedByRole: string;
  officeName: string;
  officeTitle: string;
  sealedAt: string;
  serialNumber: string;
  verificationUrl: string;
  isValid: boolean;
  sealData?: {
    id: string;
    serialNumber: string;
    verificationUrl: string;
    sealedBy: string;
    officeName: string;
    officeTitle: string;
    sealedAt: string;
    isValid: boolean;
    sealImageUrl?: string;
  };
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<ExecutiveApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      // Fetch minutes with executive seals (APPROVE action type with seal_data)
      const response = await apiFetch<any>("/correspondence/minutes/?action_type=approve&page_size=1000");
      const minutes = Array.isArray(response) ? response : response.results || [];
      
      // Filter for minutes with seal data (executive approvals)
      const executiveApprovals = minutes
        .filter((m: any) => m.seal_data && m.seal_data.is_valid !== false)
        .map((m: any) => ({
          id: m.id,
          correspondenceId: m.correspondence,
          correspondenceSubject: m.correspondence_details?.subject || "N/A",
          correspondenceReference: m.correspondence_details?.reference_number || "N/A",
          sealedBy: m.user?.first_name && m.user?.last_name 
            ? `${m.user.first_name} ${m.user.last_name}` 
            : m.user?.username || "Unknown",
          sealedByRole: m.user?.system_role_name || m.grade_level || "Executive",
          officeName: m.seal_data.office_name,
          officeTitle: m.seal_data.office_title,
          sealedAt: m.seal_data.sealed_at || m.timestamp,
          serialNumber: m.seal_data.serial_number,
          verificationUrl: m.seal_data.verification_url,
          isValid: m.seal_data.is_valid,
          sealData: m.seal_data ? {
            id: String(m.seal_data.id),
            serialNumber: m.seal_data.serial_number ?? '',
            verificationUrl: m.seal_data.verification_url ?? '',
            sealedBy: m.seal_data.sealed_by ?? '',
            officeName: m.seal_data.office_name ?? '',
            officeTitle: m.seal_data.office_title ?? '',
            sealedAt: m.seal_data.sealed_at ?? '',
            isValid: m.seal_data.is_valid ?? true,
            sealImageUrl: m.seal_data.seal_image_url ?? undefined,
          } : undefined,
        }));
      
      setApprovals(executiveApprovals);
    } catch (error) {
      console.error("Failed to load approvals:", error);
      toast.error("Failed to load executive approvals");
    } finally {
      setLoading(false);
    }
  };

  const filteredApprovals = approvals.filter((approval) => {
    const matchesSearch = 
      approval.correspondenceSubject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.correspondenceReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.sealedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === "all" || 
      approval.sealedByRole.toLowerCase().includes(filterRole.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "valid" && approval.isValid) ||
      (filterStatus === "invalid" && !approval.isValid);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (filterRole !== "all") count++;
    if (filterStatus !== "all") count++;
    return count;
  }, [searchTerm, filterRole, filterStatus]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterRole("all");
    setFilterStatus("all");
  };

  const toggleRole = (role: string) => {
    setFilterRole(role === filterRole ? "all" : role);
  };

  const toggleStatus = (status: string) => {
    setFilterStatus(status === filterStatus ? "all" : status);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8 text-emerald-600" />
              Executive Approvals
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and verify all executive approvals with digital seals
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" /> Filters
              {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>}
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total Approvals',
              value: approvals.length,
              icon: Shield,
              bgClass: 'bg-primary/10',
              iconClass: 'text-primary',
            },
            {
              label: 'Valid Seals',
              value: approvals.filter(a => a.isValid).length,
              icon: CheckCircle2,
              bgClass: 'bg-emerald-500/10',
              iconClass: 'text-emerald-600 dark:text-emerald-500',
            },
            {
              label: 'Invalid Seals',
              value: approvals.filter(a => !a.isValid).length,
              icon: XCircle,
              bgClass: 'bg-destructive/10',
              iconClass: 'text-destructive',
            },
            {
              label: 'This Month',
              value: approvals.filter(a => {
                const date = new Date(a.sealedAt);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              }).length,
              icon: TrendingUp,
              bgClass: 'bg-blue-500/10',
              iconClass: 'text-blue-600 dark:text-blue-500',
            },
          ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label} className="shadow-soft hover:shadow-medium transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${bgClass}`}>
                    <Icon className={`h-6 w-6 ${iconClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Approval Filters</CardTitle>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear All</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Role</Label>
                  <div className="flex flex-wrap gap-1">
                    {['managing director', 'executive director'].map((role) => (
                      <Badge
                        key={role}
                        variant={filterRole === role ? 'default' : 'outline'}
                        className="cursor-pointer capitalize text-xs"
                        onClick={() => toggleRole(role)}
                      >
                        {role}
                      </Badge>
                    ))}
                    {filterRole !== 'all' && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer text-xs"
                        onClick={() => setFilterRole('all')}
                      >
                        All Roles
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <div className="flex flex-wrap gap-1">
                    {['valid', 'invalid'].map((status) => (
                      <Badge
                        key={status}
                        variant={filterStatus === status ? 'default' : 'outline'}
                        className="cursor-pointer capitalize text-xs"
                        onClick={() => toggleStatus(status)}
                      >
                        {status}
                      </Badge>
                    ))}
                    {filterStatus !== 'all' && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer text-xs"
                        onClick={() => setFilterStatus('all')}
                      >
                        All Status
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by subject, reference, executive, or serial number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Approvals Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Approvals ({filteredApprovals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredApprovals.length === 0 ? (
              <EmptyState
                icon={Shield}
                title="No executive approvals found"
                description={
                  activeFilterCount > 0 
                    ? "Try adjusting your filters to see more results."
                    : "Executive approvals will appear here once they are created."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Correspondence</TableHead>
                      <TableHead className="w-[180px]">Executive</TableHead>
                      <TableHead className="w-[120px]">Serial Number</TableHead>
                      <TableHead className="w-[150px]">Sealed At</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovals.map((approval) => (
                      <TableRow key={approval.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{approval.correspondenceReference}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {approval.correspondenceSubject}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{approval.sealedBy}</div>
                            <div className="text-xs text-muted-foreground truncate">{approval.sealedByRole}</div>
                            <div className="text-xs text-muted-foreground truncate">{approval.officeTitle}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded block truncate max-w-full">
                            {approval.serialNumber}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {format(new Date(approval.sealedAt), "MMM d, yyyy")}
                            <div className="text-muted-foreground mt-0.5">
                              {format(new Date(approval.sealedAt), "h:mm a")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {approval.sealData && (
                            <SealBadge sealData={approval.sealData} size="sm" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                try {
                                  const pdfUrl = `${getBaseUrl()}/correspondence/minutes/${approval.id}/approval-pdf/`;
                                  const pdfBlob = await apiFetch<Blob>(pdfUrl, { responseType: 'blob' });
                                  const blobUrl = URL.createObjectURL(pdfBlob);
                                  window.open(blobUrl, '_blank');
                                  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                                } catch (error) {
                                  console.error("Failed to load PDF:", error);
                                  toast.error(`Failed to load PDF: ${error instanceof Error ? error.message : String(error)}`);
                                }
                              }}
                              title="View Approval PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => router.push(`/correspondence/${approval.correspondenceId}`)}
                              title="View Correspondence Details"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => window.open(approval.verificationUrl, '_blank')}
                              title="Verify Seal with QR Code"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

