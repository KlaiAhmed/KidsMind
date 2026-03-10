import React from 'react';
import type { TranslationMap } from '../../types';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import styles from './CTASection.module.css';

interface CTASectionProps {
  t: TranslationMap;
}

export default function CTASection({ t }: CTASectionProps) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      className={styles.section}
      aria-labelledby="cta-title"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className={`${styles.reveal} ${isVisible ? styles.visible : ''}`}>
        <div className={styles.banner}>
          <h2 id="cta-title" className={styles.title}>
            {t.cta_title}
          </h2>
          <p className={styles.subtitle}>{t.cta_subtitle}</p>
          <button className={styles.button}>{t.cta_button}</button>
          <p className={styles.footnote}>{t.cta_footnote}</p>
        </div>
      </div>
    </section>
  );
}
