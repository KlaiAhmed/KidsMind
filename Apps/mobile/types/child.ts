import type { ImageSourcePropType } from 'react-native';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type TopicFilter = 'all' | 'inProgress' | 'completed' | 'new';

export type TopicDifficulty = 'easy' | 'medium' | 'hard';

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  avatarId: string;
  subjectIds: string[];
  streakDays: number;
  dailyGoalMinutes: number;
  dailyCompletedMinutes: number;
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
