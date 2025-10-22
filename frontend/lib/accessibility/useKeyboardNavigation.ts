"use client";

import { useEffect, useCallback } from "react";

interface KeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: () => void;
  onShiftTab?: () => void;
  enabled?: boolean;
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions) => {
  const {
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onShiftTab,
    enabled = true
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const { key, shiftKey } = event;

    switch (key) {
      case "Escape":
        event.preventDefault();
        onEscape?.();
        break;
      case "Enter":
        event.preventDefault();
        onEnter?.();
        break;
      case "ArrowUp":
        event.preventDefault();
        onArrowUp?.();
        break;
      case "ArrowDown":
        event.preventDefault();
        onArrowDown?.();
        break;
      case "ArrowLeft":
        event.preventDefault();
        onArrowLeft?.();
        break;
      case "ArrowRight":
        event.preventDefault();
        onArrowRight?.();
        break;
      case "Tab":
        if (shiftKey) {
          onShiftTab?.();
        } else {
          onTab?.();
        }
        break;
    }
  }, [enabled, onEscape, onEnter, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onTab, onShiftTab]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [enabled, handleKeyDown]);
};

// Hook for managing focus within a container
export const useFocusTrap = (containerRef: React.RefObject<HTMLElement>, enabled: boolean = true) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || !containerRef.current) return;

    const { key, shiftKey } = event;
    const container = containerRef.current;

    if (key === "Tab") {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [enabled, containerRef]);

  useEffect(() => {
    if (enabled && containerRef.current) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [enabled, containerRef, handleKeyDown]);
};

// Hook for announcing content to screen readers
export const useScreenReaderAnnouncement = () => {
  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", priority);
    announcement.setAttribute("aria-atomic", "true");
    announcement.setAttribute("class", "sr-only");
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove the announcement after it's been read
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return announce;
};

