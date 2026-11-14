import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, onValueChange, onFocus, onBlur, ...props }, ref) => {
  // Radix selects on focus only when its document-level "arrow key held" flag is
  // set. That never applies here: RovingFocusGroup moves focus inside the keydown,
  // but the resulting focusin is dispatched after keyup, once every key flag is
  // cleared. So arrow keys moved focus without checking anything. Instead, follow
  // focus that moves from one radio to another in this group (the roving tabindex
  // means only arrow keys or a click can do that) and leave unrelated focus, such
  // as a dialog focusing its first field on open, alone.
  const lastFocusedValueRef = React.useRef<string | null>(null);

  return (
    <RadioGroupPrimitive.Root
      {...props}
      ref={ref}
      className={cn("grid gap-2", className)}
      onValueChange={onValueChange}
      onFocus={(event) => {
        onFocus?.(event);
        const target = event.target as HTMLElement;
        if (target.getAttribute?.("role") !== "radio" || target.hasAttribute("disabled")) return;
        const value = target.getAttribute("value");
        const movedBetweenRadios = lastFocusedValueRef.current !== null;
        lastFocusedValueRef.current = value;
        if (movedBetweenRadios && value) onValueChange?.(value);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          lastFocusedValueRef.current = null;
        }
      }}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
