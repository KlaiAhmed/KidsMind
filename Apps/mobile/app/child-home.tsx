import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import ChildHomeDashboard from '@/screens/ChildHomeDashboard';

export default function ChildHomeRoute() {
  const { selectChild } = useAuth();
  const params = useLocalSearchParams<{ childId?: string }>();
  const childId = typeof params.childId === 'string' ? params.childId.trim() : '';

  useEffect(() => {
    if (!childId) {
      return;
    }

    selectChild(childId);
  }, [childId, selectChild]);

  return <ChildHomeDashboard />;
}