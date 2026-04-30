import { useCallback, useEffect, useMemo } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { useChildProfile } from '@/hooks/useChildProfile';
import { getChildAvatarMap } from '@/services/parentDashboardService';
import type { ChildProfile } from '@/types/child';

export function useParentDashboardChild(routeChildId?: string) {
  const router = useRouter();
  const { childProfiles, childProfile, selectedChildId, selectChild: selectAuthChild } = useAuth();
  const { getAvatarById } = useChildProfile();
  const routeChildExists = Boolean(
    routeChildId && childProfiles.some((child) => child.id === routeChildId),
  );
  const effectiveSelectedChildId = routeChildExists ? routeChildId! : selectedChildId;

  useEffect(() => {
    if (routeChildExists && routeChildId && routeChildId !== selectedChildId) {
      selectAuthChild(routeChildId);
    }
  }, [routeChildExists, routeChildId, selectAuthChild, selectedChildId]);

  const avatarQueryKey = useMemo(
    () => childProfiles.map((child) => `${child.id}:${child.avatarId ?? ''}`).join('|'),
    [childProfiles],
  );

  const avatarQuery = useQuery({
    queryKey: ['parent-dashboard', 'avatar-map', avatarQueryKey],
    queryFn: async () => getChildAvatarMap(childProfiles),
    enabled: childProfiles.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const activeChild = useMemo(() => {
    const selectedChild = childProfiles.find((child) => child.id === effectiveSelectedChildId);

    return selectedChild ?? childProfile ?? childProfiles[0] ?? null;
  }, [childProfile, childProfiles, effectiveSelectedChildId]);

  const selectDashboardChild = useCallback(
    (childId: string) => {
      selectAuthChild(childId);
      router.setParams({ childId });
    },
    [router, selectAuthChild],
  );

  function getChildAvatarSource(child: ChildProfile): ImageSourcePropType {
    const remoteUri = avatarQuery.data?.[child.id];
    if (remoteUri) {
      return { uri: remoteUri };
    }

    return getAvatarById(child.avatarId).asset;
  }

  return {
    children: childProfiles,
    activeChild,
    selectedChildId: activeChild?.id ?? selectedChildId,
    selectChild: selectDashboardChild,
    getChildAvatarSource,
    avatarMapLoading: avatarQuery.isPending,
  };
}
