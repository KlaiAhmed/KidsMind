import { useMemo, useState } from 'react';
import { useChildAnalytics } from '../../../hooks/api/useChildAnalytics';
import { useLanguage } from '../../../hooks/useLanguage';

const SHORT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export interface WeeklyBarDatum {
  dayLabel: string;
  isoDate: string;
  minutes: number;
  sessions: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface WeeklyBarChartProps {
  childId: number | null;
  dailyLimitMinutes: number;
}

const startOfWeekMonday = (referenceDate: Date): Date => {
  const date = new Date(referenceDate);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const WeeklyBarChart = ({ childId, dailyLimitMinutes }: WeeklyBarChartProps) => {
  const { translations } = useLanguage();
  const analytics = useChildAnalytics(childId, '7d');
  const [activeTooltip, setActiveTooltip] = useState<WeeklyBarDatum | null>(null);

  const weekData = useMemo(() => {
    const today = new Date();
    const todayIso = toIsoDate(today);
    const weekStart = startOfWeekMonday(today);

    const analyticsByDate = new Map(
      (analytics.data?.by_day ?? []).map((day) => [day.date.slice(0, 10), day])
    );

    return SHORT_WEEKDAYS.map((weekday, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const isoDate = toIsoDate(date);
      const dayMetrics = analyticsByDate.get(isoDate);

      return {
        dayLabel: weekday,
        isoDate,
        minutes: dayMetrics?.minutes_used ?? 0,
        sessions: dayMetrics?.sessions ?? 0,
        isToday: isoDate === todayIso,
        isFuture: isoDate > todayIso,
      } satisfies WeeklyBarDatum;
    });
  }, [analytics.data]);

  if (analytics.isLoading) {
    return (
      <section className="pp-card pp-col-span-2" aria-label={translations.weekly_loading}>
        <h3 className="pp-title">{translations.weekly_title}</h3>
        <div className="pp-skeleton" style={{ height: 220, marginTop: '0.75rem' }} />
      </section>
    );
  }

  if (analytics.error) {
    return (
      <section className="pp-card pp-col-span-2" role="alert">
        <h3 className="pp-title">{translations.weekly_title}</h3>
        <p className="pp-error">{analytics.error.message}</p>
      </section>
    );
  }

  const maxMinutes = Math.max(
    1,
    dailyLimitMinutes || 0,
    ...weekData.map((day) => day.minutes)
  );

  const hasAnyData = weekData.some((day) => day.minutes > 0 || day.sessions > 0);

  return (
    <section className="pp-card pp-col-span-2" aria-labelledby="weekly-chart-title">
      <h3 id="weekly-chart-title" className="pp-title">{translations.weekly_title}</h3>

      {!hasAnyData ? (
        <p className="pp-empty" style={{ marginTop: '0.65rem' }}>{translations.weekly_empty}</p>
      ) : (
        <div className="pp-chart-wrap" style={{ marginTop: '0.65rem' }}>
          {activeTooltip && (
            <p className="pp-cache-badge" role="status">
              {translations.weekly_tooltip
                .replace('{day}', activeTooltip.dayLabel)
                .replace('{minutes}', String(activeTooltip.minutes))
                .replace('{sessions}', String(activeTooltip.sessions))}
            </p>
          )}

          <div className="pp-bars" role="img" aria-label={translations.weekly_title}>
            {weekData.map((bar) => {
              const height = Math.max(8, Math.round((bar.minutes / maxMinutes) * 150));
              const colorClass = bar.isFuture
                ? 'pp-bar-upcoming'
                : bar.isToday
                ? 'pp-bar-today'
                : 'pp-bar-under';

              return (
                <div
                  key={bar.isoDate}
                  className="pp-bar-col"
                  onMouseEnter={() => {
                    setActiveTooltip(bar);
                  }}
                  onMouseLeave={() => {
                    setActiveTooltip((current) => (current?.isoDate === bar.isoDate ? null : current));
                  }}
                >
                  <button
                    type="button"
                    className={`pp-bar ${colorClass} pp-touch pp-focusable`}
                    style={{ height }}
                    aria-label={`${bar.dayLabel}: ${bar.minutes} minutes, ${bar.sessions} sessions`}
                    onFocus={() => {
                      setActiveTooltip(bar);
                    }}
                    onBlur={() => {
                      setActiveTooltip((current) => (current?.isoDate === bar.isoDate ? null : current));
                    }}
                  />
                  <span>{bar.dayLabel}</span>
                </div>
              );
            })}
          </div>

          <div className="pp-chart-legend" aria-hidden="true">
            <span><span className="pp-legend-dot pp-bar-under" />{translations.weekly_under_limit}</span>
            <span><span className="pp-legend-dot pp-bar-today" />{translations.weekly_today}</span>
            <span><span className="pp-legend-dot pp-bar-upcoming" />{translations.weekly_upcoming}</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default WeeklyBarChart;
