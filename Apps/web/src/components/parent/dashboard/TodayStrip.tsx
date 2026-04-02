import { useMemo } from 'react';
import { useChildAnalytics } from '../../../hooks/api/useChildAnalytics';
import { useLanguage } from '../../../hooks/useLanguage';

export interface TodayStripProps {
  childId: number | null;
  childName: string;
  childAvatar?: string;
}

const toDisplayDate = (value: string): string => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const TodayStrip = ({ childId, childName, childAvatar }: TodayStripProps) => {
  const { translations } = useLanguage();
  const analytics = useChildAnalytics(childId, '7d');

  const todayMetrics = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const todaySlice = analytics.data?.by_day.find((day) => day.date.slice(0, 10) === todayIso) ?? null;

    const recentSession = analytics.data?.by_day
      .filter((day) => day.sessions > 0)
      .sort((left, right) => right.date.localeCompare(left.date))[0] ?? null;

    return {
      todaySlice,
      recentSession,
    };
  }, [analytics.data]);

  if (analytics.isLoading) {
    return (
      <section className="pp-card pp-col-span-3" aria-label={translations.today_loading}>
        <h2 className="pp-title">{translations.today_title}</h2>
        <div className="pp-skeleton" style={{ height: 76, marginTop: '0.75rem' }} />
      </section>
    );
  }

  if (analytics.error) {
    return (
      <section className="pp-card pp-col-span-3" role="alert" aria-live="assertive">
        <h2 className="pp-title">{translations.today_title}</h2>
        <p className="pp-error">{analytics.error.message} {translations.today_retry}</p>
      </section>
    );
  }

  const today = todayMetrics.todaySlice;
  if (!today) {
    return (
      <section className="pp-card pp-col-span-3">
        <h2 className="pp-title">{translations.today_title}</h2>
        <p className="pp-empty">{translations.today_no_data}</p>
      </section>
    );
  }

  const hasStrongScore = (today.avg_score ?? 0) >= 80;
  const hasSomeActivity = today.sessions > 0 || today.exercises > 0;
  const statusLabel = hasStrongScore
    ? translations.today_status_on_track
    : hasSomeActivity
    ? translations.today_status_attention
    : translations.today_status_idle;
  const statusClassName = hasStrongScore
    ? 'pill-green'
    : hasSomeActivity
    ? 'pill-amber'
    : 'pill-gray';

  return (
    <section className="pp-card pp-col-span-3 pp-today-strip" aria-labelledby="today-strip-title">
      <div>
        <h2 id="today-strip-title" className="pp-title">{translations.today_title}</h2>
        <div className="pp-avatar-row" style={{ marginTop: '0.7rem' }}>
          <div className="pp-avatar-lg" aria-hidden="true">{childAvatar ?? '🧒'}</div>
          <div>
            <p style={{ fontWeight: 700 }}>{childName}</p>
            <p style={{ color: 'var(--text-secondary)' }}>
              {todayMetrics.recentSession
              ? `${todayMetrics.recentSession.subject ?? 'General'} • ${toDisplayDate(todayMetrics.recentSession.date)}`
              : translations.today_no_session}
            </p>
          </div>
        </div>
      </div>

      <div>
        <span className={`pp-pill ${statusClassName}`}>{statusLabel}</span>
        <div className="pp-metrics" style={{ marginTop: '0.65rem' }}>
          <article className="pp-metric">
            <p className="pp-metric-label">{translations.today_minutes}</p>
            <p className="pp-metric-value">{today.minutes_used}</p>
          </article>
          <article className="pp-metric">
            <p className="pp-metric-label">{translations.today_exercises}</p>
            <p className="pp-metric-value">{today.exercises}</p>
          </article>
          <article className="pp-metric">
            <p className="pp-metric-label">{translations.today_avg_score}</p>
            <p className="pp-metric-value">{today.avg_score ?? '—'}</p>
          </article>
          <article className="pp-metric">
            <p className="pp-metric-label">{translations.today_sessions}</p>
            <p className="pp-metric-value">{today.sessions}</p>
          </article>
        </div>
      </div>
    </section>
  );
};

export default TodayStrip;
