"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Archive, 
  Search, 
  Calendar,
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileArchive,
  Filter
} from 'lucide-react';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { getDivisionById, getDepartmentById, DIRECTORATES, type Correspondence } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';

const ArchivedCorrespondence = () => {
  const router = useRouter();
  const { correspondence } = useCorrespondence();
  const { currentUser } = useCurrentUser();
  const permissions = useUserPermissions(currentUser ?? undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCorrespondence, setFilteredCorrespondence] = useState<Correspondence[]>([]);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const applyFilters = useCallback((items: Correspondence[]) => {
    let filtered = items;

    if (searchQuery.trim()) {
      filtered = filtered.filter(c =>
        c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.senderName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (yearFilter !== 'all') {
      filtered = filtered.filter(c =>
        new Date(c.receivedDate).getFullYear().toString() === yearFilter
      );
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(c => c.priority === priorityFilter);
    }

    setFilteredCorrespondence(filtered);
  }, [priorityFilter, searchQuery, yearFilter]);

  useEffect(() => {
    // Filter to show only archived correspondence based on hierarchical access
    const archived = correspondence.filter(c => {
      if (c.status !== 'archived' && c.status !== 'completed') return false;
      if (!currentUser) return false;

      const archiveLevel = c.archiveLevel || 'department';
      if (!permissions.allowedArchiveLevels.includes(archiveLevel)) return false;

      const userDivision = currentUser.division ? getDivisionById(currentUser.division) : null;
      const userDepartment = currentUser.department ? getDepartmentById(currentUser.department) : null;
      const userDirectorate = userDivision ? DIRECTORATES.find(d => d.id === userDivision.directorateId) : null;

      const corrDivision = c.divisionId ? getDivisionById(c.divisionId) : null;
      const corrDepartment = c.departmentId ? getDepartmentById(c.departmentId) : null;
      const corrDirectorate = corrDivision ? DIRECTORATES.find(d => d.id === corrDivision.directorateId) : null;

      if (archiveLevel === 'department') {
        return corrDepartment && userDepartment && corrDepartment.id === userDepartment.id;
      }

      if (archiveLevel === 'division') {
        if (!corrDivision || !userDivision || corrDivision.id !== userDivision.id) return false;
        return corrDivision.generalManagerId === currentUser.id;
      }

      if (archiveLevel === 'directorate') {
        if (!corrDirectorate || !userDirectorate || corrDirectorate.id !== userDirectorate.id) return false;
        return corrDirectorate.executiveDirectorId === currentUser.id;
      }

      return false;
    });

    applyFilters(archived);
  }, [correspondence, searchQuery, yearFilter, priorityFilter, currentUser, permissions.allowedArchiveLevels, applyFilters]);

  if (!currentUser) {
    return null;
  }

  const getAvailableYears = () => {
    const years = new Set(
      correspondence
        .filter(c => c.status === 'archived' || c.status === 'completed')
        .map(c => new Date(c.receivedDate).getFullYear())
    );
    return Array.from(years).sort((a, b) => b - a);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const CorrespondenceCard = ({ corr }: { corr: Correspondence }) => {
    const division = getDivisionById(corr.divisionId);
    const department = corr.departmentId ? getDepartmentById(corr.departmentId) : null;
    const archiveLevel = corr.archiveLevel || 'department';
    const levelName = archiveLevel === 'department' ? 'Department' : archiveLevel === 'division' ? 'Division' : 'Directorate';

    return (
      <div 
        onClick={() => router.push(`/correspondence/${corr.id}`)}
        className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer"
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="p-3 rounded-lg bg-muted">
            <FileArchive className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate mb-1">
                  {corr.subject}
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getPriorityColor(corr.priority)}>
                    {corr.priority.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    {corr.direction === 'downward' ? (
                      <>
                        <ArrowDown className="h-3 w-3 text-info" />
                        Downward
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-3 w-3 text-success" />
                        Upward
                      </>
                    )}
                  </Badge>
                  <Badge variant="secondary" className="text-success bg-success/10 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {corr.status === 'archived' ? 'Archived' : 'Completed'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {levelName} Archive
                  </Badge>
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDateShort(corr.receivedDate)}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5" />
                <span>From: {corr.senderName}</span>
                {corr.senderOrganization && (
                  <span className="text-xs">({corr.senderOrganization})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <FileArchive className="h-3.5 w-3.5" />
                <span>Ref: {corr.referenceNumber}</span>
              </div>
              {division && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {division.name}
                    {department && ` • ${department.name}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filterByDirection = (direction: string) => {
    if (direction === 'all') return filteredCorrespondence;
    return filteredCorrespondence.filter(c => c.direction === direction);
  };

  const availableYears = getAvailableYears();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Archive className="h-8 w-8 text-muted-foreground" />
              Archived Correspondence
            </h1>
            <p className="text-muted-foreground mt-1">
              View completed and archived correspondence records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {filteredCorrespondence.length} Records
            </Badge>
          </div>
        </div>

        <HelpGuideCard
          title="Work with Archived Records"
          description="Access departmental, divisional, or directorate archives depending on your current persona. Use search, year, priority, and direction filters to quickly locate historical correspondence."
          links={[
            { label: "Archive Policy", href: "/help#archive-policy", external: false },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by subject, reference number, or sender..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Archived</p>
                  <p className="text-2xl font-bold">{filteredCorrespondence.length}</p>
                </div>
                <Archive className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Downward</p>
                  <p className="text-2xl font-bold">
                    {filterByDirection('downward').length}
                  </p>
                </div>
                <ArrowDown className="h-8 w-8 text-info opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Upward</p>
                  <p className="text-2xl font-bold">
                    {filterByDirection('upward').length}
                  </p>
                </div>
                <ArrowUp className="h-8 w-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">This Year</p>
                  <p className="text-2xl font-bold">
                    {filteredCorrespondence.filter(c => 
                      new Date(c.receivedDate).getFullYear() === new Date().getFullYear()
                    ).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All ({filteredCorrespondence.length})
            </TabsTrigger>
            <TabsTrigger value="downward">
              Downward ({filterByDirection('downward').length})
            </TabsTrigger>
            <TabsTrigger value="upward">
              Upward ({filterByDirection('upward').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {filteredCorrespondence.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Archive className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No archived correspondence found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Completed correspondence will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredCorrespondence.map(corr => (
                <CorrespondenceCard key={corr.id} corr={corr} />
              ))
            )}
          </TabsContent>

          <TabsContent value="downward" className="space-y-3">
            {filterByDirection('downward').length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ArrowDown className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No downward correspondence</p>
                </CardContent>
              </Card>
            ) : (
              filterByDirection('downward').map(corr => (
                <CorrespondenceCard key={corr.id} corr={corr} />
              ))
            )}
          </TabsContent>

          <TabsContent value="upward" className="space-y-3">
            {filterByDirection('upward').length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ArrowUp className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No upward correspondence</p>
                </CardContent>
              </Card>
            ) : (
              filterByDirection('upward').map(corr => (
                <CorrespondenceCard key={corr.id} corr={corr} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ArchivedCorrespondence;
