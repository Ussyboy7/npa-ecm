"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { PageLoadingSkeleton } from "./SkeletonComponents";

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  loadingMessage?: string;
  setLoadingMessage: (message?: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>();

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
    if (!loading) {
      setLoadingMessage(undefined);
    }
  };

  const value = {
    isLoading,
    setLoading,
    loadingMessage,
    setLoadingMessage
  };

  return (
    <LoadingContext.Provider value={value}>
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white">
          <PageLoadingSkeleton />
          {loadingMessage && (
            <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
              {loadingMessage}
            </div>
          )}
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
};

export default LoadingProvider;

