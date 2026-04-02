import { useNavigate } from 'react-router-dom';
import { useChildProgress } from '../../../hooks/api/useChildProgress';
import { useLanguage } from '../../../hooks/useLanguage';

export interface SubjectsGridProps {
  childId: number | null;
}

const getBorderClassName = (masteryPct: number | null): string => {
  if (masteryPct === null) {
    return 'pp-border-gray';
  }

  if (masteryPct >= 80) {
    return 'pp-border-sage';
  }

  if (masteryPct >= 50) {
    return 'pp-border-amber';
  }

  return 'pp-border-red';
};

const SubjectsGrid = ({ childId }: SubjectsGridProps) => {
  const { translations } = useLanguage();
  const navigate = useNavigate();
  const progress = useChildProgress(childId);

  if (progress.isLoading) {
    return (
      <section className="pp-card pp-col-span-1" aria-label={translations.subjects_loading}>
        <h3 className="pp-title">{translations.subjects_title}</h3>
        <div className="pp-skeleton" style={{ height: 180, marginTop: '0.75rem' }} />
      </section>
    );
  }

  if (progress.error) {
    return (
      <section className="pp-card pp-col-span-1" role="alert">
        <h3 className="pp-title">{translations.subjects_title}</h3>
        <p className="pp-error">{progress.error.message}</p>
        <button
          type="button"
          className="pp-button pp-touch pp-focusable"
          aria-label={translations.subjects_retry}
          onClick={() => {
            void progress.refetch();
          }}
        >
          {translations.subjects_retry}
        </button>
      </section>
    );
  }

  const subjects = progress.data?.subjects.slice(0, 6) ?? [];
  if (subjects.length === 0) {
    return (
      <section className="pp-card pp-col-span-1">
        <h3 className="pp-title">{translations.subjects_title}</h3>
        <p className="pp-empty">{translations.subjects_empty}</p>
      </section>
    );
  }

  return (
    <section className="pp-card pp-col-span-1" aria-labelledby="subjects-grid-title">
      <h3 id="subjects-grid-title" className="pp-title">{translations.subjects_title}</h3>
      <div className="pp-subject-grid" style={{ marginTop: '0.7rem' }}>
        {subjects.map((subject) => (
          <button
            key={subject.subject}
            type="button"
            className={`pp-subject-chip pp-touch pp-focusable ${getBorderClassName(subject.mastery_pct)}`}
            aria-label={`Open ${subject.subject} insights`}
            onClick={() => {
              navigate(`/parent/insights?subject=${encodeURIComponent(subject.subject)}`);
            }}
          >
            <p style={{ fontWeight: 700 }}>{subject.emoji} {subject.subject}</p>
            <p style={{ color: 'var(--text-secondary)' }}>{subject.mastery_pct ?? '—'}%</p>
          </button>
        ))}
      </div>
    </section>
  );
};

export default SubjectsGrid;
