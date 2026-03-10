import React from 'react';
import type { TranslationMap } from '../../types';
import { AGE_GROUPS } from '../../utils/constants';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import styles from './AgeGroupSelector.module.css';

interface AgeGroupSelectorProps {
  t: TranslationMap;
}

export default function AgeGroupSelector({ t }: AgeGroupSelectorProps) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      className={styles.section}
      aria-labelledby="age-section-title"
    >
      <div className={styles.sectionInner}>
        <h2 id="age-section-title" className={styles.sectionTitle}>
          {t.age_section_title}
        </h2>
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`${styles.grid} ${styles.reveal} ${isVisible ? styles.visible : ''}`}
        >
          {AGE_GROUPS.map((group) => (
            <div
              key={group.id}
              className={`${styles.card} ${styles.revealChild}`}
              style={{ background: `radial-gradient(circle at 50% 0%, ${group.bgColor}, var(--bg-surface))` }}
            >
              <div className={styles.cardEmoji}>
                <span aria-hidden="true">{group.emoji}</span>
              </div>
              <h3 className={styles.cardTitle}>{t[group.titleKey]}</h3>
              <span
                className={styles.cardBadge}
                style={{
                  background: group.bgColor,
                  color: 'var(--text-primary)',
                }}
              >
                {t[group.rangeKey]}
              </span>
              <p className={styles.cardDesc}>{t[group.descKey]}</p>
              <button className={styles.cardButton}>
                {t.hero_cta_primary} →
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
