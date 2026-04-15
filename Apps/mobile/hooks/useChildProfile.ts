import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { AvatarOption, ChildProfile, WizardState } from '@/types/child';

const DEFAULT_AVATAR_ID = 'avatar-1';

function toWizardState(profile: ChildProfile | null, avatars: AvatarOption[]): WizardState {
  if (!profile) {
    return {
      step: 1,
      childName: '',
      age: null,
      avatarId: avatars[0]?.id ?? DEFAULT_AVATAR_ID,
      selectedSubjectIds: [],
    };
  }

  return {
    step: 1,
    childName: profile.name,
    age: profile.age,
    avatarId: profile.avatarId,
    selectedSubjectIds: profile.subjectIds,
  };
}

export function useChildProfile() {
  const {
    childProfile,
    avatars,
    saveChildProfile,
    updateChildProfile,
  } = useAuth();

  const hasCompletedProfile = Boolean(childProfile);

  const initialWizardState = useMemo(() => toWizardState(childProfile, avatars), [childProfile, avatars]);

  function getAvatarById(avatarId: string): AvatarOption {
    return avatars.find((avatar) => avatar.id === avatarId) ?? avatars[0];
  }

  function saveWizardState(wizardState: WizardState): void {
    saveChildProfile({
      id: childProfile?.id,
      name: wizardState.childName.trim(),
      age: wizardState.age ?? 7,
      avatarId: wizardState.avatarId,
      subjectIds: wizardState.selectedSubjectIds,
      streakDays: childProfile?.streakDays ?? 3,
      dailyGoalMinutes: childProfile?.dailyGoalMinutes ?? 25,
      dailyCompletedMinutes: childProfile?.dailyCompletedMinutes ?? 12,
    });
  }

  return {
    profile: childProfile,
    avatars,
    hasCompletedProfile,
    initialWizardState,
    getAvatarById,
    saveWizardState,
    updateProfile: updateChildProfile,
  };
}
