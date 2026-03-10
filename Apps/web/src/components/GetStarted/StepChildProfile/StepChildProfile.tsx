import { ArrowRight } from 'lucide-react';
import type {
  TranslationMap,
  LanguageCode,
  ChildProfileFormData,
  AgeGroupId,
  GradeLevel,
} from '../../../types';
import { useForm } from '../../../hooks/useForm';
import { validateChildProfileStep } from '../../../utils/validators';
import FormField from '../../shared/FormField/FormField';
import AvatarPicker from '../../shared/AvatarPicker/AvatarPicker';
import styles from './StepChildProfile.module.css';

interface StepChildProfileProps {
  t: TranslationMap;
  lang: LanguageCode;
  onComplete: (data: ChildProfileFormData) => void;
}

interface AgeGroupOption {
  id: AgeGroupId;
  emoji: string;
  title: string;
  range: string;
}

const AGE_GROUPS: AgeGroupOption[] = [
  { id: '3-6', emoji: '\u{1F9D2}', title: 'Little Explorers', range: '3-6' },
  { id: '7-11', emoji: '\u{1F9D1}\u200D\u{1F393}', title: 'Curious Adventurers', range: '7-11' },
  { id: '12-15', emoji: '\u{1F680}', title: 'Bold Innovators', range: '12-15' },
];

const GRADE_OPTIONS: Record<AgeGroupId, { value: GradeLevel; label: string }[]> = {
  '3-6': [
    { value: 'preschool', label: 'Preschool' },
    { value: 'kindergarten', label: 'Kindergarten' },
  ],
  '7-11': [
    { value: 'grade1', label: 'Grade 1' },
    { value: 'grade2', label: 'Grade 2' },
    { value: 'grade3', label: 'Grade 3' },
    { value: 'grade4', label: 'Grade 4' },
    { value: 'grade5', label: 'Grade 5' },
    { value: 'grade6', label: 'Grade 6' },
  ],
  '12-15': [
    { value: 'grade7', label: 'Grade 7' },
    { value: 'grade8', label: 'Grade 8' },
    { value: 'grade9', label: 'Grade 9' },
    { value: 'grade10', label: 'Grade 10' },
  ],
};

const LANGUAGE_OPTIONS: { value: LanguageCode; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Fran\u00E7ais' },
  { value: 'es', label: 'Espa\u00F1ol' },
  { value: 'it', label: 'Italiano' },
  { value: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
  { value: 'zh', label: '\u4E2D\u6587' },
];

/**
 * StepChildProfile -- Step 2 of the onboarding flow.
 *
 * Collects the child's nickname, age group (via selection cards),
 * grade level (filtered by age group), avatar emoji, and preferred language.
 */
export default function StepChildProfile({
  t,
  lang,
  onComplete,
}: StepChildProfileProps) {
  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useForm<ChildProfileFormData>(
    {
      nickname: '',
      ageGroup: '' as AgeGroupId,
      gradeLevel: '' as GradeLevel,
      avatarEmoji: '\u{1F981}',
      preferredLanguage: lang,
    },
    validateChildProfileStep
  );

  function resolveError(field: string): string | undefined {
    const errorKey = errors[field];
    if (!errorKey) return undefined;
    return t[errorKey as keyof TranslationMap] ?? errorKey;
  }

  function handleAgeGroupSelect(id: AgeGroupId): void {
    handleChange('ageGroup', id);
    // Reset grade level when age group changes since options differ
    handleChange('gradeLevel', '');
  }

  async function onSubmit(data: ChildProfileFormData): Promise<void> {
    onComplete(data);
  }

  const availableGrades = values.ageGroup ? GRADE_OPTIONS[values.ageGroup] : [];
  const showNicknamePreview = values.nickname.trim().length >= 2;

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>{t.gs_step2_title}</h2>
        <p className={styles.stepSubtitle}>{t.gs_step2_subtitle}</p>
      </div>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(onSubmit);
        }}
        noValidate
      >
        <FormField
          id="child-nickname"
          label={t.gs_nickname_label}
          type="text"
          value={values.nickname}
          error={resolveError('nickname')}
          placeholder={t.gs_nickname_placeholder}
          hint={t.gs_nickname_hint}
          required
          autoComplete="off"
          onChange={(val) => handleChange('nickname', val)}
          onBlur={() => handleBlur('nickname')}
        />

        {showNicknamePreview && (
          <div className={styles.nicknamePreview} aria-live="polite">
            <span aria-hidden="true">{values.avatarEmoji}</span>
            <span>Hi {values.nickname.trim()}!</span>
          </div>
        )}

        <hr className={styles.divider} />

        {/* Age Group Selection Cards */}
        <div>
          <span className={styles.ageGroupLabel} id="age-group-label">
            {t.gs_age_group_label}
          </span>
          <div
            className={styles.ageGroupGrid}
            role="radiogroup"
            aria-labelledby="age-group-label"
          >
            {AGE_GROUPS.map((group) => {
              const isSelected = values.ageGroup === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${group.title} (ages ${group.range})`}
                  className={`${styles.ageGroupCard} ${isSelected ? styles.ageGroupCardSelected : ''}`}
                  onClick={() => handleAgeGroupSelect(group.id)}
                >
                  <span className={styles.ageGroupEmoji} aria-hidden="true">
                    {group.emoji}
                  </span>
                  <span className={styles.ageGroupTitle}>{group.title}</span>
                  <span className={styles.ageGroupRange}>{group.range}</span>
                </button>
              );
            })}
          </div>
          {resolveError('ageGroup') && (
            <p className={styles.errorText} role="alert">
              {resolveError('ageGroup')}
            </p>
          )}
        </div>

        {/* Grade Level - shown only when an age group is selected */}
        {values.ageGroup && (
          <FormField
            id="child-grade-level"
            label={t.gs_grade_level_label}
            type="select"
            value={values.gradeLevel}
            error={resolveError('gradeLevel')}
            placeholder="Select grade level"
            required
            onChange={(val) => handleChange('gradeLevel', val)}
            onBlur={() => handleBlur('gradeLevel')}
          >
            {availableGrades.map((grade) => (
              <option key={grade.value} value={grade.value}>
                {grade.label}
              </option>
            ))}
          </FormField>
        )}

        <hr className={styles.divider} />

        {/* Avatar Picker */}
        <AvatarPicker
          selectedEmoji={values.avatarEmoji}
          onSelect={(emoji) => handleChange('avatarEmoji', emoji)}
          label={t.gs_avatar_label}
        />

        <hr className={styles.divider} />

        {/* Preferred Language */}
        <FormField
          id="child-language"
          label={t.gs_child_language_label}
          type="select"
          value={values.preferredLanguage}
          required
          onChange={(val) => handleChange('preferredLanguage', val)}
          onBlur={() => handleBlur('preferredLanguage')}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FormField>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {t.gs_next_button}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
