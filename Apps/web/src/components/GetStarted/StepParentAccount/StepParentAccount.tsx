import { ArrowRight } from 'lucide-react';
import type { TranslationMap, LanguageCode, ParentAccountFormData } from '../../../types';
import { useForm } from '../../../hooks/useForm';
import { validateParentAccountStep } from '../../../utils/validators';
import FormField from '../../shared/FormField/FormField';
import PasswordField from '../../shared/PasswordField/PasswordField';
import styles from './StepParentAccount.module.css';

interface StepParentAccountProps {
  t: TranslationMap;
  lang: LanguageCode;
  onComplete: (data: ParentAccountFormData) => void;
}

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'AU', label: 'Australia' },
  { value: 'IN', label: 'India' },
  { value: 'JP', label: 'Japan' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'MA', label: 'Morocco' },
  { value: 'DZ', label: 'Algeria' },
] as const;

/**
 * StepParentAccount -- Step 1 of the onboarding flow.
 *
 * Collects the parent's email, password (with strength meter),
 * password confirmation, country, language, and terms agreement.
 */
export default function StepParentAccount({
  t,
  lang,
  onComplete,
}: StepParentAccountProps) {
  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useForm<ParentAccountFormData>(
    {
      email: '',
      password: '',
      confirmPassword: '',
      country: '',
      language: lang,
      agreedToTerms: false,
    },
    validateParentAccountStep
  );

  function resolveError(field: string): string | undefined {
    const errorKey = errors[field];
    if (!errorKey) return undefined;
    return t[errorKey as keyof TranslationMap] ?? errorKey;
  }

  async function onSubmit(data: ParentAccountFormData): Promise<void> {
    onComplete(data);
  }

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>{t.gs_step1_title}</h2>
        <p className={styles.stepSubtitle}>{t.gs_step1_subtitle}</p>
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
          id="parent-email"
          label={t.gs_email_label}
          type="email"
          value={values.email}
          error={resolveError('email')}
          placeholder={t.gs_email_placeholder}
          required
          autoComplete="email"
          onChange={(val) => handleChange('email', val)}
          onBlur={() => handleBlur('email')}
        />

        <PasswordField
          id="parent-password"
          label={t.gs_password_label}
          value={values.password}
          error={resolveError('password')}
          placeholder={t.gs_password_placeholder}
          showStrengthMeter
          autoComplete="new-password"
          onChange={(val) => handleChange('password', val)}
          onBlur={() => handleBlur('password')}
          t={t}
        />

        <PasswordField
          id="parent-confirm-password"
          label={t.gs_confirm_password_label}
          value={values.confirmPassword}
          error={resolveError('confirmPassword')}
          placeholder={t.gs_confirm_password_placeholder}
          autoComplete="new-password"
          onChange={(val) => handleChange('confirmPassword', val)}
          onBlur={() => handleBlur('confirmPassword')}
          t={t}
        />

        <FormField
          id="parent-country"
          label={t.gs_country_label}
          type="select"
          value={values.country}
          error={resolveError('country')}
          placeholder={t.gs_country_placeholder}
          required
          onChange={(val) => handleChange('country', val)}
          onBlur={() => handleBlur('country')}
        >
          {COUNTRIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </FormField>

        <FormField
          id="parent-terms"
          label={t.gs_terms_checkbox}
          type="checkbox"
          value={values.agreedToTerms ? 'true' : 'false'}
          error={resolveError('agreedToTerms')}
          required
          onChange={(val) => handleChange('agreedToTerms', val === 'true')}
        />

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className={styles.spinner} aria-hidden="true" />
          ) : null}
          {t.gs_next_button}
          {!isSubmitting ? <ArrowRight size={18} aria-hidden="true" /> : null}
        </button>
      </form>
    </div>
  );
}
