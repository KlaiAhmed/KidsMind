import type { ProgressBarProps } from '../../../types';
import styles from './ProgressBar.module.css';

/**
 * ProgressBar — Animated horizontal progress bar.
 *
 * Fills from left to right based on percent prop.
 * Uses CSS transition for smooth width changes.
 * Includes ARIA attributes for accessibility.
 */
export default function ProgressBar({
  percent,
  label,
}: ProgressBarProps) {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <div className={styles.progressBar}>
      {label && <span className={styles.label}>{label}</span>}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={clampedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `Progress: ${clampedPercent}%`}
      >
        <div
          className={styles.fill}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
}
