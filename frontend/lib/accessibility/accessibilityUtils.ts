// Accessibility utility functions

export const generateAriaLabel = (baseLabel: string, additionalInfo?: string[]): string => {
  if (!additionalInfo || additionalInfo.length === 0) return baseLabel;
  return `${baseLabel}. ${additionalInfo.join(". ")}`;
};

export const getAriaExpanded = (isExpanded: boolean): boolean => isExpanded;

export const getAriaSelected = (isSelected: boolean): boolean => isSelected;

export const getAriaCurrent = (isCurrent: boolean): "page" | "step" | "location" | "date" | "time" | false => {
  return isCurrent ? "page" : false;
};

// Skip link functionality
export const skipToContent = (targetId: string) => {
  const target = document.getElementById(targetId);
  if (target) {
    target.focus();
    target.scrollIntoView({ behavior: "smooth" });
  }
};

// Focus management
export const moveFocus = (direction: "next" | "previous" | "first" | "last", container?: HTMLElement) => {
  const focusableElements = getFocusableElements(container);
  const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as HTMLElement);

  let nextIndex: number;
  switch (direction) {
    case "next":
      nextIndex = Math.min(currentIndex + 1, focusableElements.length - 1);
      break;
    case "previous":
      nextIndex = Math.max(currentIndex - 1, 0);
      break;
    case "first":
      nextIndex = 0;
      break;
    case "last":
      nextIndex = focusableElements.length - 1;
      break;
    default:
      return;
  }

  focusableElements[nextIndex]?.focus();
};

export const getFocusableElements = (container?: HTMLElement): NodeListOf<HTMLElement> => {
  const root = container || document;
  return root.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
};

// Screen reader utilities
export const announceToScreenReader = (message: string, priority: "polite" | "assertive" = "polite") => {
  const announcement = document.createElement("div");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.setAttribute("class", "sr-only");
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
};

// Color contrast utilities
export const hasGoodContrast = (foreground: string, background: string): boolean => {
  // Simple contrast check - in a real app you'd use a proper color contrast library
  // This is a basic implementation
  const fgBrightness = getBrightness(foreground);
  const bgBrightness = getBrightness(background);
  const contrast = Math.abs(fgBrightness - bgBrightness);

  return contrast > 125; // WCAG AA requires 4.5:1 ratio, this is a simplified check
};

const getBrightness = (color: string): number => {
  // Convert hex to RGB and calculate brightness
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  return (r * 299 + g * 587 + b * 114) / 1000;
};

// Keyboard shortcut helpers
export const formatKeyboardShortcut = (keys: string[]): string => {
  return keys.join(" + ");
};

export const getKeyboardShortcutDescription = (action: string, keys: string[]): string => {
  return `${action} (${formatKeyboardShortcut(keys)})`;
};

// Form accessibility helpers
export const getFormFieldErrorId = (fieldName: string): string => `${fieldName}-error`;

export const getFormFieldDescriptionId = (fieldName: string): string => `${fieldName}-description`;

export const announceFormError = (fieldName: string, errorMessage: string) => {
  announceToScreenReader(`Error in ${fieldName}: ${errorMessage}`, "assertive");
};

export const announceFormSuccess = (message: string) => {
  announceToScreenReader(message, "polite");
};

