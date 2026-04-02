import { Link } from 'react-router-dom';
import { useChildren } from '../../hooks/api/useChildren';
import { childStore, useChildStore } from '../../store/child.store';

const COPY = {
  heading: 'Children',
  addFirstChild: 'Add your first child',
  loading: 'Loading children...',
  retry: 'Retry',
  emptyDescription: 'No child profiles found yet.',
  errorPrefix: 'Could not load children:',
} as const;

const ChildSelector = () => {
  const { activeChild } = useChildStore();
  const { data, isLoading, error, refetch } = useChildren();

  if (isLoading) {
    return (
      <section className="pp-card" aria-label={COPY.loading}>
        <h3 className="pp-title">{COPY.heading}</h3>
        <div className="pp-skeleton" style={{ height: 42, marginTop: '0.5rem' }} />
        <div className="pp-skeleton" style={{ height: 42, marginTop: '0.5rem' }} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="pp-card" aria-labelledby="child-selector-title">
        <h3 id="child-selector-title" className="pp-title">{COPY.heading}</h3>
        <p className="pp-error" role="alert">{COPY.errorPrefix} {error.message}</p>
        <button
          type="button"
          className="pp-button pp-touch pp-focusable"
          aria-label={COPY.retry}
          onClick={() => {
            void refetch();
          }}
        >
          {COPY.retry}
        </button>
      </section>
    );
  }

  if (!data || data.length === 0) {
    return (
      <section className="pp-card" aria-labelledby="child-selector-title">
        <h3 id="child-selector-title" className="pp-title">{COPY.heading}</h3>
        <p className="pp-empty">{COPY.emptyDescription}</p>
        <Link
          to="/parent/children/new"
          className="pp-button pp-button-primary pp-touch pp-focusable"
          aria-label={COPY.addFirstChild}
        >
          {COPY.addFirstChild}
        </Link>
      </section>
    );
  }

  return (
    <section className="pp-card" aria-labelledby="child-selector-title">
      <h3 id="child-selector-title" className="pp-title">{COPY.heading}</h3>
      <div className="pp-nav-group" role="listbox" aria-label={COPY.heading}>
        {data.map((child) => {
          const isActive = activeChild?.child_id === child.child_id;

          return (
            <button
              key={child.child_id}
              type="button"
              className={`pp-nav-link pp-touch pp-focusable ${isActive ? 'pp-nav-link-active' : ''}`}
              aria-label={`Switch to ${child.nickname}`}
              aria-selected={isActive}
              onClick={() => {
                childStore.setActiveChild(child);
              }}
            >
              <span aria-hidden="true">{child.avatar ?? '🧒'}</span>
              <span>{child.nickname}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default ChildSelector;
