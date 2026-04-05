import { useContext } from 'react';
import { AccessibilityContext } from '../store/AccessibilityContext';
import type { AccessibilityContextValue } from '../store/AccessibilityContext';

const useAccessibility = (): AccessibilityContextValue => {
  const context = useContext(AccessibilityContext);

  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider.');
  }

  return context;
};

export { useAccessibility };
