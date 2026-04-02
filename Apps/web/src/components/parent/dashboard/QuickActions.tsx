import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExportPdf } from '../../../hooks/api/useExportPdf';
import { useLanguage } from '../../../hooks/useLanguage';

export interface QuickActionsProps {
  childId: number | null;
}

const QuickActions = ({ childId }: QuickActionsProps) => {
  const { translations } = useLanguage();
  const navigate = useNavigate();
  const exportPdf = useExportPdf(childId);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('');
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  return (
    <section className="pp-card pp-col-span-3" aria-labelledby="quick-actions-title">
      <h3 id="quick-actions-title" className="pp-title">{translations.actions_title}</h3>

      <div className="pp-actions-grid" style={{ marginTop: '0.7rem' }}>
        <button
          type="button"
          className="pp-action-button pp-touch pp-focusable"
          aria-label={translations.actions_edit_profile}
          onClick={() => {
            navigate('/parent/children');
          }}
        >
          <strong>{translations.actions_edit_profile}</strong>
          <span style={{ color: 'var(--text-secondary)' }}>{translations.actions_edit_hint}</span>
        </button>

        <button
          type="button"
          className="pp-action-button pp-touch pp-focusable"
          aria-label={translations.actions_adjust_limit}
          onClick={() => {
            navigate('/parent/children?tab=safety');
          }}
        >
          <strong>{translations.actions_adjust_limit}</strong>
          <span style={{ color: 'var(--text-secondary)' }}>{translations.actions_limit_hint}</span>
        </button>

        <button
          type="button"
          className="pp-action-button pp-touch pp-focusable"
          aria-label={translations.actions_conversation_log}
          onClick={() => {
            navigate('/parent/insights?tab=conversation-log');
          }}
        >
          <strong>{translations.actions_conversation_log}</strong>
          <span style={{ color: 'var(--text-secondary)' }}>{translations.actions_log_hint}</span>
        </button>

        <button
          type="button"
          className="pp-action-button pp-touch pp-focusable"
          aria-label={translations.actions_export_pdf}
          disabled={exportPdf.isPending}
          onClick={() => {
            exportPdf
              .mutateAsync(undefined)
              .then(() => {
                setToastMessage(translations.actions_download_ready);
              })
              .catch(() => {
                setToastMessage(exportPdf.error?.message ?? translations.actions_export_failed);
              });
          }}
        >
          <strong>{exportPdf.isPending ? translations.actions_exporting : translations.actions_export_pdf}</strong>
          <span style={{ color: 'var(--text-secondary)' }}>
            {exportPdf.isPending ? translations.actions_exporting : translations.actions_export_hint}
          </span>
        </button>
      </div>

      {toastMessage && (
        <div className="pp-toast" role="status" aria-live="polite">
          <div className="pp-toast-card">{toastMessage}</div>
        </div>
      )}
    </section>
  );
};

export default QuickActions;
