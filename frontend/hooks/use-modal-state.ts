/**
 * Custom hook for managing modal state with a single state variable
 * Reduces the number of useState hooks needed for modal management
 */

import { useState, useCallback } from 'react';

export type ModalType =
  | 'minute'
  | 'edit-minute'
  | 'recall-minute'
  | 'additional-minute'
  | 'parallel-route'
  | 'treatment'
  | 'completion'
  | 'delegate'
  | 'minute-detail'
  | 'print-preview'
  | 'document-preview'
  | 'link-document'
  | 'link-case'
  | 'upload'
  | null;

export interface UseModalStateReturn {
  activeModal: ModalType;
  openModal: (type: ModalType) => void;
  closeModal: () => void;
  isOpen: (type: ModalType) => boolean;
}

/**
 * Hook for managing multiple modal states with a single state variable
 * 
 * @returns Object with activeModal, openModal, closeModal, and isOpen functions
 * 
 * @example
 * const { activeModal, openModal, closeModal, isOpen } = useModalState();
 * 
 * // Open a modal
 * openModal('minute');
 * 
 * // Check if modal is open
 * if (isOpen('minute')) { ... }
 * 
 * // Close modal
 * closeModal();
 */
export const useModalState = (): UseModalStateReturn => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const openModal = useCallback((type: ModalType) => {
    setActiveModal(type);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const isOpen = useCallback((type: ModalType) => {
    return activeModal === type;
  }, [activeModal]);

  return {
    activeModal,
    openModal,
    closeModal,
    isOpen,
  };
};

