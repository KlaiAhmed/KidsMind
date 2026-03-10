import React, { useState, useCallback } from 'react';
import type { TranslationMap } from '../../types';
import { TESTIMONIALS } from '../../utils/constants';
import { TIMING } from '../../utils/constants';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useInterval } from '../../hooks/useInterval';
import styles from './TestimonialCarousel.module.css';

interface TestimonialCarouselProps {
  t: TranslationMap;
}

function StarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={styles.starIcon}
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function TestimonialCarousel({ t }: TestimonialCarouselProps) {
  const { ref, isVisible } = useScrollReveal();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const advance = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  }, []);

  useInterval(advance, isHovered ? null : TIMING.carouselInterval);

  return (
    <section
      className={styles.section}
      aria-labelledby="testimonials-title"
    >
      <div
        className={styles.sectionInner}
        ref={ref as React.RefObject<HTMLDivElement>}
      >
        <h2 id="testimonials-title" className={styles.sectionTitle}>
          {t.trust_safe}
        </h2>
        <div
          className={`${styles.reveal} ${isVisible ? styles.visible : ''}`}
          role="region"
          aria-label="Testimonials"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className={styles.carouselWrapper}>
            {TESTIMONIALS.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className={`${styles.card} ${index === activeIndex ? styles.cardActive : ''}`}
                aria-hidden={index !== activeIndex}
              >
                <div
                  className={styles.avatar}
                  style={{ background: testimonial.avatarColor }}
                >
                  {testimonial.initials}
                </div>
                <div className={styles.stars}>
                  {Array.from({ length: testimonial.stars }, (_, i) => (
                    <StarIcon key={i} />
                  ))}
                </div>
                <blockquote className={styles.quote}>
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className={styles.authorName}>{testimonial.name}</div>
                <div className={styles.authorRole}>{testimonial.role}</div>
              </div>
            ))}
          </div>
          <div className={styles.dots}>
            {TESTIMONIALS.map((testimonial, index) => (
              <button
                key={testimonial.id}
                className={`${styles.dot} ${index === activeIndex ? styles.dotActive : ''}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Go to testimonial ${index + 1}`}
                aria-current={index === activeIndex ? true : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
