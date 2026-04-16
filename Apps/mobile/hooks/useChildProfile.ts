import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getChildProfile } from '@/services/childService';
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
    childDataLoading,
    childDataError,
    saveChildProfile,
    updateChildProfile,
    refreshChildData,
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
      xp: childProfile?.xp ?? 80,
      level: childProfile?.level ?? 1,
      xpToNextLevel: childProfile?.xpToNextLevel ?? 100,
      gradeLevel: childProfile?.gradeLevel,
      languages: childProfile?.languages,
      settingsJson: childProfile?.settingsJson,
      totalSubjectsExplored: childProfile?.totalSubjectsExplored,
      totalExercisesCompleted: childProfile?.totalExercisesCompleted,
      totalBadgesEarned: childProfile?.totalBadgesEarned,
    });
  }

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

  return {
    profile: childProfile,
    avatars,
    hasCompletedProfile,
    isLoading: childDataLoading,
    error: childDataError,
    initialWizardState,
    getAvatarById,
    saveWizardState,
    refreshProfileFromApi,
    updateProfile: updateChildProfile,
  };
}
