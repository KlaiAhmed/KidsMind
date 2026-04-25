import { useAuth } from '@/contexts/AuthContext';
import { getChildProfile } from '@/services/childService';
import { getAvatarCatalog } from '@/services/childService';
import type { AvatarOption } from '@/types/child';

const FALLBACK_AVATARS: AvatarOption[] = [
  { id: 'fallback-0', label: 'Brainy Buddy', asset: require('../assets/images/icon.png') },
];

export function useChildProfile() {
  const {
    childProfiles,
    selectedChildId,
    childProfile,
    childProfileStatus,
    avatars,
    childDataLoading,
    childDataError,
    selectChild,
    saveChildProfile,
    deleteChildProfile,
    updateChildProfile,
    refreshChildData,
  } = useAuth();

  const hasCompletedProfile = childProfileStatus === 'exists';

  function getAvatarById(avatarId: string | null | undefined): AvatarOption {
    const normalizedAvatarId = avatarId?.trim();
    return avatars.find((avatar) => avatar.id === normalizedAvatarId) ?? avatars[0] ?? FALLBACK_AVATARS[0];
  }

  const defaultAvatarId = avatars[0]?.id ?? FALLBACK_AVATARS[0].id;

  async function refreshProfileFromApi(): Promise<void> {
    if (!childProfile?.id) {
      return;
    }

    try {
      const serverProfile = await getChildProfile(childProfile.id);
      const { id: _id, ...updates } = serverProfile;
      updateChildProfile(updates);
    } catch {
      await refreshChildData();
    }
  }

  async function refreshAvatarCatalog(): Promise<AvatarOption[]> {
    try {
      const result = await getAvatarCatalog(childProfile?.id ?? undefined);
      return result.avatars;
    } catch {
      return avatars;
    }
  }

  return {
    profile: childProfile,
    profiles: childProfiles,
    selectedChildId,
    avatars,
    defaultAvatarId,
    hasCompletedProfile,
    isLoading: childDataLoading,
    error: childDataError,
    getAvatarById,
    selectProfile: selectChild,
    refreshProfileFromApi,
    refreshAvatarCatalog,
    updateProfile: updateChildProfile,
    refreshChildData,
    saveChildProfile,
    deleteChildProfile,
  };
}
