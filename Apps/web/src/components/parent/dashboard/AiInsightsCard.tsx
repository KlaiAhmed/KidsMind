import { useNavigate } from 'react-router-dom';
import { useChildInsights } from '../../../hooks/api/useChildInsights';
import { useLanguage } from '../../../hooks/useLanguage';

const resolveInsightTarget = (ctaUrl?: string, moduleName?: string): string => {
  if (ctaUrl && ctaUrl.trim()) {
    return ctaUrl;
  }

  const moduleParam = moduleName ? encodeURIComponent(moduleName) : 'insight';
  return `/child?prefill=${moduleParam}`;
};

const resolveSeverityClassName = (severity: 'warning' | 'positive' | 'info'): string => {
  if (severity === 'warning') {
    return 'pp-insight-warning';
  }

  if (severity === 'positive') {
    return 'pp-insight-positive';
  }

  return 'pp-insight-info';
};

export interface AiInsightsCardProps {
  childId: number | null;
  childName: string;
}

const AiInsightsCard = ({ childId, childName }: AiInsightsCardProps) => {
  const { translations } = useLanguage();
  const navigate = useNavigate();
  const insightsQuery = useChildInsights(childId);

  if (insightsQuery.isLoading) {
    return (
      <section className="pp-card pp-col-span-2" aria-label={translations.insights_loading}>
        <h3 className="pp-title">{translations.insights_title}</h3>
        <div className="pp-skeleton" style={{ height: 62, marginTop: '0.6rem' }} />
        <div className="pp-skeleton" style={{ height: 62, marginTop: '0.6rem' }} />
        <div className="pp-skeleton" style={{ height: 62, marginTop: '0.6rem' }} />
      </section>
    );
  }

  if (insightsQuery.error) {
    return (
      <section className="pp-card pp-col-span-2" role="alert">
        <h3 className="pp-title">{translations.insights_title}</h3>
        <p className="pp-error">{insightsQuery.error.message}</p>
        <button
          type="button"
          className="pp-button pp-touch pp-focusable"
          aria-label={translations.insights_retry}
          onClick={() => {
            void insightsQuery.refetch();
          }}
        >
          {translations.insights_retry}
        </button>
      </section>
    );
  }

  const topInsights = insightsQuery.data?.insights.slice(0, 3) ?? [];
  const cacheHeader = insightsQuery.data?.cacheHeader;

  return (
    <section className="pp-card pp-col-span-2" aria-labelledby="ai-insights-title">
      <div className="pp-insight-head">
        <h3 id="ai-insights-title" className="pp-title">{translations.insights_title}</h3>
        {cacheHeader && <span className="pp-cache-badge">{translations.insights_cache_label}: {cacheHeader}</span>}
      </div>

      {topInsights.length === 0 ? (
        <p className="pp-empty">{translations.insights_empty.replace('the next session', `${childName}'s next session`)}</p>
      ) : (
        <div className="pp-insight-list">
          {topInsights.map((insight) => (
            <article key={insight.id} className={`pp-insight-item ${resolveSeverityClassName(insight.severity)}`}>
              <div>
                <p style={{ fontWeight: 700 }}>{insight.title || translations.insights_fallback_title}</p>
                <p style={{ color: 'var(--text-secondary)' }}>{insight.description}</p>
              </div>
              <button
                type="button"
                className="pp-button pp-touch pp-focusable"
                aria-label={`${translations.insights_open} ${insight.title}`}
                onClick={() => {
                  navigate(resolveInsightTarget(insight.cta_url, insight.module));
                }}
              >
                {insight.cta_label ?? translations.insights_open}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default AiInsightsCard;
