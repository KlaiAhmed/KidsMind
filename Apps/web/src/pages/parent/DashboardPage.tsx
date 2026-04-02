import { Link } from 'react-router-dom';
import TodayStrip from '../../components/parent/dashboard/TodayStrip';
import AiInsightsCard from '../../components/parent/dashboard/AiInsightsCard';
import TimeArcCard from '../../components/parent/dashboard/TimeArcCard';
import WeeklyBarChart from '../../components/parent/dashboard/WeeklyBarChart';
import SubjectsGrid from '../../components/parent/dashboard/SubjectsGrid';
import QuickActions from '../../components/parent/dashboard/QuickActions';
import { useChildren } from '../../hooks/api/useChildren';
import { useChildStore } from '../../store/child.store';
import { useLanguage } from '../../hooks/useLanguage';
import '../../styles/parent-portal.css';

const DashboardPage = () => {
  const { translations } = useLanguage();
  const { activeChild } = useChildStore();
  const childrenQuery = useChildren();

  if (childrenQuery.isLoading && !activeChild) {
    return (
      <main className="pp-content" aria-label={translations.dashboard_loading}>
        <div className="pp-skeleton" style={{ height: 160 }} />
      </main>
    );
  }

  if (childrenQuery.error && !activeChild) {
    return (
      <main className="pp-content">
        <article className="pp-card" role="alert">
          <h1 className="pp-title">{translations.dashboard_page_title}</h1>
          <p className="pp-error">{childrenQuery.error.message}</p>
        </article>
      </main>
    );
  }

  if (!activeChild) {
    return (
      <main className="pp-content">
        <article className="pp-card" aria-labelledby="dashboard-empty-title">
          <h1 id="dashboard-empty-title" className="pp-title">{translations.dashboard_no_child_title}</h1>
          <p className="pp-empty">{translations.dashboard_no_child_description}</p>
          <Link
            to="/parent/children/new"
            className="pp-button pp-button-primary pp-touch pp-focusable"
            aria-label={translations.dashboard_add_child}
          >
            {translations.dashboard_add_child}
          </Link>
        </article>
      </main>
    );
  }

  const dailyLimit =
    activeChild.settings_json?.daily_limit_minutes
    ?? activeChild.settings_json?.dailyLimitMinutes
    ?? 60;

  return (
    <main className="pp-content" aria-labelledby="dashboard-page-title">
      <h1 id="dashboard-page-title" className="srOnly">{translations.dashboard_page_title}</h1>

      <div className="pp-bento">
        <TodayStrip
          childId={activeChild.child_id}
          childName={activeChild.nickname}
          childAvatar={activeChild.avatar}
        />

        <AiInsightsCard
          childId={activeChild.child_id}
          childName={activeChild.nickname}
        />

        <TimeArcCard
          childId={activeChild.child_id}
          dailyLimitMinutes={dailyLimit}
        />

        <WeeklyBarChart
          childId={activeChild.child_id}
          dailyLimitMinutes={dailyLimit}
        />

        <SubjectsGrid childId={activeChild.child_id} />

        <QuickActions childId={activeChild.child_id} />
      </div>
    </main>
  );
};

export default DashboardPage;
