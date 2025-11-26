/**
 * Constants for modal components
 * Centralized limits and settings for consistency across all modals
 */

export const MODAL_CONSTANTS = {
  // Character limits
  MINUTE_TEXT: {
    MIN: 10,
    MAX: 5000,
  },
  ROUTING_NOTES: {
    MIN: 10,
    MAX: 500,
  },
  ADDITIONAL_MINUTE: {
    MIN: 1,
    MAX: 1000,
  },
  RECALL_REASON: {
    MIN: 0,
    MAX: 500,
  },
  REASSIGN_REASON: {
    MIN: 10,
    MAX: 500,
  },
  MEMO_SUBJECT: {
    MIN: 5,
    MAX: 200,
  },
  MEMO_CONTENT: {
    MIN: 10,
    MAX: 10000,
  },
  DELEGATION_NOTES: {
    MIN: 0,
    MAX: 1000,
  },

  // Time limits
  EDIT_WINDOW_MINUTES: 30,

  // User selection limits
  USER_SEARCH_RESULTS: 50,
  PARALLEL_ROUTE_USERS: 20,

  // File size limits (in bytes)
  FILE_UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
  },
} as const;

export type ModalConstants = typeof MODAL_CONSTANTS;

