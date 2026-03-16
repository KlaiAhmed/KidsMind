/** Hook that tracks scroll position and direction for navbar visibility control. */

import { useState, useEffect, useRef } from 'react';

const SCROLL_THRESHOLD_FOR_BACKGROUND = 20;
const SCROLL_THRESHOLD_FOR_HIDING = 80;
const MIN_SCROLL_DELTA_TO_TOGGLE = 5;

/**
 * useScrollPosition — tracks scroll position, direction, and nav visibility.
 *
 * - Visible on page load
 * - Scrolling down past SCROLL_THRESHOLD_FOR_HIDING → hides navbar
 * - Scrolling up → shows navbar again
 * - Near top of page → always visible + transparent background
 *
 * Uses refs for mutable state inside the scroll handler to avoid
 * stale closures and unnecessary listener re-attachments.
 *
 * Strict Mode safe: cleanup resets all refs so the second mount starts clean.
 */
const useScrollPosition = (): {
  scrollY: number;
  isAtPageTop: boolean;
  isHiddenByScroll: boolean;
} => {
  const [scrollY, setScrollY] = useState(0);
  const [isAtPageTop, setIsAtPageTop] = useState(true);
  const [isHiddenByScroll, setIsHiddenByScroll] = useState(false);

  const lastScrollYRef = useRef(0);
  const isHiddenRef = useRef(false);
  const rafIdRef = useRef(0);

  useEffect(() => {
    const initialY = Math.max(window.scrollY, document.documentElement.scrollTop, 0);
    lastScrollYRef.current = initialY;
    isHiddenRef.current = false;

    const onScroll = () => {
      if (rafIdRef.current) return;

      rafIdRef.current = requestAnimationFrame(() => {
        const currentY = Math.max(window.scrollY, document.documentElement.scrollTop, 0);
        const delta = currentY - lastScrollYRef.current;
        const absDelta = Math.abs(delta);
        const nearTop = currentY <= SCROLL_THRESHOLD_FOR_BACKGROUND;

        let nextHidden = isHiddenRef.current;

        if (currentY <= SCROLL_THRESHOLD_FOR_HIDING) {
          nextHidden = false;
        } else if (absDelta >= MIN_SCROLL_DELTA_TO_TOGGLE) {
          nextHidden = delta > 0;
        }

        setScrollY(currentY);
        setIsAtPageTop(nearTop);

        if (nextHidden !== isHiddenRef.current) {
          isHiddenRef.current = nextHidden;
          setIsHiddenByScroll(nextHidden);
        }

        lastScrollYRef.current = currentY;
        rafIdRef.current = 0;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      // Reset refs so Strict Mode remount starts with clean state
      rafIdRef.current = 0;
      lastScrollYRef.current = 0;
      isHiddenRef.current = false;
    };
  }, []);

  return { scrollY, isAtPageTop, isHiddenByScroll };
};

export { useScrollPosition };
