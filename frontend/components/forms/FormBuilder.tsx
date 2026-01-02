"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, GripVertical, X } from "lucide-react";
import type { FormField, FormFieldType } from "@/lib/types/forms";
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

interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "DateTime" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi-Select" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
  { value: "file", label: "File" },
];

function SortableFieldCard({
  field,
  onEdit,
  onDelete,
}: {
  field: FormField;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{field.label}</span>
                <Badge variant="outline" className="text-xs">
                  {field.type}
                </Badge>
                {field.required && (
                  <Badge variant="secondary" className="text-xs">
                    Required
                  </Badge>
                )}
              </div>
              {field.placeholder && (
                <p className="text-xs text-muted-foreground">Placeholder: {field.placeholder}</p>
              )}
              {field.options && field.options.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {field.options.length} option{field.options.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function FormBuilder({ fields, onChange }: FormBuilderProps) {
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState<Partial<FormField>>({
    id: "",
    name: "",
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    options: [],
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newFields = arrayMove(fields, oldIndex, newIndex);
      onChange(newFields);
    }
  };

  const generateFieldId = () => {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateFieldName = (label: string) => {
    return label
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "_")
      .replace(/^-+|-+$/g, "");
  };

  const handleAddField = () => {
    setEditingField(null);
    setFieldForm({
      id: generateFieldId(),
      name: "",
      label: "",
      type: "text",
      required: false,
      placeholder: "",
      options: [],
    });
    setFormOpen(true);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field);
    setFieldForm({ ...field });
    setFormOpen(true);
  };

  const handleDeleteField = (fieldId: string) => {
    const newFields = fields.filter((f) => f.id !== fieldId);
    onChange(newFields);
  };

  const handleSaveField = () => {
    if (!fieldForm.label || !fieldForm.type) {
      return;
    }

    const fieldName = fieldForm.name || generateFieldName(fieldForm.label);
    const newField: FormField = {
      id: fieldForm.id || generateFieldId(),
      name: fieldName,
      label: fieldForm.label,
      type: fieldForm.type,
      required: fieldForm.required || false,
      placeholder: fieldForm.placeholder,
      validation: fieldForm.validation,
      options: fieldForm.options || [],
    };

    if (editingField) {
      const newFields = fields.map((f) => (f.id === editingField.id ? newField : f));
      onChange(newFields);
    } else {
      onChange([...fields, newField]);
    }

    setFormOpen(false);
    setEditingField(null);
    setFieldForm({
      id: "",
      name: "",
      label: "",
      type: "text",
      required: false,
      placeholder: "",
      options: [],
    });
  };

  const handleAddOption = () => {
    const newOptions = [...(fieldForm.options || []), { value: "", label: "" }];
    setFieldForm({ ...fieldForm, options: newOptions });
  };

  const handleUpdateOption = (index: number, value: string, label: string) => {
    const newOptions = [...(fieldForm.options || [])];
    newOptions[index] = { value, label };
    setFieldForm({ ...fieldForm, options: newOptions });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = fieldForm.options?.filter((_, i) => i !== index) || [];
    setFieldForm({ ...fieldForm, options: newOptions });
  };

  const needsOptions = ["select", "multiselect", "radio"].includes(fieldForm.type || "");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Form Fields</h3>
          <p className="text-sm text-muted-foreground">
            Define the fields for this form. Drag to reorder.
          </p>
        </div>
        <Button onClick={handleAddField} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30">
          <p className="text-sm text-muted-foreground mb-4">
            No fields defined. Add your first field to get started.
          </p>
          <Button onClick={handleAddField} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add First Field
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {fields.map((field) => (
                <SortableFieldCard
                  key={field.id}
                  field={field}
                  onEdit={() => handleEditField(field)}
                  onDelete={() => handleDeleteField(field.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit Field" : "Add Field"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Field Label <span className="text-destructive">*</span>
              </Label>
              <Input
                value={fieldForm.label || ""}
                onChange={(e) => {
                  const label = e.target.value;
                  setFieldForm({
                    ...fieldForm,
                    label,
                    name: fieldForm.name || generateFieldName(label),
                  });
                }}
                placeholder="e.g., Requestor Name"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Field Name (auto-generated)
              </Label>
              <Input
                value={fieldForm.name || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })}
                placeholder="field_name"
              />
              <p className="text-xs text-muted-foreground">
                Internal identifier. Auto-generated from label.
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Field Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={fieldForm.type}
                onValueChange={(value) => {
                  setFieldForm({
                    ...fieldForm,
                    type: value as FormFieldType,
                    options: needsOptions ? fieldForm.options : undefined,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={fieldForm.placeholder || ""}
                onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                placeholder="Enter placeholder text..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={fieldForm.required || false}
                onCheckedChange={(checked) =>
                  setFieldForm({ ...fieldForm, required: checked as boolean })
                }
              />
              <Label htmlFor="required" className="font-normal cursor-pointer">
                Required field
              </Label>
            </div>

            {needsOptions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Options</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {fieldForm.options?.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Value"
                        value={option.value}
                        onChange={(e) =>
                          handleUpdateOption(index, e.target.value, option.label)
                        }
                      />
                      <Input
                        placeholder="Label"
                        value={option.label}
                        onChange={(e) =>
                          handleUpdateOption(index, option.value, e.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(!fieldForm.options || fieldForm.options.length === 0) && (
                    <p className="text-xs text-muted-foreground">
                      Add at least one option for {fieldForm.type} fields
                    </p>
                  )}
                </div>
              </div>
            )}

            {(fieldForm.type === "number" || fieldForm.type === "currency") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Value</Label>
                  <Input
                    type="number"
                    value={fieldForm.validation?.min || ""}
                    onChange={(e) =>
                      setFieldForm({
                        ...fieldForm,
                        validation: {
                          ...fieldForm.validation,
                          min: e.target.value ? parseFloat(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Value</Label>
                  <Input
                    type="number"
                    value={fieldForm.validation?.max || ""}
                    onChange={(e) =>
                      setFieldForm({
                        ...fieldForm,
                        validation: {
                          ...fieldForm.validation,
                          max: e.target.value ? parseFloat(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveField} disabled={!fieldForm.label || !fieldForm.type}>
              {editingField ? "Update Field" : "Add Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

