import type { AgeGroup } from '@/types/child';

export type EducationStage = 'KINDERGARTEN' | 'PRIMARY' | 'SECONDARY';

export function toAgeGroup(age: number): AgeGroup {
  if (age <= 6) return '3-6';
  if (age <= 11) return '7-11';
  return '12-15';
}

export function toEducationStage(age: number): EducationStage {
  if (age <= 6) return 'KINDERGARTEN';
  if (age <= 11) return 'PRIMARY';
  return 'SECONDARY';
}

export function getGradeLevel(age: number): string {
  if (age <= 5) return 'Kindergarten';
  if (age <= 6) return 'Grade 1';
  if (age <= 7) return 'Grade 2';
  if (age <= 8) return 'Grade 3';
  if (age <= 9) return 'Grade 4';
  if (age <= 10) return 'Grade 5';
  if (age <= 11) return 'Grade 6';
  if (age <= 12) return 'Grade 7';
  if (age <= 13) return 'Grade 8';
  if (age <= 14) return 'Grade 9';
  return 'Grade 10';
}
