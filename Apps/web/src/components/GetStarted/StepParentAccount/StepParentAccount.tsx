/** StepParentAccount — Onboarding step 1: collects parent email, password, country, and terms agreement. */
import { ArrowRight } from 'lucide-react';
import type { TranslationMap, LanguageCode, ParentAccountFormData } from '../../../types';
import { useForm } from '../../../hooks/useForm';
import { validateParentAccountStep } from '../../../utils/validators';
import FormField from '../../shared/FormField/FormField';
import PasswordField from '../../shared/PasswordField/PasswordField';
import styles from './StepParentAccount.module.css';

interface StepParentAccountProps {
  translations: TranslationMap;
  language: LanguageCode;
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
const StepParentAccount = ({
  translations,
  language,
  onComplete,
}: StepParentAccountProps) => {
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
      language,
      agreedToTerms: false,
    },
    validateParentAccountStep
  );

  const resolveError = (field: string): string | undefined => {
    const errorKey = errors[field];
    if (!errorKey) return undefined;
    return translations[errorKey as keyof TranslationMap] ?? errorKey;
  };

  const onSubmit = async (data: ParentAccountFormData): Promise<void> => {
    onComplete(data);
  };

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>{translations.gs_step1_title}</h2>
        <p className={styles.stepSubtitle}>{translations.gs_step1_subtitle}</p>
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(onSubmit);
        }}
        noValidate
      >
        <FormField
          id="parent-email"
          label={translations.gs_email_label}
          type="email"
          value={values.email}
          error={resolveError('email')}
          placeholder={translations.gs_email_placeholder}
          required
          autoComplete="email"
          onChange={(value) => handleChange('email', value)}
          onBlur={() => handleBlur('email')}
        />

        <PasswordField
          id="parent-password"
          label={translations.gs_password_label}
          value={values.password}
          error={resolveError('password')}
          placeholder={translations.gs_password_placeholder}
          showStrengthMeter
          autoComplete="new-password"
          onChange={(value) => handleChange('password', value)}
          onBlur={() => handleBlur('password')}
          translations={translations}
        />

        <PasswordField
          id="parent-confirm-password"
          label={translations.gs_confirm_password_label}
          value={values.confirmPassword}
          error={resolveError('confirmPassword')}
          placeholder={translations.gs_confirm_password_placeholder}
          autoComplete="new-password"
          onChange={(value) => handleChange('confirmPassword', value)}
          onBlur={() => handleBlur('confirmPassword')}
          translations={translations}
        />

        <FormField
          id="parent-country"
          label={translations.gs_country_label}
          type="select"
          value={values.country}
          error={resolveError('country')}
          placeholder={translations.gs_country_placeholder}
          required
          onChange={(value) => handleChange('country', value)}
          onBlur={() => handleBlur('country')}
        >
          {COUNTRIES.map((country) => (
            <option key={country.value} value={country.value}>
              {country.label}
            </option>
          ))}
        </FormField>

        <FormField
          id="parent-terms"
          label={translations.gs_terms_checkbox}
          type="checkbox"
          value={values.agreedToTerms ? 'true' : 'false'}
          error={resolveError('agreedToTerms')}
          required
          onChange={(value) => handleChange('agreedToTerms', value === 'true')}
        />

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className={styles.spinner} aria-hidden="true" />
          ) : null}
          {translations.gs_next_button}
          {!isSubmitting ? <ArrowRight size={18} aria-hidden="true" /> : null}
        </button>
      </form>
    </div>
  );
};

export default StepParentAccount;
