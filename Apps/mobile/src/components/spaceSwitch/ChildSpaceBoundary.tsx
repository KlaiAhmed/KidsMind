import { createContext, useContext, type ReactNode } from 'react';

interface ChildSpaceBoundaryValue {
  isParentAccessGateVisible: boolean;
  requestParentAccess: () => void;
}

const ChildSpaceBoundaryContext = createContext<ChildSpaceBoundaryValue | null>(null);

export function ChildSpaceBoundaryProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ChildSpaceBoundaryValue;
}) {
  return (
    <ChildSpaceBoundaryContext.Provider value={value}>
      {children}
    </ChildSpaceBoundaryContext.Provider>
  );
}

export function useChildSpaceBoundary(): ChildSpaceBoundaryValue {
  const context = useContext(ChildSpaceBoundaryContext);

  if (!context) {
    throw new Error('useChildSpaceBoundary must be used inside ChildSpaceBoundaryProvider');
  }

  return context;
}
