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
import { Shield, Search, Calendar, FileText, QrCode, Filter } from "lucide-react";
import { Label } from "@/components/ui/label";
import { apiFetch, getBaseUrl, getStoredAccessToken } from "@/lib/api-client";
import { format } from "date-fns";
import { toast } from "sonner";
import { SealBadge } from "@/components/seals/SealBadge";

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Approvals</p>
                  <p className="text-2xl font-bold">{approvals.length}</p>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valid Seals</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {approvals.filter(a => a.isValid).length}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-emerald-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">
                    {approvals.filter(a => {
                      const date = new Date(a.sealedAt);
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Filtered Results</p>
                  <p className="text-2xl font-bold">{filteredApprovals.length}</p>
                </div>
                <Filter className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
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
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No executive approvals found</p>
                <p className="text-sm">
                  {activeFilterCount > 0 
                    ? "Try adjusting your filters to see more results."
                    : "Executive approvals will appear here once they are created."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Correspondence</TableHead>
                      <TableHead>Executive</TableHead>
                      <TableHead>Office</TableHead>
                      <TableHead>Sealed At</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovals.map((approval) => (
                      <TableRow key={approval.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <div className="font-medium">{approval.correspondenceReference}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {approval.correspondenceSubject}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{approval.sealedBy}</div>
                            <div className="text-xs text-muted-foreground">{approval.sealedByRole}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium">{approval.officeTitle}</div>
                            <div className="text-xs text-muted-foreground">{approval.officeName}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(approval.sealedAt), "PPp")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {approval.serialNumber}
                          </code>
                        </TableCell>
                        <TableCell>
                          {approval.sealData && (
                            <SealBadge sealData={approval.sealData} size="sm" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={async () => {
                                try {
                                  // Fetch PDF with authentication
                                  const token = getStoredAccessToken();
                                  if (!token) {
                                    toast.error("Authentication required");
                                    return;
                                  }
                                  
                                  const pdfUrl = `${getBaseUrl()}/correspondence/minutes/${approval.id}/approval-pdf/`;
                                  const response = await fetch(pdfUrl, {
                                    headers: {
                                      'Authorization': `Bearer ${token}`,
                                    },
                                    credentials: 'include',
                                  });
                                  
                                  if (!response.ok) {
                                    throw new Error(`Failed to load PDF: ${response.status}`);
                                  }
                                  
                                  // Create blob and open in new tab
                                  const blob = await response.blob();
                                  const blobUrl = URL.createObjectURL(blob);
                                  window.open(blobUrl, '_blank');
                                  
                                  // Clean up blob URL after a delay
                                  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                                } catch (error) {
                                  console.error("Failed to load PDF:", error);
                                  toast.error("Failed to load approval PDF");
                                }
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View PDF
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/correspondence/${approval.correspondenceId}`)}
                            >
                              Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(approval.verificationUrl, '_blank')}
                              title="Verify seal with QR code"
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

