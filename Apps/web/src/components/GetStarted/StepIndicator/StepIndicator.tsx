import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { StepIndicatorProps, TranslationMap } from '../../../types';
import styles from './StepIndicator.module.css';

/**
 * StepIndicator — Visual step tracker for multi-step onboarding flow.
 *
 * Shows numbered steps connected by a progress line.
 * Completed steps show a checkmark. Current step is highlighted.
 * Future steps are muted. On mobile, shows compact "Step X of Y" text.
 */
export default function StepIndicator({
  steps,
  currentIndex,
  t,
}: StepIndicatorProps & { t: TranslationMap }) {
  return (
    <>
      {/* ─── Mobile: Compact step text ───────────────────────────────── */}
      <div className={styles.mobileIndicator}>
        <span className={styles.mobileStep}>
          {currentIndex + 1} / {steps.length}
        </span>
        <span>{t[steps[currentIndex].titleKey]}</span>
      </div>

      {/* ─── Desktop: Full step indicator ────────────────────────────── */}
      <div
        className={styles.stepIndicator}
        aria-label={`Onboarding progress: Step ${currentIndex + 1} of ${steps.length}`}
      >
        {steps.map((step, index) => {
          const isCompleted = step.isComplete;
          const isCurrent = index === currentIndex;

          return (
            <React.Fragment key={step.index}>
              <div className={styles.stepGroup}>
                <div
                  className={`${styles.stepCircle} ${
                    isCompleted ? styles.stepCircleCompleted : ''
                  } ${isCurrent ? styles.stepCircleCurrent : ''}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={`${styles.stepLabel} ${
                    isCompleted ? styles.stepLabelCompleted : ''
                  } ${isCurrent ? styles.stepLabelCurrent : ''}`}
                >
                  {t[step.titleKey]}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`${styles.connector} ${
                    isCompleted ? styles.connectorCompleted : ''
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}
