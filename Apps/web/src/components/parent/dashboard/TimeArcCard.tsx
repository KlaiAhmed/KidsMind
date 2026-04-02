import { useEffect, useMemo, useState } from 'react';
import { useChildAnalytics } from '../../../hooks/api/useChildAnalytics';
import { useLanguage } from '../../../hooks/useLanguage';

const ARC_RADIUS = 70;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;

export interface TimeArcCardProps {
  childId: number | null;
  dailyLimitMinutes: number;
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const TimeArcCard = ({ childId, dailyLimitMinutes }: TimeArcCardProps) => {
  const { translations } = useLanguage();
  const analytics = useChildAnalytics(childId, '7d');
  const [displayRatio, setDisplayRatio] = useState(0);

  const todayUsage = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const today = analytics.data?.by_day.find((day) => day.date.slice(0, 10) === todayIso);
    return today?.minutes_used ?? 0;
  }, [analytics.data]);

  const safeLimit = Math.max(15, dailyLimitMinutes || 60);
  const usageRatio = safeLimit > 0 ? todayUsage / safeLimit : 0;
  const clampedRatio = clamp(usageRatio, 0, 1);

  const arcColor = usageRatio >= 1
    ? '#ff6b6b'
    : usageRatio >= 0.8
    ? 'var(--accent-fun)'
    : 'var(--accent-grow)';

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDisplayRatio(clampedRatio);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [clampedRatio]);

  if (analytics.isLoading) {
    return (
      <section className="pp-card pp-col-span-1" aria-label={translations.time_arc_loading}>
        <h3 className="pp-title">{translations.time_arc_title}</h3>
        <div className="pp-skeleton" style={{ height: 190, marginTop: '0.75rem' }} />
      </section>
    );
  }

  if (analytics.error) {
    return (
      <section className="pp-card pp-col-span-1" role="alert">
        <h3 className="pp-title">{translations.time_arc_title}</h3>
        <p className="pp-error">{analytics.error.message}</p>
      </section>
    );
  }

  if (!analytics.data) {
    return (
      <section className="pp-card pp-col-span-1">
        <h3 className="pp-title">{translations.time_arc_title}</h3>
        <p className="pp-empty">{translations.time_arc_no_data}</p>
      </section>
    );
  }

  const strokeOffset = ARC_CIRCUMFERENCE * (1 - displayRatio);
  const remaining = safeLimit - todayUsage;
  const remainingText = remaining >= 0
    ? translations.time_arc_remaining.replace('{minutes}', String(remaining))
    : translations.time_arc_exceeded.replace('{minutes}', String(Math.abs(remaining)));

  return (
    <section className="pp-card pp-col-span-1" aria-labelledby="time-arc-title">
      <h3 id="time-arc-title" className="pp-title">{translations.time_arc_title}</h3>

      <div className="pp-arc-wrap">
        <svg width="180" height="180" viewBox="0 0 180 180" aria-label={`Used ${todayUsage} of ${safeLimit} minutes`}>
          <circle
            cx="90"
            cy="90"
            r={ARC_RADIUS}
            fill="none"
            stroke="var(--bg-surface-alt)"
            strokeWidth="12"
          />
          <circle
            cx="90"
            cy="90"
            r={ARC_RADIUS}
            fill="none"
            stroke={arcColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={ARC_CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            transform="rotate(-90 90 90)"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
          <text x="90" y="88" textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--text-primary)" style={{ fontFamily: 'var(--font-display)' }}>
            {todayUsage}
          </text>
          <text x="90" y="108" textAnchor="middle" fontSize="12" fill="var(--text-secondary)">
            / {safeLimit} min
          </text>
        </svg>

        <p className="pp-arc-label">{remainingText}</p>
      </div>
    </section>
  );
};

export default TimeArcCard;
