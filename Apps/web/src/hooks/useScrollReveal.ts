import { useRef, useState, useEffect } from 'react';
import type { ScrollRevealOptions } from '../types';

export function useScrollReveal(options?: ScrollRevealOptions): {
  ref: React.RefObject<HTMLElement | null>;
  isVisible: boolean;
} {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const threshold = options?.threshold ?? 0.15;
  const rootMargin = options?.rootMargin ?? '0px 0px -60px 0px';
  const once = options?.once ?? true;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}
