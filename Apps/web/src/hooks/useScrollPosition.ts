import { useState, useEffect, useRef, useCallback } from 'react';

export function useScrollPosition(): {
  scrollY: number;
  isScrolled: boolean;
} {
  const [scrollY, setScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const rafId = useRef<number>(0);

  const handleScroll = useCallback(() => {
    if (rafId.current) return;

    rafId.current = requestAnimationFrame(() => {
      const y = window.scrollY;
      setScrollY(y);
      setIsScrolled(y > 20);
      rafId.current = 0;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleScroll]);

  return { scrollY, isScrolled };
}
