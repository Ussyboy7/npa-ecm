import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Correspondence, Minute, MOCK_CORRESPONDENCE, MOCK_MINUTES } from '@/lib/npa-structure';
import {
  loadCorrespondence,
  loadMinutes,
  saveCorrespondence,
  saveMinutes,
  addCorrespondence as addCorrespondenceToStorage,
  addMinute as addMinuteToStorage,
  updateCorrespondence as updateCorrespondenceInStorage,
  initializeFromMockData,
} from '@/lib/storage';
import { Delegation, loadDelegations } from '@/lib/delegation-storage';

interface CorrespondenceContextType {
  correspondence: Correspondence[];
  minutes: Minute[];
  delegations: Delegation[];
  getCorrespondenceById: (id: string) => Correspondence | undefined;
  getMinutesByCorrespondenceId: (id: string) => Minute[];
  addMinute: (minute: Minute) => void;
  updateCorrespondence: (id: string, updates: Partial<Correspondence>) => void;
  addCorrespondence: (correspondence: Correspondence) => void;
  refreshData: () => void;
}

const CorrespondenceContext = createContext<CorrespondenceContextType | undefined>(undefined);

export const CorrespondenceProvider = ({ children }: { children: ReactNode }) => {
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);

  // Initialize data on mount
  useEffect(() => {
    initializeFromMockData(MOCK_CORRESPONDENCE, MOCK_MINUTES);
    refreshData();
  }, []);

  const refreshData = () => {
    const loadedCorrespondence = loadCorrespondence() || MOCK_CORRESPONDENCE;
    const loadedMinutes = loadMinutes() || MOCK_MINUTES;
    const loadedDelegations = loadDelegations();
    setCorrespondence(loadedCorrespondence);
    setMinutes(loadedMinutes);
    setDelegations(loadedDelegations);
  };

  const getCorrespondenceById = (id: string) => {
    return correspondence.find(c => c.id === id);
  };

  const getMinutesByCorrespondenceId = (id: string) => {
    return minutes.filter(m => m.correspondenceId === id);
  };

  const addMinute = (minute: Minute) => {
    addMinuteToStorage(minute);
    setMinutes(prev => [...prev, minute]);
  };

  const updateCorrespondence = (id: string, updates: Partial<Correspondence>) => {
    const updated = updateCorrespondenceInStorage(id, updates);
    if (updated) {
      setCorrespondence(prev => 
        prev.map(c => c.id === id ? updated : c)
      );
    }
  };

  const addCorrespondence = (newCorr: Correspondence) => {
    addCorrespondenceToStorage(newCorr);
    setCorrespondence(prev => [newCorr, ...prev]);
  };

  return (
    <CorrespondenceContext.Provider
      value={{
        correspondence,
        minutes,
        delegations,
        getCorrespondenceById,
        getMinutesByCorrespondenceId,
        addMinute,
        updateCorrespondence,
        addCorrespondence,
        refreshData,
      }}
    >
      {children}
    </CorrespondenceContext.Provider>
  );
};

export const useCorrespondence = () => {
  const context = useContext(CorrespondenceContext);
  if (!context) {
    throw new Error('useCorrespondence must be used within CorrespondenceProvider');
  }
  return context;
};
