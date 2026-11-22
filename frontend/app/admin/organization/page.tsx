"use client";

import { useState, useEffect, useMemo, useCallback, Suspense, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { EmptyState } from "@/components/shared/EmptyState";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { OrganizationTabList } from "@/components/admin/OrganizationTabList";
import { PeopleAccessTab } from "@/components/admin/PeopleAccessTab";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrgUsers } from "@/hooks/use-org-users";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { usePagination } from "@/hooks/use-pagination";
import {
  Building2,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit3,
  Trash2,
  Users,
  Network,
  Search,
  Layers,
  FolderTree,
  MapPin,
  X,
} from "lucide-react";
import { useOrganization, type Directorate, type Division, type Department, type Office, type OfficeMembership } from "@/contexts/OrganizationContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registryQueueEmptyIconClass } from "@/components/shared/registry-queue-styles";
import { StatStrip, type StatStripItem } from "@/components/shared/StatStrip";
import { DirectorateFormModal } from "@/components/admin/DirectorateFormModal";
import { DirectorateLeadershipDialog } from "@/components/admin/DirectorateLeadershipDialog";
import { DivisionFormModal } from "@/components/admin/DivisionFormModal";
import { DepartmentFormModal } from "@/components/admin/DepartmentFormModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api-client";
import { fetchMembershipQuality, type MembershipQualitySummary } from "@/lib/office-memberships-client";
import type { Location } from "@/lib/organization-types";

import { cn } from "@/lib/utils";

type EntityType = "directorate" | "division" | "department";
type OrganizationTab = "structure" | "offices" | "locations" | "people";
type OfficesView = "directory" | "memberships";
const ORGANIZATION_TABS: OrganizationTab[] = ["structure", "offices", "locations", "people"];
const TAB_SUBTITLES: Record<OrganizationTab, string> = {
  structure: "Build the hierarchy from directorates down to departments, then assign leadership.",
  offices: "Offices are routing units. Assign people through memberships and set their physical location here.",
  locations: "Manage physical buildings, floors, and rooms where offices are situated.",
  people: "Manage users, roles, permissions, and assistant assignments across the organization.",
};
const SEARCH_PLACEHOLDERS: Record<OrganizationTab, string> = {
  structure: "Search directorates, divisions, or departments...",
  offices: "Search offices by name, code, or type...",
  locations: "Search locations by building, floor, or room...",
  people: "Search users, roles, or assistants...",
};
const MEMBERSHIPS_SUBTITLE = "Memberships assign a person to an office with register, route, and approve permissions.";
const MEMBERSHIPS_SEARCH_PLACEHOLDER = "Search memberships by office, user, or role...";

interface DeactivateTarget {
  type: EntityType;
  id: string;
  name: string;
}

function OrganizationFilters({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  children,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-muted/30 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        {children}
      </div>
    </div>
  );
}

function OrganizationSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/30">
      <div className="border-b border-border/50 px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

const OrganizationStructurePage = () => {
  return (
    <Suspense fallback={null}>
      <OrganizationStructureContent />
    </Suspense>
  );
};

const OrganizationStructureContent = () => {
  const router = useRouter();
  const { currentUser, hydrated } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const canAccessOrganization =
    permissions.canManageOrgStructure ||
    permissions.canManageUsers ||
    permissions.canManageRoles;

  useEffect(() => {
    if (hydrated && !canAccessOrganization) {
      router.replace("/dashboard", { scroll: false });
    }
  }, [hydrated, canAccessOrganization, router]);

  if (!hydrated || !canAccessOrganization) return null;
  return <OrganizationStructureAdminContent />;
};

