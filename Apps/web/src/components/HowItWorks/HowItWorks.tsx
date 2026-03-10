import React from 'react';
import type { TranslationMap } from '../../types';
import { STEPS } from '../../utils/constants';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import styles from './HowItWorks.module.css';

interface HowItWorksProps {
  t: TranslationMap;
}

export default function HowItWorks({ t }: HowItWorksProps) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      className={styles.section}
      aria-labelledby="how-title"
    >
      <div className={styles.sectionInner}>
        <h2 id="how-title" className={styles.sectionTitle}>
          {t.how_title}
        </h2>
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`${styles.stepsContainer} ${styles.reveal} ${isVisible ? styles.visible : ''}`}
        >
          <div className={styles.connector} aria-hidden="true" />
          {STEPS.map((step) => (
            <div key={step.number} className={`${styles.step} ${styles.revealChild}`}>
              <div className={styles.stepNumber}>{step.number}</div>
              <div className={styles.stepEmoji}>
                <span aria-hidden="true">{step.emoji}</span>
              </div>
              <h3 className={styles.stepTitle}>{t[step.titleKey]}</h3>
              <p className={styles.stepDesc}>{t[step.descKey]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
