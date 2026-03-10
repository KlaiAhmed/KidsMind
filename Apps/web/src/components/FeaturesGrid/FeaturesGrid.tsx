import React, { useState, useCallback } from 'react';
import { MessageCircle, Mic, Trophy, BarChart2, Shield, Globe } from 'lucide-react';
import type { TranslationMap } from '../../types';
import { FEATURES } from '../../utils/constants';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import styles from './FeaturesGrid.module.css';

interface FeaturesGridProps {
  t: TranslationMap;
}

const iconMap: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  MessageCircle,
  Mic,
  Trophy,
  BarChart2,
  Shield,
  Globe,
};

export default function FeaturesGrid({ t }: FeaturesGridProps) {
  const { ref, isVisible } = useScrollReveal();
  const [bouncingId, setBouncingId] = useState<string | null>(null);

  const handleMouseEnter = useCallback((id: string) => {
    setBouncingId(id);
  }, []);

  const handleAnimationEnd = useCallback(() => {
    setBouncingId(null);
  }, []);

  return (
    <section
      className={styles.section}
      aria-labelledby="features-title"
    >
      <div className={styles.sectionInner}>
        <h2 id="features-title" className={styles.sectionTitle}>
          {t.features_title}
        </h2>
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`${styles.grid} ${styles.reveal} ${isVisible ? styles.visible : ''}`}
        >
          {FEATURES.map((feature) => {
            const IconComponent = iconMap[feature.iconName];
            return (
              <div
                key={feature.id}
                className={`${styles.tile} ${styles.revealChild}`}
                onMouseEnter={() => handleMouseEnter(feature.id)}
              >
                <div
                  className={`${styles.iconWrap} ${bouncingId === feature.id ? styles.iconBounce : ''}`}
                  style={{
                    background: `color-mix(in srgb, ${feature.accentColor} 15%, transparent)`,
                  }}
                  onAnimationEnd={handleAnimationEnd}
                >
                  {IconComponent && (
                    <IconComponent size={28} strokeWidth={1.5} />
                  )}
                </div>
                <h3 className={styles.tileTitle}>{t[feature.titleKey]}</h3>
                <p className={styles.tileDesc}>{t[feature.descKey]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
