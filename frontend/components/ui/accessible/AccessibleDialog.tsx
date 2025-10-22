"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useFocusTrap, useKeyboardNavigation } from "@/lib/accessibility/useKeyboardNavigation";
import AccessibleButton from "./AccessibleButton";

interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

const AccessibleDialog: React.FC<AccessibleDialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = ""
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap
  useFocusTrap(dialogRef, isOpen);

  // Keyboard navigation
  useKeyboardNavigation({
    onEscape: onClose,
    enabled: isOpen
  });

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus the dialog
      if (dialogRef.current) {
        dialogRef.current.focus();
      }

      // Prevent body scroll
      document.body.style.overflow = "hidden";
    } else {
      // Restore previous focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }

      // Restore body scroll
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
        />

        {/* Dialog */}
        <div
          ref={dialogRef}
          className={`relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} w-full ${className}`}
          tabIndex={-1}
          role="document"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2
              id="dialog-title"
              className="text-lg font-medium text-gray-900"
            >
              {title}
            </h2>
            {showCloseButton && (
              <AccessibleButton
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1"
              >
                <X className="h-5 w-5" />
              </AccessibleButton>
            )}
          </div>

          {/* Content */}
          <div
            id="dialog-description"
            className="px-6 py-4"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibleDialog;
