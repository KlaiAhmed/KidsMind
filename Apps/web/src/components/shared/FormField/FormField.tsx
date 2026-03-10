import { CheckCircle2 } from 'lucide-react';
import type { FormFieldProps } from '../../../types';
import styles from './FormField.module.css';

/**
 * FormField — Labeled form input with error display and hint text.
 *
 * Renders an accessible <label> + <input> or <select> pair.
 * Shows error message with shake animation when error prop is provided.
 * Shows hint text below input when hint prop is provided.
 */
export default function FormField({
  id,
  label,
  type = 'text',
  value,
  error,
  placeholder,
  hint,
  required,
  autoComplete,
  onChange,
  onBlur,
  children,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const hasError = !!error;
  const isSuccess = !hasError && !!value && value.length > 0;

  const describedBy = [
    hasError ? errorId : null,
    hint ? hintId : null,
  ].filter(Boolean).join(' ') || undefined;

  if (type === 'checkbox') {
    return (
      <div className={styles.checkboxGroup}>
        <input
          id={id}
          type="checkbox"
          className={styles.checkboxInput}
          checked={value === 'true'}
          onChange={(event) => onChange(event.target.checked ? 'true' : 'false')}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
        />
        <span className={styles.checkboxVisual} onClick={() => onChange(value === 'true' ? 'false' : 'true')}>
          <svg className={styles.checkmark} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <label htmlFor={id} className={styles.checkboxLabel}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
        {hasError && (
          <span id={errorId} className={styles.errorMessage} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className={styles.formGroup}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
        <select
          id={id}
          className={`${styles.select} ${hasError ? styles.selectError : ''}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={hasError}
          aria-describedby={describedBy}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        {hint && (
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        )}
        {hasError && (
          <span id={errorId} className={styles.errorMessage} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={styles.formGroup}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <div className={styles.inputWrapper}>
        <input
          id={id}
          type={type}
          className={`${styles.input} ${hasError ? styles.inputError : ''} ${isSuccess ? styles.inputSuccess : ''}`}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          required={required}
        />
        {isSuccess && (
          <span className={styles.successIcon} aria-hidden="true">
            <CheckCircle2 size={18} />
          </span>
        )}
      </div>
      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
      {hasError && (
        <span id={errorId} className={styles.errorMessage} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
