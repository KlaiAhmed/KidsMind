import type { TranslationMap, LanguageCode } from '../../types';
import HeroIllustration from './HeroIllustration';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  t: TranslationMap;
  lang: LanguageCode;
}

export default function HeroSection({ t }: HeroSectionProps) {
  const titleWords = t.hero_title.split(' ');

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroInner}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span aria-hidden="true">✨</span>
            <span>{t.hero_badge}</span>
          </div>

          <h1 id="hero-title" className={styles.title}>
            {titleWords.map((word, i) => (
              <span
                key={i}
                className={styles.titleWord}
                style={{ animationDelay: `${80 + i * 80}ms` }}
              >
                {word}{' '}
              </span>
            ))}
          </h1>

          <p className={styles.subtitle}>{t.hero_subtitle}</p>

          <div className={styles.ctaRow}>
            <button className={styles.ctaPrimary}>{t.hero_cta_primary}</button>
            <button className={styles.ctaSecondary}>{t.hero_cta_secondary}</button>
          </div>

          <div className={styles.trustRow}>
            <div className={styles.trustItem}>
              <span className={styles.trustDot} aria-hidden="true" />
              <span>{t.trust_safe}</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustDot} aria-hidden="true" />
              <span>{t.trust_languages}</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustDot} aria-hidden="true" />
              <span>{t.trust_levels}</span>
            </div>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}
