import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { TranslationMap } from '../../types';
import { useForm } from '../../hooks/useForm';
import { validateLoginForm } from '../../utils/validators';
import FormField from '../shared/FormField/FormField';
import PasswordField from '../shared/PasswordField/PasswordField';
import styles from './LoginForm.module.css';

interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginFormProps {
  t: TranslationMap;
  onSuccess: () => void;
}

/**
 * LoginForm -- Full login form with email, password, error banner,
 * forgot-password link, and a bottom sign-up link.
 *
 * Uses `useForm` for state management and `validateLoginForm` for validation.
 * On submit it simulates an API call (always fails for demo purposes).
 */
export default function LoginForm({ t, onSuccess }: LoginFormProps) {
  const [serverError, setServerError] = useState<string>('');

  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useForm<LoginFormValues>(
    { email: '', password: '' },
    validateLoginForm,
  );

  function resolveError(errorKey: string | undefined): string | undefined {
    if (!errorKey) return undefined;
    return t[errorKey as keyof TranslationMap] || errorKey;
  }

  async function onSubmit(): Promise<void> {
    setServerError('');

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1500);
    });

    // Demo: always fail with invalid credentials
    setServerError(t.login_error_invalid);

    // In a real implementation, onSuccess() would be called after a
    // successful API response. Keeping the reference so the prop is used.
    void onSuccess;
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    void handleSubmit(onSubmit);
  }

  return (
    <form className={styles.loginForm} onSubmit={handleFormSubmit} noValidate>
      <h1 className={styles.heading}>{t.login_page_title}</h1>
      <p className={styles.subheading}>{t.login_page_subtitle}</p>

      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span>or continue with email</span>
        <span className={styles.dividerLine} />
      </div>

      {serverError && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={18} className={styles.errorBannerIcon} aria-hidden="true" />
          <span className={styles.errorBannerText}>{serverError}</span>
        </div>
      )}

      <FormField
        id="login-email"
        label={t.login_email_label}
        type="email"
        value={values.email}
        error={resolveError(errors.email)}
        placeholder={t.login_email_placeholder}
        required
        autoComplete="email"
        onChange={(value) => handleChange('email', value)}
        onBlur={() => handleBlur('email')}
      />

      <PasswordField
        id="login-password"
        label={t.login_password_label}
        value={values.password}
        error={resolveError(errors.password)}
        placeholder={t.login_password_placeholder}
        showStrengthMeter={false}
        autoComplete="current-password"
        onChange={(value) => handleChange('password', value)}
        onBlur={() => handleBlur('password')}
      />

      <a href="#" className={styles.forgotLink}>
        {t.login_forgot_password}
      </a>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isSubmitting}
      >
        {isSubmitting && <span className={styles.spinner} aria-hidden="true" />}
        {isSubmitting ? t.login_loading : t.login_submit_button}
      </button>

      <p className={styles.bottomLink}>
        {t.login_no_account}
        <a href="/get-started" className={styles.bottomLinkAnchor}>
          {t.login_start_link}
        </a>
      </p>
    </form>
  );
}
