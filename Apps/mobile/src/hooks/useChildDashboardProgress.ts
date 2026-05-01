import { useQuery } from '@tanstack/react-query';

import { useChildProfile } from '@/hooks/useChildProfile';
import { getChildDashboardProgress } from '@/services/childService';
import type { ChildDashboardProgress } from '@/types/child';

export function useChildDashboardProgress() {
  const { profile } = useChildProfile();
  const childId = profile?.id;

  return useQuery<ChildDashboardProgress>({
    queryKey: ['child-dashboard-progress', childId],
    queryFn: () => getChildDashboardProgress(childId!),
    enabled: Boolean(childId),
    staleTime: 5 * 60 * 1000,
  });
}
