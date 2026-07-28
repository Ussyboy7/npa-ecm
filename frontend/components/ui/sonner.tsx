"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast, type ExternalToast } from "sonner";

import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

type ToasterProps = React.ComponentProps<typeof Sonner>;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type LegacyToastInput = Omit<ToasterToast, "id">;

function toToastText(value: React.ReactNode | undefined): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return undefined;
}

function legacyToast({ title, description, variant }: LegacyToastInput) {
  const titleText = toToastText(title);
  const descriptionText = toToastText(description);
  const message = titleText ?? descriptionText ?? "";
  const sonnerDescription = titleText && descriptionText ? descriptionText : undefined;

  const sonnerId =
    variant === "destructive"
      ? sonnerToast.error(message, { description: sonnerDescription })
      : sonnerToast.message(message, { description: sonnerDescription });

  const id = String(sonnerId);

  return {
    id,
    dismiss: () => sonnerToast.dismiss(sonnerId),
    update: (props: ToasterToast) => {
      sonnerToast.dismiss(sonnerId);
      return legacyToast(props);
    },
  };
}

type ToastFn = typeof sonnerToast & {
  (input: LegacyToastInput): ReturnType<typeof legacyToast>;
};

const toast = Object.assign(
  (input: string | LegacyToastInput, options?: ExternalToast) => {
    if (typeof input === "string") {
      return sonnerToast(input, options);
    }
    return legacyToast(input);
  },
  sonnerToast,
) as ToastFn;

function useToast() {
  return {
    toasts: [] as ToasterToast[],
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) {
        sonnerToast.dismiss(toastId);
        return;
      }
      sonnerToast.dismiss();
    },
  };
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast, useToast };
