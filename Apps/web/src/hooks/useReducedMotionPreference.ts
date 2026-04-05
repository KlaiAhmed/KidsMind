import { useEffect, useState } from 'react';
import {
  getEffectiveReducedMotion,
  subscribeToReducedMotionChanges,
} from '../utils/motionPreferences';

const useReducedMotionPreference = (): boolean => {
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(() => {
    return getEffectiveReducedMotion();
  });

  useEffect(() => {
    const handlePreferenceChange = (): void => {
      setIsReducedMotion(getEffectiveReducedMotion());
    };

    const unsubscribe = subscribeToReducedMotionChanges(handlePreferenceChange);
    handlePreferenceChange();

    return unsubscribe;
  }, []);

  return isReducedMotion;
};

export { useReducedMotionPreference };
