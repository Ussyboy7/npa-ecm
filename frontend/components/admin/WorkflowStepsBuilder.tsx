"use client";

import { useState, useMemo } from "react";
import { logError } from '@/lib/client-logger';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import { WorkflowStepCard } from "./WorkflowStepCard";
import { WorkflowStepForm } from "./WorkflowStepForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { reorderWorkflowSteps, createWorkflowStep, updateWorkflowStep, deleteWorkflowStep } from "@/lib/api/workflow";
import { toast } from "@/hooks/use-toast";
import type { WorkflowStep, WorkflowStepFormData } from "@/lib/types/workflow";

interface WorkflowStepsBuilderProps {
  templateId: string;
  steps: WorkflowStep[];
  onStepsChange: (steps: WorkflowStep[]) => void;
}

function SortableStepCard({
  step,
  onEdit,
  onDelete,
}: {
  step: WorkflowStep;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <WorkflowStepCard
        step={step}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function WorkflowStepsBuilder({
  templateId,
  steps,
  onStepsChange,
}: WorkflowStepsBuilderProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null);
  const [_isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedSteps = useMemo(() => {
    return [...steps].sort((a, b) => a.order - b.order);
  }, [steps]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sortedSteps.findIndex((step) => step.id === active.id);
    const newIndex = sortedSteps.findIndex((step) => step.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newSteps = arrayMove(sortedSteps, oldIndex, newIndex);
    const newStepIds = newSteps.map((s) => s.id);

    setIsReordering(true);
    try {
      const reorderedSteps = await reorderWorkflowSteps(templateId, newStepIds);
      onStepsChange(reorderedSteps);
      toast({
        title: "Success",
        description: "Steps reordered successfully",
      });
    } catch (error: unknown) {
      logError("Error reordering steps:", error);
      toast({
        title: "Error",
        description: "Failed to reorder steps",
        variant: "destructive",
      });
    } finally {
      setIsReordering(false);
    }
  };

  const handleAddStep = () => {
    setEditingStep(null);
    setFormOpen(true);
  };

  const handleEditStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setFormOpen(true);
  };

  const handleDeleteStep = (stepId: string) => {
    setDeletingStepId(stepId);
  };

  const confirmDelete = async () => {
    if (!deletingStepId) return;

    try {
      await deleteWorkflowStep(deletingStepId);
      const updatedSteps = steps.filter((s) => s.id !== deletingStepId);
      // Renumber remaining steps
      const renumberedSteps = updatedSteps.map((step, index) => ({
        ...step,
        order: index + 1,
      }));
      
      // Update orders in backend
      for (const step of renumberedSteps) {
        await updateWorkflowStep(step.id, {
          order: step.order,
          title: step.title,
          selection_mode: step.office ? "office" : "hierarchy",
          required_role: step.required_role || undefined,
          required_grade_level: step.required_grade_level || undefined,
          requires_all_assistants: step.requires_all_assistants,
          directorate: step.directorate || undefined,
          division: step.division || undefined,
          department: step.department || undefined,
          office: step.office || undefined,
        });
      }

      onStepsChange(renumberedSteps);
      toast({
        title: "Success",
        description: "Step deleted successfully",
      });
    } catch (error: unknown) {
      logError("Error deleting step:", error);
      toast({
        title: "Error",
        description: "Failed to delete step",
        variant: "destructive",
      });
    } finally {
      setDeletingStepId(null);
    }
  };

  const handleSaveStep = async (data: WorkflowStepFormData) => {
    try {
      if (editingStep) {
        const updated = await updateWorkflowStep(editingStep.id, data);
        const updatedSteps = steps.map((s) => (s.id === updated.id ? updated : s));
        onStepsChange(updatedSteps);
        toast({
          title: "Success",
          description: "Step updated successfully",
        });
      } else {
        const newStep = await createWorkflowStep({
          ...data,
          order: sortedSteps.length + 1,
        });
        onStepsChange([...steps, newStep]);
        toast({
          title: "Success",
          description: "Step added successfully",
        });
      }
      setFormOpen(false);
      setEditingStep(null);
    } catch (error: unknown) {
      logError("Error saving step:", error);
      throw error;
    }
  };

  const nextOrder = sortedSteps.length + 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Steps</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Drag to reorder steps
          </p>
        </div>
        <Button onClick={handleAddStep} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </div>

      {sortedSteps.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-6 sm:p-8 text-center bg-muted/30">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No steps defined. Add your first step to get started.
          </p>
          <Button onClick={handleAddStep} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add First Step
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedSteps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2.5">
              {sortedSteps.map((step) => (
                <SortableStepCard
                  key={step.id}
                  step={step}
                  onEdit={() => handleEditStep(step)}
                  onDelete={() => handleDeleteStep(step.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <WorkflowStepForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingStep(null);
          }
        }}
        step={editingStep}
        templateId={templateId}
        order={editingStep?.order || nextOrder}
        onSave={handleSaveStep}
      />

      <AlertDialog open={deletingStepId !== null} onOpenChange={(open) => !open && setDeletingStepId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Step</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this step? This action cannot be undone. Remaining steps will be renumbered automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

