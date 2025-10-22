"use client";

import { useNotifications, Notification } from "./NotificationContext";

// Hook for easy notification management
export const useNotificationActions = () => {
  const { addNotification } = useNotifications();

  const showSuccess = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
    return addNotification({
      type: "success",
      title,
      message,
      action
    });
  };

  const showError = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
    return addNotification({
      type: "error",
      title,
      message,
      action,
      duration: 7000 // Errors stay longer
    });
  };

  const showWarning = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
    return addNotification({
      type: "warning",
      title,
      message,
      action,
      duration: 6000
    });
  };

  const showInfo = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
    return addNotification({
      type: "info",
      title,
      message,
      action
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

// Common notification messages
export const notificationMessages = {
  // Memo notifications
  memoSubmitted: {
    title: "Memo Submitted Successfully",
    message: "Your memo has been submitted and is pending approval."
  },
  memoApproved: {
    title: "Memo Approved",
    message: "Your memo has been approved and forwarded to the next level."
  },
  memoRejected: {
    title: "Memo Rejected",
    message: "Your memo has been rejected. Please check the comments and resubmit."
  },
  memoForwarded: {
    title: "Memo Forwarded",
    message: "The memo has been forwarded to the next approver."
  },

  // Document notifications
  documentUploaded: {
    title: "Document Uploaded",
    message: "Your document has been uploaded successfully."
  },
  documentApproved: {
    title: "Document Approved",
    message: "The document has been approved and is now available."
  },

  // General notifications
  networkError: {
    title: "Connection Error",
    message: "Please check your internet connection and try again."
  },
  saveSuccess: {
    title: "Saved Successfully",
    message: "Your changes have been saved."
  },
  validationError: {
    title: "Validation Error",
    message: "Please check the form and correct any errors."
  },

  // Approval notifications
  approvalRequested: {
    title: "Approval Requested",
    message: "A new document requires your approval."
  },
  approvalReminder: {
    title: "Approval Reminder",
    message: "You have pending approvals that need your attention."
  }
};

// Helper function to show common notifications
export const showCommonNotification = (
  addNotification: (notification: Omit<Notification, "id">) => string,
  type: "success" | "error" | "warning" | "info",
  key: keyof typeof notificationMessages,
  customMessage?: string
) => {
  const notification = notificationMessages[key];
  return addNotification({
    type,
    title: notification.title,
    message: customMessage || notification.message
  });
};
