import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { PasswordFieldProps, TranslationMap } from '../../../types';
import { getPasswordStrength } from '../../../utils/validators';
import styles from './PasswordField.module.css';

/**
 * PasswordField — Password input with show/hide toggle and optional strength meter.
 *
 * Extends the basic input pattern with an eye icon button to toggle
 * password visibility, and an optional 4-segment strength meter
 * powered by the getPasswordStrength utility.
 */
export default function PasswordField({
  id,
  label,
  value,
  error,
  placeholder,
  showStrengthMeter,
  autoComplete,
  onChange,
  onBlur,
  t,
}: PasswordFieldProps & { t?: TranslationMap }) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const errorId = `${id}-error`;
  const hasError = !!error;

  const passwordStrength = getPasswordStrength(value);

  function getStrengthLabel(): string {
    if (!t) {
      const labels = ['', 'Weak', 'Fair', 'Strong'];
      return labels[passwordStrength];
    }
    if (passwordStrength === 1) return t.gs_password_strength_weak;
    if (passwordStrength === 2) return t.gs_password_strength_fair;
    if (passwordStrength === 3) return t.gs_password_strength_strong;
    return '';
  }

  function getStrengthColorClass(): string {
    if (passwordStrength === 1) return styles.strengthWeak;
    if (passwordStrength === 2) return styles.strengthFair;
    if (passwordStrength === 3) return styles.strengthStrong;
    return '';
  }

  function getStrengthLabelClass(): string {
    if (passwordStrength === 1) return styles.strengthLabelWeak;
    if (passwordStrength === 2) return styles.strengthLabelFair;
    if (passwordStrength === 3) return styles.strengthLabelStrong;
    return '';
  }

  return (
    <div className={styles.formGroup}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.inputWrapper}>
        <input
          id={id}
          type={isPasswordVisible ? 'text' : 'password'}
          className={`${styles.input} ${hasError ? styles.inputError : ''}`}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
        />
        <button
          type="button"
          className={styles.toggleButton}
          onClick={() => setIsPasswordVisible((prev) => !prev)}
          aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {showStrengthMeter && value.length > 0 && (
        <div className={styles.strengthMeter}>
          <div className={styles.strengthBar}>
            {[1, 2, 3, 4].map((segment) => (
              <div
                key={segment}
                className={`${styles.strengthSegment} ${
                  segment <= passwordStrength ? getStrengthColorClass() : ''
                }`}
              />
            ))}
          </div>
          {passwordStrength > 0 && (
            <span className={`${styles.strengthLabel} ${getStrengthLabelClass()}`}>
              {getStrengthLabel()}
            </span>
          )}
        </div>
      )}

      {hasError && (
        <span id={errorId} className={styles.errorMessage} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
