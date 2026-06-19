"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getCaseTemplates, createCaseFromTemplate, type CaseTemplate } from "@/lib/api/cases";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import { logError } from "@/lib/client-logger";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Search,
  CheckCircle2,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CaseTemplatesPage() {
  const router = useRouter();
  const {currentUser, hydrated: _hydrated } = useCurrentUser();
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<CaseTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [caseData, setCaseData] = useState({
    title: "",
    description: "",
    priority: "medium",
  });

  useEffect(() => {
    if (!currentUser?.id) return;
    loadTemplates();
  }, [currentUser?.id]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getCaseTemplates();
      setTemplates(Array.isArray(data) ? data.filter((t) => t.is_active) : []);
    } catch (err) {
      logError("Failed to load templates", err);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = (template: CaseTemplate) => {
    setSelectedTemplate(template);
    setCaseData({
      title: (template.structure?.default_fields as Record<string, unknown>)?.title as string || "",
      description: (template.structure?.default_fields as Record<string, unknown>)?.description as string || "",
      priority: template.default_priority || "medium",
    });
    setShowCreateDialog(true);
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    setCreating(true);
    try {
      const newCase = await createCaseFromTemplate(selectedTemplate.id, {
        title: caseData.title,
        description: caseData.description,
        priority: caseData.priority as "medium" | "low" | "high" | "urgent",
        caseType: selectedTemplate.case_type as "complaint" | "request" | "inquiry" | "project" | "legal" | "audit" | "general" | undefined,
      });
      toast.success("Case created successfully");
      router.push(`/cases/${newCase.id}`);
    } catch (err) {
      logError("Failed to create case", err);
      toast.error("Failed to create case");
    } finally {
      setCreating(false);
      setShowCreateDialog(false);
    }
  };

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser?.id) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Case Templates</h1>
            <p className="text-muted-foreground mt-1">
              Create cases from pre-configured templates
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-12 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Loading templates...</span>
              </div>
            </CardContent>
          </Card>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {searchQuery ? "No templates match your search" : "No templates available"}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {template.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{template.case_type_display}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Default Priority:</span>
                      <Badge variant="secondary">{template.default_priority}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Usage Count:</span>
                      <span className="font-medium">{template.usage_count}</span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleCreateFromTemplate(template)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Case
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Case Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Case from Template</DialogTitle>
              <DialogDescription>
                {selectedTemplate?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Case Title *</Label>
                <Input
                  id="title"
                  value={caseData.title}
                  onChange={(e) => setCaseData({ ...caseData, title: e.target.value })}
                  placeholder="Enter case title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={caseData.description}
                  onChange={(e) => setCaseData({ ...caseData, description: e.target.value })}
                  placeholder="Enter case description"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={caseData.priority}
                  onValueChange={(value) => setCaseData({ ...caseData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!caseData.title.trim() || creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Create Case
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
