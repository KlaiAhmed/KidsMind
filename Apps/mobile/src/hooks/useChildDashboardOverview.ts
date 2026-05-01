import { useQuery } from '@tanstack/react-query';

import { useChildProfile } from '@/hooks/useChildProfile';
import { getChildDashboardOverview } from '@/services/childService';
import type { ChildDashboardOverview } from '@/types/child';

export function useChildDashboardOverview() {
  const { profile } = useChildProfile();
  const childId = profile?.id;

  return useQuery<ChildDashboardOverview>({
    queryKey: ['child-dashboard-overview', childId],
    queryFn: () => getChildDashboardOverview(childId!),
    enabled: Boolean(childId),
    staleTime: 5 * 60 * 1000,
  });
}
