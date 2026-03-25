/** Hook that wraps setInterval with React lifecycle management. Accepts null delay to pause. */

import { useEffect, useRef } from 'react';

/**
 * useInterval — Declarative setInterval for React.
 *
 * Keeps the callback ref up to date so the latest closure is always invoked.
 * Pass `null` as the delay to pause the interval.
 *
 * @param callback - Function to call on each interval tick
 * @param delay - Interval duration in ms, or null to pause
 */
const useInterval = (callback: () => void, delay: number | null): void => {
  const latestCallback = useRef<() => void>(callback);

  useEffect(() => {
    latestCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const intervalId = setInterval(() => {
      latestCallback.current();
    }, delay);

    return () => clearInterval(intervalId);
  }, [delay]);
};

export { useInterval };
