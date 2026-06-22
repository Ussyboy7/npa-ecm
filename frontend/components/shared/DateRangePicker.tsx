"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  className?: string;
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(dateFrom);
  const [localTo, setLocalTo] = useState(dateTo);

  const presets = [
    { label: "Today", getValue: () => {
      const d = new Date();
      const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      return { from: s, to: s };
    }},
    { label: "This Week", getValue: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      const s = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,"0")}-${String(start.getDate()).padStart(2,"0")}`;
      const e = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      return { from: s, to: e };
    }},
    { label: "This Month", getValue: () => {
      const now = new Date();
      const s = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
      const e = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      return { from: s, to: e };
    }},
    { label: "This Year", getValue: () => {
      const now = new Date();
      const s = `${now.getFullYear()}-01-01`;
      const e = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      return { from: s, to: e };
    }},
    { label: "All Time", getValue: () => ({ from: "", to: "" })},
  ];

  const handlePreset = (preset: typeof presets[0]) => {
    const { from, to } = preset.getValue();
    setLocalFrom(from);
    setLocalTo(to);
    onDateFromChange(from);
    onDateToChange(to);
    setOpen(false);
  };

  const handleApply = () => {
    onDateFromChange(localFrom);
    onDateToChange(localTo);
    setOpen(false);
  };

  const triggerLabel = dateFrom || dateTo
    ? `${dateFrom || "..."} – ${dateTo || "..."}`
    : "All Time";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 text-xs font-normal gap-1.5", className)}
        >
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">From</label>
              <Input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">To</label>
              <Input
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t">
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" className="text-xs h-7" onClick={handleApply}>Apply</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
