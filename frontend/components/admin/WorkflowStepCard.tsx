"use client";

import { GripVertical, Edit, Trash2, Building2, Network, Users, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { WorkflowStep } from "@/lib/types/workflow";
import { cn } from "@/lib/utils";

interface WorkflowStepCardProps {
  step: WorkflowStep;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export function WorkflowStepCard({
  step,
  onEdit,
  onDelete,
  isDragging = false,
  dragHandleProps,
}: WorkflowStepCardProps) {
  const { directorates, divisions, departments, offices } = useOrganization();

  const getSelectionDisplay = () => {
    if (step.office) {
      const office = offices.find((o) => o.id === step.office);
      return {
        type: "office",
        icon: MapPin,
        label: office?.name || "Unknown Office",
        subtitle: office?.officeType || "",
      };
    }

    const parts: string[] = [];
    if (step.directorate) {
      const dir = directorates.find((d) => d.id === step.directorate);
      if (dir) parts.push(dir.name);
    }
    if (step.division) {
      const div = divisions.find((d) => d.id === step.division);
      if (div) parts.push(div.name);
    }
    if (step.department) {
      const dept = departments.find((d) => d.id === step.department);
      if (dept) parts.push(dept.name);
    }

    if (parts.length === 0) {
      return {
        type: "hierarchy",
        icon: Network,
        label: "No selection",
        subtitle: "",
      };
    }

    return {
      type: "hierarchy",
      icon: step.directorate ? Network : step.division ? Building2 : Users,
      label: parts.join(" → "),
      subtitle: step.directorate ? "Directorate" : step.division ? "Division" : "Department",
    };
  };

  const selection = getSelectionDisplay();
  const Icon = selection.icon;

  return (
    <Card
      className={cn(
        "relative group transition-all",
        isDragging && "opacity-50 shadow-lg scale-[1.02]"
      )}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2.5 sm:gap-3">
          {/* Drag Handle */}
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>

          {/* Step Content */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs shrink-0">
                    Step {step.order}
                  </Badge>
                  <h4 className="font-semibold text-sm sm:text-base truncate">{step.title}</h4>
                </div>
              </div>
            </div>

            {/* Selection Display */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="font-medium truncate">{selection.label}</span>
              {selection.subtitle && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {selection.subtitle}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs shrink-0">
                {selection.type === "office" ? "Office" : "Hierarchy"}
              </Badge>
            </div>

            {/* Requirements */}
            {(step.required_role || step.required_grade_level || step.requires_all_assistants) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {step.required_role && (
                  <Badge variant="secondary" className="text-xs">
                    Role: {step.required_role}
                  </Badge>
                )}
                {step.required_grade_level && (
                  <Badge variant="secondary" className="text-xs">
                    Grade: {step.required_grade_level}
                  </Badge>
                )}
                {step.requires_all_assistants && (
                  <Badge variant="secondary" className="text-xs">
                    All Assistants
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              onClick={onEdit}
              title="Edit step"
            >
              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Delete step"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