const OrganizationStructureAdminContent = () => {
  const router = useRouter();
  const {
    directorates,
    divisions,
    departments,
    offices,
    fetchOfficeMemberships,
    deleteDirectorate,
    deleteDivision,
    deleteDepartment,
    addOfficeMembership,
    updateOfficeMembership,
    deleteOfficeMembership,
    refreshOrganizationData,
  } = useOrganization();
  const { currentUser, hydrated } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const canManageStructure = permissions.canManageOrgStructure;
  const canManageUsers = permissions.canManageUsers;
  const canManageRoles = permissions.canManageRoles;
  const canAccessPeople = canManageUsers || canManageRoles;
  const defaultPeopleSubtab = canManageUsers ? "users" : "roles";

  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") || "structure";
  const tabFromUrl: OrganizationTab = ORGANIZATION_TABS.includes(requestedTab as OrganizationTab)
    ? (requestedTab as OrganizationTab)
    : "structure";
  const officesViewFromUrl: OfficesView =
    tabFromUrl === "offices" && searchParams.get("view") === "memberships"
      ? "memberships"
      : "directory";
  const divisionFromUrl = searchParams.get("division") || "all";
  const membershipOfficeFromUrl = searchParams.get("office") || "all";
  const membershipUserFromUrl = searchParams.get("user") || "";
  const membershipStatusFromUrl = searchParams.get("status") === "all" ? "all" : "active";
  const membershipSearchFromUrl = searchParams.get("search") || "";
  const membershipPageFromUrl = Math.max(1, Number(searchParams.get("page")) || 1);
  const [searchQuery, setSearchQuery] = useState(
    officesViewFromUrl === "memberships" ? membershipSearchFromUrl : "",
  );
  const [activeTab, setActiveTab] = useState<OrganizationTab>(tabFromUrl);
  const [officesView, setOfficesView] = useState<OfficesView>(officesViewFromUrl);
  const [membershipCount, setMembershipCount] = useState(0);
  const [membershipRefreshVersion, setMembershipRefreshVersion] = useState(0);
  const [pagedMemberships, setPagedMemberships] = useState<OfficeMembership[]>([]);
  const [membershipQuality, setMembershipQuality] = useState<MembershipQualitySummary | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipOfficeFilter, setMembershipOfficeFilter] = useState(membershipOfficeFromUrl);
  const [membershipUserFilter, setMembershipUserFilter] = useState(membershipUserFromUrl);
  const [membershipStatusFilter, setMembershipStatusFilter] = useState<"active" | "all">(membershipStatusFromUrl);
  const isMembershipsView = activeTab === "offices" && officesView === "memberships";
  const [divisionFilter, setDivisionFilter] = useState(divisionFromUrl);
  useEffect(() => {
    setActiveTab(tabFromUrl);
    setOfficesView(officesViewFromUrl);
    setMembershipOfficeFilter(membershipOfficeFromUrl);
    setMembershipUserFilter(membershipUserFromUrl);
    setMembershipStatusFilter(membershipStatusFromUrl);
    setDivisionFilter(divisionFromUrl);
    setSearchQuery(officesViewFromUrl === "memberships" ? membershipSearchFromUrl : "");
    if (requestedTab !== tabFromUrl) {
      router.replace(`/admin/organization?tab=${tabFromUrl}`, { scroll: false });
    }
  }, [tabFromUrl, officesViewFromUrl, membershipOfficeFromUrl, membershipUserFromUrl, membershipStatusFromUrl, membershipSearchFromUrl, divisionFromUrl, requestedTab, router]);

  useEffect(() => {
    if (!hydrated) return;
    if (tabFromUrl === "people" && !canAccessPeople) {
      router.replace("/admin/organization?tab=structure", { scroll: false });
      return;
    }
    if (tabFromUrl !== "people" && !canManageStructure && canAccessPeople) {
      router.replace(`/admin/organization?tab=people&subtab=${defaultPeopleSubtab}`, { scroll: false });
    }
  }, [
    hydrated,
    tabFromUrl,
    canAccessPeople,
    canManageStructure,
    defaultPeopleSubtab,
    router,
  ]);
  
  // Expanded state for tree nodes
  const [expandedDirectorates, setExpandedDirectorates] = useState<Set<string>>(new Set());
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  
  // Modal states
  const [directorateFormOpen, setDirectorateFormOpen] = useState(false);
  const [directorateLeadershipOpen, setDirectorateLeadershipOpen] = useState(false);
  const [divisionFormOpen, setDivisionFormOpen] = useState(false);
  const [departmentFormOpen, setDepartmentFormOpen] = useState(false);
  
  // Selected entities for editing
  const [selectedDirectorate, setSelectedDirectorate] = useState<Directorate | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  
  // For creating new entities with parent context
  const [parentDirectorateId, setParentDirectorateId] = useState<string | null>(null);
  const [parentDivisionId, setParentDivisionId] = useState<string | null>(null);
  
  // Deactivate confirmation
  const [deactivateTarget, setDeactivateTarget] = useState<DeactivateTarget | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Location management
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationFormOpen, setLocationFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState({ building: "", floor: "", room: "", description: "" });
  const [savingLocation, setSavingLocation] = useState(false);

  // Office edit
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [officeEditOpen, setOfficeEditOpen] = useState(false);
  const [officeLocationId, setOfficeLocationId] = useState<string>("");
  const [savingOffice, setSavingOffice] = useState(false);

  // Office membership management
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const { users } = useOrgUsers({ enabled: membershipDialogOpen });
  const [editingMembership, setEditingMembership] = useState<OfficeMembership | null>(null);
  const [savingMembership, setSavingMembership] = useState(false);
  const [membershipToRemove, setMembershipToRemove] = useState<OfficeMembership | null>(null);
  const [membershipForm, setMembershipForm] = useState({
    userId: "",
    officeId: "",
    assignmentRole: "staff",
    isPrimary: false,
    isActive: true,
    canRegister: false,
    canRoute: true,
    canApprove: false,
  });

  const fetchLocations = async () => {
    try {
      const data = await apiFetch<unknown>('/correspondence/locations/');
      const results = Array.isArray(data) ? data : (data as Record<string, unknown>).results ?? [];
      setLocations((results as Record<string, unknown>[]).map((item) => ({
        id: item.id as string,
        building: item.building as string,
        floor: (item.floor as string) ?? "",
        room: (item.room as string) ?? "",
        description: (item.description as string) ?? "",
        isActive: item.is_active as boolean,
        displayName: (item.display_name as string) ?? "",
      })));
    } catch { /* ignore */ }
  };

  const handleEditOffice = (office: Office) => {
    setEditingOffice(office);
    setOfficeLocationId(office.locationId ?? "__none__");
    setOfficeEditOpen(true);
  };

  const handleSaveOfficeLocation = async () => {
    if (!editingOffice) return;
    setSavingOffice(true);
    try {
      await apiFetch(`/organization/offices/${editingOffice.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ location: officeLocationId === "__none__" ? null : officeLocationId }),
      });
      toast({ title: "Success", description: "Office location updated" });
      setOfficeEditOpen(false);
      setEditingOffice(null);
      // Refresh offices via context
      refreshOrganizationData();
    } catch {
      toast({ title: "Error", description: "Failed to update office location", variant: "destructive" });
    } finally {
      setSavingOffice(false);
    }
  };

  const handleCreateLocation = async () => {
    if (!locationForm.building.trim()) {
      toast({ title: "Error", description: "Building is required", variant: "destructive" });
      return;
    }
    setSavingLocation(true);
    try {
      await apiFetch("/correspondence/locations/", {
        method: "POST",
        body: JSON.stringify(locationForm),
      });
      toast({ title: "Success", description: editingLocation ? "Location updated" : "Location created" });
      setLocationFormOpen(false);
      setEditingLocation(null);
      setLocationForm({ building: "", floor: "", room: "", description: "" });
      await fetchLocations();
    } catch {
      toast({ title: "Error", description: "Failed to save location", variant: "destructive" });
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDeleteLocation = async (location: Location) => {
    try {
      await apiFetch(`/correspondence/locations/${location.id}/`, { method: "DELETE" });
      toast({ title: "Success", description: "Location deleted" });
      locationPagination.goToFirstPage();
      await fetchLocations();
    } catch {
      toast({ title: "Error", description: "Failed to delete location", variant: "destructive" });
    }
  };

  useEffect(() => {
    // Expand all by default for better UX
    setExpandedDirectorates(new Set(directorates.map(d => d.id)));
    void fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter logic for search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return {
        directorates: directorates.filter(d => d.isActive),
        matchedDivisions: new Set<string>(),
        matchedDepartments: new Set<string>(),
      };
    }

    const query = searchQuery.toLowerCase();
    const matchedDepartments = new Set<string>();
    const matchedDivisions = new Set<string>();
    const matchedDirectorates = new Set<string>();

    // Find matching departments
    departments.filter(d => d.isActive).forEach(dept => {
      if (dept.name.toLowerCase().includes(query) || dept.code.toLowerCase().includes(query)) {
        matchedDepartments.add(dept.id);
        matchedDivisions.add(dept.divisionId);
      }
    });

    // Find matching divisions
    divisions.filter(d => d.isActive).forEach(div => {
      if (div.name.toLowerCase().includes(query) || div.code.toLowerCase().includes(query)) {
        matchedDivisions.add(div.id);
        matchedDirectorates.add(div.directorateId);
      }
    });

    // Propagate division matches to directorates
    matchedDivisions.forEach(divId => {
      const div = divisions.find(d => d.id === divId);
      if (div) matchedDirectorates.add(div.directorateId);
    });

    // Find matching directorates
    directorates.filter(d => d.isActive).forEach(dir => {
      if (dir.name.toLowerCase().includes(query) || dir.code.toLowerCase().includes(query)) {
        matchedDirectorates.add(dir.id);
      }
    });

    return {
      directorates: directorates.filter(d => d.isActive && matchedDirectorates.has(d.id)),
      matchedDivisions,
      matchedDepartments,
    };
  }, [directorates, divisions, departments, searchQuery]);

  // Auto-expand when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      // Expand all matching directorates and divisions
      const dirsToExpand = new Set<string>();
      const divsToExpand = new Set<string>();
      
      filteredData.matchedDivisions.forEach(divId => {
        const div = divisions.find(d => d.id === divId);
        if (div) {
          dirsToExpand.add(div.directorateId);
          divsToExpand.add(divId);
        }
      });
      
      filteredData.matchedDepartments.forEach(deptId => {
        const dept = departments.find(d => d.id === deptId);
        if (dept) {
          divsToExpand.add(dept.divisionId);
          const div = divisions.find(d => d.id === dept.divisionId);
          if (div) dirsToExpand.add(div.directorateId);
        }
      });
      
      setExpandedDirectorates(dirsToExpand);
      setExpandedDivisions(divsToExpand);
    }
  }, [searchQuery, filteredData, departments, divisions]);

  // Stats
  const stats = useMemo(() => ({
    directorates: directorates.filter(d => d.isActive).length,
    divisions: divisions.filter(d => d.isActive).length,
    departments: departments.filter(d => d.isActive).length,
    withLeadership: directorates.filter(d => d.isActive && d.executiveDirectorId).length,
  }), [directorates, divisions, departments]);

  const filteredOffices = useMemo(() => {
    const query = (isMembershipsView ? "" : searchQuery).trim().toLowerCase();
    const activeOnly = offices.filter((office) =>
      office.isActive && (divisionFilter === "all" || office.divisionId === divisionFilter),
    );
    if (!query) return activeOnly;
    return activeOnly.filter((office) =>
      office.name.toLowerCase().includes(query) ||
      office.code.toLowerCase().includes(query) ||
      office.officeType.toLowerCase().includes(query),
    );
  }, [offices, searchQuery, divisionFilter, isMembershipsView]);

  const filteredLocations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return locations;
    return locations.filter((location) =>
      [location.displayName, location.building, location.floor, location.room, location.description]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [locations, searchQuery]);

  const membershipUserName = (membership: OfficeMembership) =>
    membership.userName ?? membership.userUsername ?? "Unknown user";

  const updateMembershipUrl = useCallback((updates: Record<string, string | null>, mode: "replace" | "push" = "replace") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "offices");
    params.set("view", "memberships");
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    });
    const href = `/admin/organization?${params.toString()}`;
    router[mode](href, { scroll: false });
  }, [router, searchParams]);

  const officePagination = usePagination({ totalCount: filteredOffices.length });
  const membershipPagination = usePagination({
    totalCount: membershipCount,
    controlledPage: membershipPageFromUrl,
    onControlledPageChange: (page) => updateMembershipUrl({ page: String(page) }),
  });
  const locationPagination = usePagination({ totalCount: filteredLocations.length });

  useEffect(() => {
    if (!isMembershipsView) return;
    let ignore = false;
    setMembershipLoading(true);
    fetchOfficeMemberships({
      office: membershipOfficeFilter === "all" ? undefined : membershipOfficeFilter,
      user: membershipUserFilter || undefined,
      isActive: membershipStatusFilter === "active" ? true : undefined,
      search: searchQuery,
      ordering: "office__name,user__last_name,user__first_name",
      page: membershipPageFromUrl,
      pageSize: membershipPagination.pageSize,
    }).then((page) => {
      if (ignore) return;
      setPagedMemberships(page.results);
      setMembershipCount(page.count);
    }).catch((error: unknown) => {
      if (!ignore) {
        setPagedMemberships([]);
        setMembershipCount(0);
        toast({
          title: "Could not load office memberships",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    }).finally(() => {
      if (!ignore) setMembershipLoading(false);
    });
    return () => { ignore = true; };
  }, [isMembershipsView, fetchOfficeMemberships, membershipOfficeFilter, membershipUserFilter, membershipStatusFilter, searchQuery, membershipPageFromUrl, membershipPagination.pageSize, membershipRefreshVersion]);

  useEffect(() => {
    if (!isMembershipsView || !canManageUsers && !canManageStructure) return;
    let ignore = false;
    fetchMembershipQuality().then((summary) => {
      if (!ignore) setMembershipQuality(summary);
    }).catch(() => {
      if (!ignore) setMembershipQuality(null);
    });
    return () => { ignore = true; };
  }, [isMembershipsView, canManageUsers, canManageStructure, membershipRefreshVersion]);

  const pagedOffices = useMemo(
    () => filteredOffices.slice(
      (officePagination.page - 1) * officePagination.pageSize,
      officePagination.page * officePagination.pageSize,
    ),
    [filteredOffices, officePagination.page, officePagination.pageSize],
  );
  const pagedLocations = useMemo(
    () => filteredLocations.slice(
      (locationPagination.page - 1) * locationPagination.pageSize,
      locationPagination.page * locationPagination.pageSize,
    ),
    [filteredLocations, locationPagination.page, locationPagination.pageSize],
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    officePagination.goToFirstPage();
    locationPagination.goToFirstPage();
    if (isMembershipsView) updateMembershipUrl({ search: value || null, page: "1" });
  };

  const updateDirectoryDivision = (divisionId: string) => {
    setDivisionFilter(divisionId);
    officePagination.goToFirstPage();
    const params = new URLSearchParams({ tab: "offices" });
    if (divisionId !== "all") params.set("division", divisionId);
    router.push(`/admin/organization?${params.toString()}`, { scroll: false });
  };

  const hasMembershipSearch = searchQuery.trim().length > 0;
  const membershipUserFilterName = pagedMemberships.find(
    (membership) => membership.userId === membershipUserFilter,
  )?.userName;
  let membershipEmptyState: {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  if (membershipStatusFilter === "active" && membershipCount === 0 && membershipOfficeFilter !== "all") {
    membershipEmptyState = {
      title: "No active memberships",
      message: hasMembershipSearch
        ? "Only inactive memberships match your search. Show all statuses to view them."
        : membershipOfficeFilter !== "all"
          ? "This office has only inactive memberships. Show all statuses to view them."
          : "All memberships are inactive. Show all statuses to view them.",
      actionLabel: "Show all statuses",
      onAction: () => {
        setMembershipStatusFilter("all");
        updateMembershipUrl({ status: "all", page: "1" });
      },
    };
  } else if (hasMembershipSearch) {
    membershipEmptyState = {
      title: "No memberships match your search",
      message: "Try a different office name, user, or assignment role.",
      actionLabel: "Clear search",
      onAction: () => handleSearchChange(""),
    };
  } else if (membershipOfficeFilter !== "all") {
    membershipEmptyState = {
      title: "No memberships for this office",
      message: "Show all offices or add a membership to give someone access to this office.",
      actionLabel: "Show all offices",
      onAction: () => {
        setMembershipOfficeFilter("all");
        updateMembershipUrl({ office: null, page: "1" });
      },
    };
  } else {
    membershipEmptyState = {
      title: "No office memberships yet",
      message: "Memberships grant users access to an office inbox. Add a membership to assign access and permissions.",
    };
  }

  // Helper functions
  const getExecutiveTitle = (directorate: Directorate) =>
    directorate.code.toUpperCase() === "MD" ? "MD" : "ED";

  // Toggle expand functions
  const toggleDirectorate = (id: string) => {
    setExpandedDirectorates(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDivision = (id: string) => {
    setExpandedDivisions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Action handlers
  const handleCreateDirectorate = () => {
    setSelectedDirectorate(null);
    setDirectorateFormOpen(true);
  };

  const handleEditDirectorate = (directorate: Directorate) => {
    setSelectedDirectorate(directorate);
    setDirectorateFormOpen(true);
  };

  const handleAssignLeader = (directorate: Directorate) => {
    setSelectedDirectorate(directorate);
    setDirectorateLeadershipOpen(true);
  };

  const handleCreateDivision = (directorateId: string) => {
    setSelectedDivision(null);
    setParentDirectorateId(directorateId);
    setDivisionFormOpen(true);
  };

  const handleEditDivision = (division: Division) => {
    setSelectedDivision(division);
    setParentDirectorateId(division.directorateId);
    setDivisionFormOpen(true);
  };

  const handleCreateDepartment = (divisionId: string) => {
    setSelectedDepartment(null);
    setParentDivisionId(divisionId);
    setDepartmentFormOpen(true);
  };

  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setParentDivisionId(department.divisionId);
    setDepartmentFormOpen(true);
  };

  const startCreateMembership = () => {
    setEditingMembership(null);
    setMembershipForm({
      userId: "",
      officeId: membershipOfficeFilter === "all" ? "" : membershipOfficeFilter,
      assignmentRole: "staff",
      isPrimary: false,
      isActive: true,
      canRegister: false,
      canRoute: true,
      canApprove: false,
    });
    setMembershipDialogOpen(true);
  };

  const openMemberships = (officeId: string) => {
    setMembershipOfficeFilter(officeId);
    setMembershipUserFilter("");
    setMembershipStatusFilter("active");
    setSearchQuery("");
    setOfficesView("memberships");
    setActiveTab("offices");
    const params = new URLSearchParams({ tab: "offices", view: "memberships", status: "active", page: "1" });
    if (officeId !== "all") params.set("office", officeId);
    router.push(`/admin/organization?${params.toString()}`, { scroll: false });
  };

  const showOfficeDirectory = () => {
    setOfficesView("directory");
    setSearchQuery("");
    setMembershipOfficeFilter("all");
    const params = new URLSearchParams({ tab: "offices" });
    if (divisionFilter !== "all") params.set("division", divisionFilter);
    router.push(`/admin/organization?${params.toString()}`, { scroll: false });
  };

  const startEditMembership = (membership: OfficeMembership) => {
    setEditingMembership(membership);
    setMembershipForm({
      userId: membership.userId,
      officeId: membership.officeId,
      assignmentRole: membership.assignmentRole,
      isPrimary: membership.isPrimary,
      isActive: membership.isActive,
      canRegister: membership.canRegister,
      canRoute: membership.canRoute,
      canApprove: membership.canApprove,
    });
    setMembershipDialogOpen(true);
  };

  const saveMembership = async () => {
    if (!membershipForm.userId || !membershipForm.officeId) {
      toast({ title: "Select a user and office", variant: "destructive" });
      return;
    }
    setSavingMembership(true);
    try {
      if (editingMembership) {
        await updateOfficeMembership(editingMembership.id, membershipForm);
        toast({ title: "Office membership updated" });
      } else {
        await addOfficeMembership(membershipForm);
        toast({ title: "Office membership added" });
      }
      setMembershipDialogOpen(false);
      setMembershipRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      toast({
        title: "Membership could not be saved",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingMembership(false);
    }
  };

  const confirmRemoveMembership = async () => {
    if (!membershipToRemove) return;
    try {
      await deleteOfficeMembership(membershipToRemove.id);
      setMembershipRefreshVersion((version) => version + 1);
      toast({ title: "Office membership removed" });
      updateMembershipUrl({ page: "1" });
      setMembershipToRemove(null);
    } catch (error: unknown) {
      toast({
        title: "Membership could not be removed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = (type: EntityType, id: string, name: string) => {
    setDeactivateTarget({ type, id, name });
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget || isProcessing) return;

    setIsProcessing(true);
    try {
      switch (deactivateTarget.type) {
        case "directorate":
          await deleteDirectorate(deactivateTarget.id);
          break;
        case "division":
          await deleteDivision(deactivateTarget.id);
          break;
        case "department":
          await deleteDepartment(deactivateTarget.id);
          break;
      }
      toast({ title: "Success", description: `${deactivateTarget.name} deactivated successfully` });
      setDeactivateTarget(null);
      } catch (error: unknown) {
      const description = error instanceof Error ? error.message : "Unable to deactivate";
      toast({ title: "Request failed", description, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const expandAll = () => {
    setExpandedDirectorates(new Set(directorates.filter(d => d.isActive).map(d => d.id)));
    setExpandedDivisions(new Set(divisions.filter(d => d.isActive).map(d => d.id)));
  };

  const collapseAll = () => {
    setExpandedDirectorates(new Set());
    setExpandedDivisions(new Set());
  };

  const searchPlaceholder = isMembershipsView ? MEMBERSHIPS_SEARCH_PLACEHOLDER : SEARCH_PLACEHOLDERS[activeTab];
  const tabSubtitle = isMembershipsView ? MEMBERSHIPS_SUBTITLE : TAB_SUBTITLES[activeTab];

  const structureStatItems = [
    { key: "directorates", label: "Directorates", value: stats.directorates },
    { key: "divisions", label: "Divisions", value: stats.divisions },
    { key: "departments", label: "Departments", value: stats.departments },
    { key: "leadership", label: "With Leadership", value: stats.withLeadership },
  ];

  const officeStatItems = [
    { key: "offices", label: "Active offices", value: offices.filter((office) => office.isActive).length },
    { key: "directorateOffices", label: "Directorate offices", value: offices.filter((office) => office.isActive && office.directorateId && !office.divisionId && !office.departmentId).length },
    { key: "divisionOffices", label: "Division offices", value: offices.filter((office) => office.isActive && office.divisionId && !office.departmentId).length },
    { key: "departmentOffices", label: "Department offices", value: offices.filter((office) => office.isActive && office.departmentId).length },
  ];
  const membershipStatItems = [
    { key: "memberships", label: "Matching memberships", value: membershipCount },
    { key: "users", label: "Conflict groups", value: membershipQuality ? membershipQuality.counts.multipleActivePrincipals + membershipQuality.counts.multiplePrimaryAssignments + membershipQuality.counts.duplicateOfficeAssignments : 0 },
    { key: "offices", label: "Offices with members", value: offices.filter((office) => (office.activeMemberCount ?? 0) > 0).length },
    { key: "primary", label: "Users with multiple primary offices", value: membershipQuality?.counts.multiplePrimaryAssignments ?? 0 },
  ];
  const locationStatItems = [
    { key: "locations", label: "Physical locations", value: locations.length },
    { key: "offices", label: "Offices assigned", value: offices.filter((office) => office.isActive && office.locationId).length },
    { key: "buildings", label: "Buildings", value: new Set(locations.map((location) => location.building).filter(Boolean)).size },
  ];
  const tabStatItems: Record<OrganizationTab, StatStripItem[]> = {
    structure: structureStatItems,
    offices: officeStatItems,
    locations: locationStatItems,
    people: [],
  };

  const locationAction = (
    <Dialog open={locationFormOpen} onOpenChange={(open) => { setLocationFormOpen(open); if (!open) { setEditingLocation(null); setLocationForm({ building: "", floor: "", room: "", description: "" }); } }}>
      <DialogTrigger asChild>
        <Button size="compact" onClick={() => { setEditingLocation(null); setLocationForm({ building: "", floor: "", room: "", description: "" }); }}>
          <Plus className="h-4 w-4" /> Add Location
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{editingLocation ? "Edit Location" : "New Location"}</DialogTitle>
          <DialogDescription>Enter the building, floor and room for this location.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="building">Building *</Label>
            <Input id="building" value={locationForm.building} onChange={(e) => setLocationForm({ ...locationForm, building: e.target.value })} placeholder="e.g. NPA Headquarters" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="floor">Floor</Label>
              <Input id="floor" value={locationForm.floor} onChange={(e) => setLocationForm({ ...locationForm, floor: e.target.value })} placeholder="e.g. 3rd Floor" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room">Room / Office</Label>
              <Input id="room" value={locationForm.room} onChange={(e) => setLocationForm({ ...locationForm, room: e.target.value })} placeholder="e.g. Room 310" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-desc">Description</Label>
            <Input id="loc-desc" value={locationForm.description} onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })} placeholder="Optional notes about this location" />
          </div>
          <Button className="w-full" onClick={() => void handleCreateLocation()} disabled={savingLocation}>
            {savingLocation ? "Saving..." : editingLocation ? "Update Location" : "Create Location"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const pageStats = activeTab === "people"
    ? <div id="organization-people-stats-slot" />
    : <StatStrip items={isMembershipsView ? membershipStatItems : tabStatItems[activeTab]} />;

  const pageActions = activeTab === "people"
    ? <div id="organization-people-actions-slot" className="flex flex-wrap items-center justify-end gap-2" />
    : (
      <>
        {activeTab === "structure" ? (
          <>
            <Button size="compact" onClick={handleCreateDirectorate}>
              <Plus className="h-4 w-4" />
              Add Directorate
            </Button>
            <ContextualHelp
              title="Organization Structure"
              description="Manage the organization hierarchy from directorate down to department."
              steps={[
                "Expand directorates to see divisions and departments.",
                "Use inline actions to add, edit, or deactivate units.",
                "Keep leadership assignments current as structures change.",
              ]}
            />
          </>
        ) : null}
        {activeTab === "offices" ? (
          isMembershipsView ? (
            <Button size="compact" onClick={startCreateMembership}>
              <Plus className="h-4 w-4" />
              Add Membership
            </Button>
          ) : (
            <Button variant="outline" size="compact" onClick={() => openMemberships("all")}>
              <Users className="h-4 w-4" />
              Manage memberships
            </Button>
          )
        ) : null}
        {activeTab === "locations" ? locationAction : null}
      </>
    );

  return (
    <ClientErrorBoundary>
      <>
        <AdminPageShell
          title="Organization"
          subtitle={tabSubtitle}
          icon={FolderTree}
          actions={pageActions}
          stats={pageStats}
          tabs={<OrganizationTabList />}
        >
          <Tabs value={activeTab}>
            <TabsContent value="structure" className="mt-2 focus-visible:outline-none">
              <div className="space-y-4">
                <OrganizationFilters
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                  searchPlaceholder={searchPlaceholder}
                >
                  <Button variant="outline" size="sm" onClick={expandAll} className="h-8 text-xs">
                    Expand All
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 text-xs">
                    Collapse All
                  </Button>
                </OrganizationFilters>
                <OrganizationSection
                  title="Organization hierarchy"
                  description="Directorates, divisions, and departments, with leadership at every level."
                >
                  <div>
              {filteredData.directorates.length === 0 ? (
                <div className="py-12 text-center">
                  <FolderTree className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No results match your search" : "No directorates found"}
                  </p>
                </div>
              ) : (
                  <div className="space-y-2">
                    {filteredData.directorates.map((directorate) => {
                      const isExpanded = expandedDirectorates.has(directorate.id);
                      const dirDivisions = divisions.filter(
                        d => d.directorateId === directorate.id && d.isActive
                      );
                      const executiveName = directorate.executiveDirectorName;
                      const divisionCount = dirDivisions.length;
                      const deptCount = dirDivisions.reduce((acc, div) => {
                        return acc + departments.filter(d => d.divisionId === div.id && d.isActive).length;
                      }, 0);

                      return (
                        <div key={directorate.id} className="overflow-hidden rounded-lg border border-border/60 bg-card">
                          {/* Directorate Row */}
                          <div
                            className={cn(
                              "grid grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-2.5 p-3 transition-colors hover:bg-muted/40 sm:flex sm:items-center",
                              isExpanded && "border-b border-border"
                            )}
                          >
                            <button
                              onClick={() => toggleDirectorate(directorate.id)}
                              className="p-1 hover:bg-muted rounded"
                              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${directorate.name}`}
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="min-w-0 font-semibold">{directorate.name}</span>
                                <Badge variant="outline" className="shrink-0 whitespace-nowrap text-xs">{directorate.code}</Badge>
                                <Badge variant="secondary" className="shrink-0 whitespace-nowrap text-xs">{divisionCount} div</Badge>
                                <Badge variant="outline" className="shrink-0 whitespace-nowrap text-xs">{deptCount} dept</Badge>
                              </div>
                              {executiveName && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {getExecutiveTitle(directorate)}: {executiveName}
                                </p>
                              )}
                            </div>

                            <div className="col-span-full flex items-center justify-end gap-1 sm:ml-auto sm:col-span-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-md"
                                    aria-label={`Add division to ${directorate.name}`}
                                    onClick={() => handleCreateDivision(directorate.id)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Add Division</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-md"
                                    aria-label={`Assign leader to ${directorate.name}`}
                                    onClick={() => handleAssignLeader(directorate)}
                                  >
                                    <Users className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Assign Leader</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-md"
                                    aria-label={`Edit ${directorate.name}`}
                                    onClick={() => handleEditDirectorate(directorate)}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                                    aria-label={`Deactivate ${directorate.name}`}
                                    onClick={() => handleDeactivate("directorate", directorate.id, directorate.name)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Deactivate</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          {/* Divisions */}
                          {isExpanded && dirDivisions.length > 0 && (
                            <div className="pl-8 py-2 space-y-1 bg-muted/20">
                              {dirDivisions.map((division) => {
                                const isDivExpanded = expandedDivisions.has(division.id);
                                const divDepts = departments.filter(
                                  d => d.divisionId === division.id && d.isActive
                                );
                                const gmName = division.generalManagerName;

                                return (
                                  <div key={division.id} className="overflow-hidden rounded-lg border border-border/60 bg-card">
                                    {/* Division Row */}
                                    <div
                                      className={cn(
                                        "grid grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-2.5 p-2.5 transition-colors hover:bg-muted/40 sm:flex sm:items-center",
                                        isDivExpanded && divDepts.length > 0 && "border-b border-border/50"
                                      )}
                                    >
                                      {divDepts.length === 0 ? (
                                        <span className="block h-6 w-6" aria-hidden="true" />
                                      ) : (
                                        <button
                                          onClick={() => toggleDivision(division.id)}
                                          className="rounded p-1 hover:bg-muted"
                                          aria-label={`${isDivExpanded ? "Collapse" : "Expand"} ${division.name}`}
                                          aria-expanded={isDivExpanded}
                                        >
                                          {isDivExpanded ? (
                                          <ChevronDown className="h-4 w-4" />
                                          ) : (
                                          <ChevronRight className="h-4 w-4" />
                                          )}
                                        </button>
                                      )}
                                      
                                      <div className="p-1.5 rounded bg-success/10">
                                        <Network className="h-3.5 w-3.5 text-success" />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="min-w-0 font-medium text-sm">{division.name}</span>
                                          <Badge variant="outline" className="shrink-0 whitespace-nowrap text-xs">{division.code}</Badge>
                                          <Badge variant="secondary" className="shrink-0 whitespace-nowrap text-xs">{divDepts.length} dept</Badge>
                                        </div>
                                        {gmName && (
                                          <p className="text-xs text-muted-foreground">GM: {gmName}</p>
                                        )}
                                      </div>

                                      <div className="col-span-full flex items-center justify-end gap-1 sm:ml-auto sm:col-span-1">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 rounded-md"
                                              aria-label={`Add department to ${division.name}`}
                                              onClick={() => handleCreateDepartment(division.id)}
                                            >
                                              <Plus className="h-3.5 w-3.5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Add Department</TooltipContent>
                                        </Tooltip>
                                        
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 rounded-md"
                                              aria-label={`Edit ${division.name}`}
                                              onClick={() => handleEditDivision(division)}
                                            >
                                              <Edit3 className="h-3.5 w-3.5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Edit</TooltipContent>
                                        </Tooltip>
                                        
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                                              aria-label={`Deactivate ${division.name}`}
                                              onClick={() => handleDeactivate("division", division.id, division.name)}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Deactivate</TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </div>

                                    {/* Departments */}
                                    {isDivExpanded && divDepts.length > 0 && (
                                      <div className="pl-8 py-2 space-y-1 bg-muted/10">
                                        {divDepts.map((department) => {
                                          const agmName = department.assistantGeneralManagerName;

                                          return (
                                            <div
                                              key={department.id}
                                              className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 rounded-lg border border-border/60 bg-card px-2.5 py-2 transition-colors hover:bg-muted/40 sm:flex sm:items-center"
                                            >
                                              <div className="p-1.5 rounded bg-info/10">
                                                <Layers className="h-3 w-3 text-info" />
                                              </div>
                                              
                                              <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                  <span className="min-w-0 text-sm">{department.name}</span>
                                                  <Badge variant="outline" className="shrink-0 whitespace-nowrap text-xs">{department.code}</Badge>
                                                </div>
                                                {agmName && (
                                                  <p className="text-xs text-muted-foreground">AGM: {agmName}</p>
                                                )}
                                              </div>

                                              <div className="col-span-full flex items-center justify-end gap-1 sm:ml-auto sm:col-span-1">
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-8 w-8 rounded-md"
                                                      aria-label={`Edit ${department.name}`}
                                                      onClick={() => handleEditDepartment(department)}
                                                    >
                                                      <Edit3 className="h-3 w-3" />
                                                    </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent>Edit</TooltipContent>
                                                </Tooltip>
                                                
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                                                      aria-label={`Deactivate ${department.name}`}
                                                      onClick={() => handleDeactivate("department", department.id, department.name)}
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent>Deactivate</TooltipContent>
                                                </Tooltip>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Empty state for no divisions */}
                          {isExpanded && dirDivisions.length === 0 && (
                            <div className="pl-12 py-4 text-sm text-muted-foreground bg-muted/20">
                              No divisions yet.{" "}
                              <button
                                onClick={() => handleCreateDivision(directorate.id)}
                                className="text-primary hover:underline"
                              >
                                Add the first division
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
              )}
                  </div>
                </OrganizationSection>
              </div>
            </TabsContent>

            <TabsContent value="offices" className="mt-2 focus-visible:outline-none">
              <div className="space-y-4">
                <div className="flex w-fit items-center gap-1 rounded-md border border-border/60 p-0.5">
                  <Button
                    type="button"
                    variant={officesView === "directory" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={showOfficeDirectory}
                  >
                    Directory
                  </Button>
                  <Button
                    type="button"
                    variant={officesView === "memberships" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => openMemberships("all")}
                  >
                    All memberships
                  </Button>
                </div>
                {officesView === "directory" ? (
                  <>
                <OrganizationFilters
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                  searchPlaceholder={searchPlaceholder}
                >
                  <Select value={divisionFilter} onValueChange={updateDirectoryDivision}>
                    <SelectTrigger className="h-8 w-56 text-xs" aria-label="Filter offices by division">
                      <SelectValue placeholder="All divisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All divisions</SelectItem>
                      {divisions.map((division) => (
                        <SelectItem key={division.id} value={division.id}>{division.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </OrganizationFilters>
                <OrganizationSection
                  title="Office directory"
                  description="Offices are routing units. A membership assigns a person to one."
                >
                  {filteredOffices.length === 0 ? (
                    <EmptyState
                      icon={<Building2 className={registryQueueEmptyIconClass} />}
                      title={searchQuery.trim() ? "No offices match your search" : "No offices configured yet"}
                      message={
                        searchQuery.trim()
                          ? "Try a different name, code, or office type. Clear search to see all offices."
                          : "Offices connect users to correspondence routing. Create offices from the registry or ask your administrator to add them here."
                      }
                      actionLabel={searchQuery.trim() ? "Clear search" : undefined}
                      onAction={searchQuery.trim() ? () => handleSearchChange("") : undefined}
                      variant="dashed"
                    />
                  ) : (
                    <div className="space-y-2">
                      {pagedOffices.map((office) => {
                        const officeMemberCount = office.activeMemberCount ?? 0;
                        const principalName = office.activePrincipalName;

                        return (
                          <ListRowCard
                            key={office.id}
                            density="dense"
                            leading={<div className="rounded-md bg-primary/10 p-2 text-primary"><Building2 className="h-4 w-4" /></div>}
                            actions={
                              <div className="flex items-center gap-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2.5 text-xs"
                                  onClick={() => openMemberships(office.id)}
                                >
                                  <Users className="h-3.5 w-3.5" />
                                  {officeMemberCount} {officeMemberCount === 1 ? "member" : "members"}
                                </Button>
                                <Dialog open={officeEditOpen && editingOffice?.id === office.id} onOpenChange={(open) => { if (!open) { setOfficeEditOpen(false); setEditingOffice(null); } }}>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" onClick={() => handleEditOffice(office)} aria-label={`Edit office location for ${office.name}`}>
                                      <MapPin className="h-3.5 w-3.5" />
                                      Location
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent size="sm">
                                    <DialogHeader>
                                      <DialogTitle>Edit location for {office.name}</DialogTitle>
                                      <DialogDescription>Update this office's physical location. Office details come from the organization structure.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="office-location">Physical location</Label>
                                        <Select value={officeLocationId} onValueChange={setOfficeLocationId}>
                                          <SelectTrigger id="office-location"><SelectValue placeholder="Select a location..." /></SelectTrigger>
                                          <SelectContent>
                                            {locations.map((loc) => <SelectItem key={loc.id} value={loc.id}>{loc.displayName}</SelectItem>)}
                                            <SelectItem value="__none__">None</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <Button className="w-full" onClick={() => void handleSaveOfficeLocation()} disabled={savingOffice}>
                                        {savingOffice ? "Saving..." : "Save changes"}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            }
                          >
                            <div className="space-y-1.5">
                              <p className="truncate text-sm font-semibold tracking-tight">{office.name}</p>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px]">{office.code}</Badge>
                                <Badge variant="secondary" className="text-[10px]">{office.officeType.toUpperCase()}</Badge>
                                {office.locationName ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{office.locationName}</span> : null}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {principalName ? `Principal: ${principalName}` : "No principal assigned"}
                                {office.description ? ` · ${office.description}` : ""}
                              </p>
                            </div>
                          </ListRowCard>
                        );
                      })}
                    </div>
                  )}
                  {filteredOffices.length > 0 ? (
                    <PaginationControls
                      pagination={officePagination}
                      className="mt-4 border-t border-border/50 pt-3"
                    />
                  ) : null}
                </OrganizationSection>
                  </>
                ) : (
                  <>
                <OrganizationFilters
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                  searchPlaceholder={searchPlaceholder}
                >
                  <Select
                    value={membershipOfficeFilter}
                    onValueChange={(value) => {
                      setMembershipOfficeFilter(value);
                      updateMembershipUrl({ office: value === "all" ? null : value, page: "1" });
                    }}
                  >
                    <SelectTrigger className="h-8 w-56 text-xs" aria-label="Filter memberships by office">
                      <SelectValue placeholder="All offices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All offices</SelectItem>
                      {offices.filter((office) => office.isActive).map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {membershipUserFilter ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setMembershipUserFilter("");
                        updateMembershipUrl({ user: null, page: "1" });
                      }}
                    >
                      User: {membershipUserFilterName ?? membershipUserFilter}
                      <X className="ml-1 h-3 w-3" />
                    </Button>
                  ) : null}
                  <Select
                    value={membershipStatusFilter}
                    onValueChange={(value) => {
                      const status = value as "active" | "all";
                      setMembershipStatusFilter(status);
                      updateMembershipUrl({ status: status === "active" ? null : status, page: "1" });
                    }}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs" aria-label="Filter memberships by status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="all">All statuses</SelectItem>
                    </SelectContent>
                  </Select>
                </OrganizationFilters>
                <OrganizationSection
                  title="Office memberships"
                  description="A membership connects one user to one office and defines what they can do there."
                >
                  {membershipQuality ? (
                    <div className="mb-4 grid gap-3 rounded-lg border p-3 md:grid-cols-3" aria-label="Actionable membership conflicts">
                      {[
                        { key: "principal", label: "Multiple active principals", findings: membershipQuality.multipleActivePrincipals, count: membershipQuality.counts.multipleActivePrincipals, office: true },
                        { key: "primary", label: "Multiple primary assignments", findings: membershipQuality.multiplePrimaryAssignments, count: membershipQuality.counts.multiplePrimaryAssignments, office: false },
                        { key: "duplicate", label: "Duplicate office assignments", findings: membershipQuality.duplicateOfficeAssignments, count: membershipQuality.counts.duplicateOfficeAssignments, office: true },
                      ].map((category) => (
                        <div key={category.key} className="space-y-1.5">
                          <p className="text-xs font-semibold">{category.label} ({category.count})</p>
                          {category.findings.slice(0, 4).map((finding, index) => (
                            <button
                              key={`${category.key}-${finding.officeId ?? finding.userId}-${index}`}
                              type="button"
                              className="block w-full truncate text-left text-xs text-primary hover:underline"
                              onClick={() => {
                                const officeId = finding.officeId ?? finding.memberships[0]?.officeId;
                                const userId = finding.userId ?? finding.memberships[0]?.userId;
                                setMembershipOfficeFilter(category.office ? officeId ?? "all" : "all");
                                setMembershipUserFilter(category.office ? "" : userId ?? "");
                                setSearchQuery("");
                                updateMembershipUrl({ office: category.office ? officeId ?? null : null, user: category.office ? null : userId ?? null, search: null, page: "1" }, "push");
                              }}
                            >
                              {category.office ? finding.officeName ?? finding.memberships[0]?.officeName : finding.userName ?? finding.memberships[0]?.userName}
                              {finding.count > 1 ? ` · ${finding.count}` : ""}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {membershipLoading ? <p className="py-4 text-center text-sm text-muted-foreground">Loading memberships…</p> : null}
                  {membershipCount === 0 && !membershipLoading ? (
                    <EmptyState
                      icon={<Users className={registryQueueEmptyIconClass} />}
                      title={membershipEmptyState.title}
                      message={membershipEmptyState.message}
                      actionLabel={membershipEmptyState.actionLabel}
                      onAction={membershipEmptyState.onAction}
                      variant="dashed"
                    />
                  ) : (
                    <div className="space-y-2">
                      {pagedMemberships.map((membership) => {
                        const officeName = offices.find((office) => office.id === membership.officeId)?.name ?? membership.officeName ?? "Unknown office";
                        const userName = membershipUserName(membership);
                        return (
                          <ListRowCard
                            key={membership.id}
                            density="dense"
                            leading={<div className="rounded-md bg-primary/10 p-2 text-primary"><Users className="h-4 w-4" /></div>}
                            actions={
                              <div className="flex gap-0.5">
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md" aria-label={`Edit membership for ${userName} at ${officeName}`} onClick={() => startEditMembership(membership)}>
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive hover:text-destructive" aria-label={`Remove membership for ${userName} at ${officeName}`} onClick={() => setMembershipToRemove(membership)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            }
                          >
                            <div className="space-y-1.5">
                              <p className="truncate text-sm font-semibold tracking-tight">{userName}</p>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">{officeName}</span>
                                <Badge variant="secondary" className="text-[10px]">{membership.assignmentRole}</Badge>
                                {!membership.isActive ? <Badge variant="destructive" className="text-[10px]">Inactive</Badge> : null}
                                {membership.isPrimary ? <Badge className="text-[10px]">Primary</Badge> : null}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {[
                                  membership.canRegister ? "Register" : null,
                                  membership.canRoute ? "Route" : null,
                                  membership.canApprove ? "Approve" : null,
                                ].filter(Boolean).join(" · ") || "No permissions assigned"}
                              </p>
                            </div>
                          </ListRowCard>
                        );
                      })}
                    </div>
                  )}
                  {membershipCount > 0 ? (
                    <PaginationControls
                      pagination={membershipPagination}
                      showPageSizeSelector={false}
                      className="mt-4 border-t border-border/50 pt-3"
                    />
                  ) : null}
                  <Dialog
                    open={membershipDialogOpen}
                    onOpenChange={(open) => {
                      setMembershipDialogOpen(open);
                      if (!open) setEditingMembership(null);
                    }}
                  >
                    <DialogContent size="sm">
                      <DialogHeader>
                        <DialogTitle>{editingMembership ? "Edit Office Membership" : "Add Office Membership"}</DialogTitle>
                        <DialogDescription>Choose a user and office, then set the assignment role and permissions.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label htmlFor="membership-user">User</Label>
                          <Select
                            value={membershipForm.userId}
                            onValueChange={(userId) => setMembershipForm((form) => ({ ...form, userId }))}
                          >
                            <SelectTrigger id="membership-user"><SelectValue placeholder="Select a user" /></SelectTrigger>
                            <SelectContent>
                              {membershipForm.userId && !users.some((user) => user.id === membershipForm.userId) ? (
                                <SelectItem value={membershipForm.userId}>
                                  {editingMembership?.userName ?? editingMembership?.userUsername ?? "Current user"}
                                </SelectItem>
                              ) : null}
                              {users.filter((user) => user.active || user.id === membershipForm.userId).map((user) => (
                                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="membership-office">Office</Label>
                          <Select
                            value={membershipForm.officeId}
                            onValueChange={(officeId) => setMembershipForm((form) => ({ ...form, officeId }))}
                          >
                            <SelectTrigger id="membership-office"><SelectValue placeholder="Select an office" /></SelectTrigger>
                            <SelectContent>
                              {offices.filter((office) => office.isActive || office.id === membershipForm.officeId).map((office) => (
                                <SelectItem key={office.id} value={office.id}>{office.name} ({office.code})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="membership-role">Assignment role</Label>
                          <Select
                            value={membershipForm.assignmentRole}
                            onValueChange={(assignmentRole) => setMembershipForm((form) => ({ ...form, assignmentRole }))}
                          >
                            <SelectTrigger id="membership-role"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['principal', 'acting', 'staff', 'secretariat', 'registry', 'support'].map((role) => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {([
                            ["isPrimary", "Primary assignment"],
                            ["isActive", "Active membership"],
                            ["canRegister", "Can register"],
                            ["canRoute", "Can route"],
                            ["canApprove", "Can approve"],
                          ] as const).map(([key, label]) => (
                            <label key={key} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                              <Checkbox
                                checked={membershipForm[key]}
                                onCheckedChange={(checked) => setMembershipForm((form) => ({ ...form, [key]: checked === true }))}
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setMembershipDialogOpen(false)}>Cancel</Button>
                          <Button type="button" onClick={() => void saveMembership()} disabled={savingMembership}>
                            {savingMembership ? "Saving…" : editingMembership ? "Save changes" : "Add membership"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </OrganizationSection>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="locations" className="mt-2 focus-visible:outline-none">
              <div className="space-y-4">
                <OrganizationFilters
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                  searchPlaceholder={searchPlaceholder}
                />
                <OrganizationSection
                  title="Physical locations"
                  description="Buildings, floors, and rooms that offices can be assigned to."
                >
                  {filteredLocations.length === 0 ? (
                    <EmptyState
                      icon={<MapPin className={registryQueueEmptyIconClass} />}
                      title={searchQuery.trim() ? "No locations match your search" : "No locations yet"}
                      message={
                        searchQuery.trim()
                          ? "Try a different building, floor, room, or description."
                          : "Locations represent physical buildings, floors, and rooms where offices are situated."
                      }
                      actionLabel={searchQuery.trim() ? "Clear search" : undefined}
                      onAction={searchQuery.trim() ? () => handleSearchChange("") : undefined}
                      variant="dashed"
                    />
                  ) : (
                    <div className="space-y-2">
                      {pagedLocations.map((loc) => (
                        <ListRowCard
                          key={loc.id}
                          density="dense"
                          leading={<div className="rounded-md bg-primary/10 p-2 text-primary"><MapPin className="h-4 w-4" /></div>}
                          actions={<div className="flex gap-0.5">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 rounded-md"
                              onClick={() => {
                                setEditingLocation(loc);
                                setLocationForm({ building: loc.building, floor: loc.floor, room: loc.room, description: loc.description });
                                setLocationFormOpen(true);
                              }}
                              title="Edit"
                              aria-label={`Edit location ${loc.displayName}`}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive hover:text-destructive" title="Delete" aria-label={`Delete location ${loc.displayName}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete location?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete <strong>{loc.displayName}</strong>. Offices assigned to this location will have their location reset.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => void handleDeleteLocation(loc)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>}
                        >
                          <div className="space-y-1">
                            <p className="truncate text-sm font-semibold tracking-tight">{loc.displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              {[loc.building, loc.floor, loc.room].filter(Boolean).join(" · ")}
                            </p>
                            {loc.description ? <p className="text-xs text-muted-foreground">{loc.description}</p> : null}
                          </div>
                        </ListRowCard>
                      ))}
                    </div>
                  )}
                  {filteredLocations.length > 0 ? (
                    <PaginationControls
                      pagination={locationPagination}
                      className="mt-4 border-t border-border/50 pt-3"
                    />
                  ) : null}
                </OrganizationSection>
              </div>
            </TabsContent>

            <TabsContent value="people" className="mt-2 focus-visible:outline-none">
              {canAccessPeople ? (
                <PeopleAccessTab
                  canManageUsers={canManageUsers}
                  canManageRoles={canManageRoles}
                />
              ) : null}
            </TabsContent>

          </Tabs>
        </AdminPageShell>

        {/* Modals */}
        <DirectorateFormModal
          open={directorateFormOpen}
          onOpenChange={(open) => {
            setDirectorateFormOpen(open);
            if (!open) setSelectedDirectorate(null);
          }}
          directorate={selectedDirectorate ?? undefined}
        />

        <DirectorateLeadershipDialog
          open={directorateLeadershipOpen}
          onOpenChange={(open) => {
            setDirectorateLeadershipOpen(open);
            if (!open) setSelectedDirectorate(null);
          }}
          directorate={selectedDirectorate}
        />

        <DivisionFormModal
          open={divisionFormOpen}
          onOpenChange={(open) => {
            setDivisionFormOpen(open);
            if (!open) {
              setSelectedDivision(null);
              setParentDirectorateId(null);
            }
          }}
          division={selectedDivision ?? undefined}
          defaultDirectorateId={parentDirectorateId || undefined}
        />

        <DepartmentFormModal
          open={departmentFormOpen}
          onOpenChange={(open) => {
            setDepartmentFormOpen(open);
            if (!open) {
              setSelectedDepartment(null);
              setParentDivisionId(null);
            }
          }}
          department={selectedDepartment ?? undefined}
          defaultDivisionId={parentDivisionId || undefined}
        />

        <AlertDialog open={membershipToRemove !== null} onOpenChange={(open) => !open && setMembershipToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove office membership?</AlertDialogTitle>
              <AlertDialogDescription>
                Remove {membershipToRemove?.userName ?? membershipToRemove?.userUsername ?? "this user"} from {offices.find((office) => office.id === membershipToRemove?.officeId)?.name ?? membershipToRemove?.officeName ?? "this office"}? This removes their office access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void confirmRemoveMembership();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove membership
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Deactivate Confirmation */}
        <AlertDialog open={deactivateTarget !== null} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate {deactivateTarget?.type}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate "{deactivateTarget?.name}"? This will hide it from active lists but won't delete any data.
                {deactivateTarget?.type === "directorate" && (
                  <span className="block mt-2 text-warning">
                    Warning: This will also affect all divisions and departments under this directorate.
                  </span>
                )}
                {deactivateTarget?.type === "division" && (
                  <span className="block mt-2 text-warning">
                    Warning: This will also affect all departments under this division.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeactivate}
                disabled={isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing ? "Deactivating…" : "Deactivate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </ClientErrorBoundary>
  );
};

export default OrganizationStructurePage;

