import { useState, useCallback, useRef } from 'react';
import type { FormErrors, UseFormReturn } from '../types';

/**
 * useForm — Generic form state management hook.
 *
 * Manages field values, validation errors, touched state,
 * dirty tracking, and async form submission with loading state.
 *
 * @param initialValues - Default values for all form fields
 * @param validate - Function that receives current values and returns
 *                   a FormErrors object (empty object = no errors)
 * @returns UseFormReturn<T> — values, errors, handlers, flags
 *
 * @example
 * const { values, errors, handleChange, handleSubmit } = useForm(
 *   { email: '', password: '' },
 *   (vals) => validateLoginForm(vals)
 * );
 */
export function useForm<T extends object>(
  initialValues: T,
  validate: (values: T) => FormErrors
): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialValuesRef = useRef(initialValues);

  /** Whether any field value differs from the initial value */
  const isDirty = (Object.keys(values) as Array<keyof T>).some(
    (key) => values[key] !== initialValuesRef.current[key]
  );

  /** Whether no validation errors exist for the current values */
  const isValid = Object.keys(validate(values)).length === 0;

  /**
   * handleChange — updates a single field value and runs validation.
   *
   * Only shows errors for fields that have already been touched,
   * keeping the UX friendly during initial form filling.
   */
  const handleChange = useCallback(
    (field: keyof T, value: unknown) => {
      setValues((prev) => {
        const next = { ...prev, [field]: value } as T;
        const validationResult = validate(next);
        const visibleErrors: FormErrors = {};
        for (const key of Object.keys(validationResult)) {
          if (touched[key] || key === String(field)) {
            visibleErrors[key] = validationResult[key];
          }
        }
        setErrors(visibleErrors);
        return next;
      });
    },
    [validate, touched]
  );

  /**
   * handleBlur — marks a field as touched so its errors become visible.
   */
  const handleBlur = useCallback(
    (field: keyof T) => {
      setTouched((prev) => ({ ...prev, [String(field)]: true }));
      setValues((prev) => {
        const validationResult = validate(prev);
        const visibleErrors: FormErrors = {};
        const nextTouched = { ...touched, [String(field)]: true };
        for (const key of Object.keys(validationResult)) {
          if (nextTouched[key]) {
            visibleErrors[key] = validationResult[key];
          }
        }
        setErrors(visibleErrors);
        return prev;
      });
    },
    [validate, touched]
  );

  /**
   * handleSubmit — triggers full form validation and calls onSubmit if valid.
   *
   * Marks all fields as touched so all errors become visible,
   * then runs the async onSubmit callback if validation passes.
   */
  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => Promise<void>) => {
      const allTouched: Record<string, boolean> = {};
      for (const key of Object.keys(values) as string[]) {
        allTouched[key] = true;
      }
      setTouched(allTouched);

      const validationResult = validate(values);
      setErrors(validationResult);

      if (Object.keys(validationResult).length > 0) {
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch {
        // Errors are handled by the caller
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate]
  );

  /**
   * reset — restores all fields to initial values and clears all state.
   */
  const reset = useCallback(() => {
    setValues(initialValuesRef.current);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, []);

  return {
    values,
    errors,
    isDirty,
    isValid,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  };
}
