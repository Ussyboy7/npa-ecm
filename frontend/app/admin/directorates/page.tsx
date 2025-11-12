"use client";

import { useMemo, useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { DirectorateLeadershipDialog } from "@/components/admin/DirectorateLeadershipDialog";
import { DirectorateFormModal } from "@/components/admin/DirectorateFormModal";
import {
  Building2,
  Search,
  Users,
  Network,
  UserCircle2,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useOrganization, type Directorate as OrgDirectorate } from "@/contexts/OrganizationContext";

const DirectoratesManagement = () => {
  const { directorates, divisions, departments, users } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [selectedDirectorate, setSelectedDirectorate] = useState<OrgDirectorate | null>(null);
  const [leadershipDialogOpen, setLeadershipDialogOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const leadershipCount = useMemo(() => {
    return directorates.filter((dir) => {
      if (dir.executiveDirectorId) return true;
      return false;
    }).length;
  }, [directorates]);

  const filteredDirectorates = useMemo(() => {
    if (!searchQuery.trim()) return directorates;
    const query = searchQuery.toLowerCase();
    return directorates.filter(
      (dir) =>
        dir.name.toLowerCase().includes(query) ||
        dir.code.toLowerCase().includes(query)
    );
  }, [directorates, searchQuery]);

  const getExecutive = (directorate: OrgDirectorate) => {
    if (!directorate.executiveDirectorId) return "Not assigned";
    return users.find((u) => u.id === directorate.executiveDirectorId)?.name ?? "Not assigned";
  };

  const getExecutiveEmail = (directorate: OrgDirectorate) => {
    if (!directorate.executiveDirectorId) return undefined;
    return users.find((u) => u.id === directorate.executiveDirectorId)?.email;
  };

  const getExecutiveTitle = (directorate: OrgDirectorate) => {
    return directorate.id === 'dir-md' ? 'Managing Director' : 'Executive Director';
  };

  const getDivisionManager = (divisionId: string) => {
    const division = divisions.find((div) => div.id === divisionId);
    if (!division?.generalManagerId) return "Not assigned";
    return users.find((u) => u.id === division.generalManagerId)?.name || "Not assigned";
  };

  const getDivisionManagerEmail = (divisionId: string) => {
    const division = divisions.find((div) => div.id === divisionId);
    if (!division?.generalManagerId) return undefined;
    return users.find((u) => u.id === division.generalManagerId)?.email;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              Directorate Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Overview of NPA organizational structure: Managing Director Office, Executive Directorates, their divisions, and departments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => {
              setSelectedDirectorate(null);
              setFormModalOpen(true);
            }} className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Directorate
            </Button>
            <ContextualHelp
            title="Directorate hierarchy overview"
            description="Review each executive directorate, confirm leadership, and inspect the divisions and departments underneath before making organizational changes."
            steps={[
              'Search by directorate name or code to locate a unit.',
              'Use Assign Leader to update executive responsibilities.',
              'Drill into a division to confirm general manager and department coverage.'
            ]}
            />
          </div>
        </div>

        <HelpGuideCard
          title="Maintain Directorate Structure"
          description="Search for directorates, review leadership assignments, and drill down into their divisions and departments. Use this view to validate hierarchy before updating division or department records."
          links={[
            { label: "Divisions", href: "/admin/divisions" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Directorates</p>
                <p className="text-2xl font-bold">{directorates.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <Network className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Divisions</p>
                <p className="text-2xl font-bold">{mounted ? divisions.filter((d) => d.isActive).length : 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-info/10">
                <Users className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold">{mounted ? departments.filter((d) => d.isActive).length : 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/10">
                <UserCircle2 className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Leadership</p>
                <p className="text-2xl font-bold">{leadershipCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search directorates..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-6">
          {filteredDirectorates
            .filter((directorate) => directorate.isActive || searchQuery.trim().length > 0)
            .map((directorate) => {
            const dirDivisions = mounted ? divisions.filter(
              (div) => div.directorateId === directorate.id && div.isActive
            ) : [];
            const divisionCount = dirDivisions.length;
            const departmentCount = dirDivisions.reduce((acc, division) => {
              const divisionDepartments = departments.filter(
                (department) => department.divisionId === division.id && department.isActive
              );
              return acc + divisionDepartments.length;
            }, 0);
            const leadershipName = getExecutive(directorate);
            const leadershipEmail = getExecutiveEmail(directorate);

            return (
              <Card key={directorate.id}>
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <CardTitle className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        {directorate.name}
                        <Badge variant="outline" className="text-xs uppercase">{directorate.code}</Badge>
                      </span>
                      <Badge variant="secondary">{mounted ? dirDivisions.length : 0} Divisions</Badge>
                      <Badge variant="outline">{mounted ? departmentCount : 0} Departments</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {!directorate.isActive && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDirectorate(directorate);
                          setLeadershipDialogOpen(true);
                        }}
                      >
                        Assign Leader
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-4 bg-muted/30">
                    <p className="text-sm font-semibold text-muted-foreground">{getExecutiveTitle(directorate)}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <Badge>{leadershipName}</Badge>
                      {leadershipEmail && (
                        <span className="text-xs text-muted-foreground">
                          {leadershipEmail}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {dirDivisions.map((division) => {
                      const managerName = getDivisionManager(division.id);
                      const managerEmail = getDivisionManagerEmail(division.id);
                      const divisionRecord = divisions.find(d => d.id === division.id);
                      const divisionDepartments = departments.filter(
                        (department) => department.divisionId === division.id && department.isActive
                      );

                      return (
                        <Card key={division.id} className="border-muted">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">{divisionRecord?.name ?? division.name}</h3>
                              <Badge variant="outline">{mounted ? divisionDepartments.length : 0} Depts</Badge>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-muted-foreground mb-1">
                                General Manager
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{managerName}</Badge>
                                {managerEmail && (
                                  <span className="text-xs text-muted-foreground">
                                    {managerEmail}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1">
                              {divisionDepartments.map((dept) => {
                                const deptRecord = departments.find(d => d.id === dept.id);
                                const agmName = dept.assistantGeneralManagerId
                                  ? users.find((u) => u.id === dept.assistantGeneralManagerId)?.name
                                  : null;
                                return (
                                  <div
                                    key={dept.id}
                                    className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">
                                        {deptRecord?.name ?? dept.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Code: {dept.code}
                                      </span>
                                    </div>
                                    {agmName && (
                                      <Badge variant="outline" className="text-xs">
                                        AGM: {agmName}
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredDirectorates.filter((directorate) => directorate.isActive || searchQuery.trim().length > 0).length === 0 && (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                No directorates match your search query.
              </CardContent>
            </Card>
          )}
        </div>

        <DirectorateLeadershipDialog
          open={leadershipDialogOpen}
          onOpenChange={(open) => {
            setLeadershipDialogOpen(open);
            if (!open) {
              setSelectedDirectorate(null);
            }
          }}
          directorate={selectedDirectorate}
        />

        <DirectorateFormModal
          open={formModalOpen}
          onOpenChange={(open) => {
            setFormModalOpen(open);
            if (!open) {
              setSelectedDirectorate(null);
            }
          }}
          directorate={selectedDirectorate || undefined}
        />
      </div>
    </DashboardLayout>
  );
};

export default DirectoratesManagement;

