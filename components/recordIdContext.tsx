'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface RecordIdContextType {
  recordId: string | null;
  setRecordId: (id: string) => void;
}

const RecordIdContext = createContext<RecordIdContextType | undefined>(undefined);

// Custom hook to access the context
export const useRecordId = () => {
  const context = useContext(RecordIdContext);
  if (!context) {
    throw new Error('useRecordId must be used within a RecordIdProvider');
  }
  return context;
};

// RecordIdProvider accepts `children` as props
interface RecordIdProviderProps {
  children: ReactNode;
}

export const RecordIdProvider: React.FC<RecordIdProviderProps> = ({ children }) => {
  const [recordId, setRecordId] = useState<string | null>(null);

  return (
    <RecordIdContext.Provider value={{ recordId, setRecordId }}>
      {children}
    </RecordIdContext.Provider>
  );
};
