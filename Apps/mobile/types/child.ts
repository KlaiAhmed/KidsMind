import type { ImageSourcePropType } from 'react-native';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type TopicFilter = 'all' | 'inProgress' | 'completed' | 'new';

export type TopicDifficulty = 'easy' | 'medium' | 'hard';

export type AgeGroup = '3-6' | '7-11' | '12-15';

export interface ChildProfile {
  id: string;
  name: string;
  nickname?: string;
  age: number;
  ageGroup: AgeGroup;
  gradeLevel: string;
  languages: string[];
  settingsJson: Record<string, unknown>;
  avatarId: string;
  subjectIds: string[];
  xp: number;
  xpToNextLevel: number;
  level: number;
  streakDays: number;
  dailyGoalMinutes: number;
  dailyCompletedMinutes: number;
  totalSubjectsExplored: number;
  totalExercisesCompleted: number;
  totalBadgesEarned: number;
}

export interface Subject {
  id: string;
  title: string;
  iconAsset: ImageSourcePropType;
  color: string;
  progressPercent: number;
  topicCount: number;
  lastAccessedAt: string;
  description?: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  duration: number;
  isCompleted: boolean;
  thumbnailAsset: ImageSourcePropType;
  description?: string;
  difficulty?: TopicDifficulty;
  completedAt?: string;
}

export interface WizardState {
  step: WizardStep;
  childName: string;
  age: number | null;
  avatarId: string;
  selectedSubjectIds: string[];
}

export interface AvatarOption {
  id: string;
  label: string;
  asset: ImageSourcePropType;
}

export interface RecentActivity {
  id: string;
  topicId: string;
  subjectId: string;
  title: string;
  completedAt: string;
  thumbnailAsset: ImageSourcePropType;
}

export interface BrowserSubjectMatch {
  subject: Subject;
  score: number;
}
