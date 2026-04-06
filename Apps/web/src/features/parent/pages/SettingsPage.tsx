import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuditLog } from '../api';
import { useChangePassword, useMeSummaryQuery, useEnableMfa } from '../../auth';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { useLanguage } from '../../../hooks/useLanguage';
import { apiClient } from '../../../lib/api';
import { logout } from '../../../lib/logout';
import { queryKeys } from '../../../lib/queryKeys';
import ModernDropdown from '../../../components/ui/ModernDropdown';
import { ModernSwitch } from '../../../components/ui/ModernSwitch';
import AnalyticsConsentDialog from './AnalyticsConsentDialog';
import DeleteAccountDialog from './DeleteAccountDialog';
import MfaSetupDialog from './MfaSetupDialog';
import SecuritySettingsSection from './SecuritySettingsSection';
import {
  FONT_SIZE_OPTIONS,
  type SettingsTab,
  type PasswordFormState,
  type ConsentState,
  nowDateTime,
  getPasswordRequirement,
} from './settingsPageData';
import {
  readStoredReduceAnimationsPreference,
  setStoredReduceAnimationsPreference,
} from '../../../utils/motionPreferences';
import '../../../styles/parent-portal.css';
const SettingsPage = () => {
  const queryClient = useQueryClient();
  const userQuery = useMeSummaryQuery();
  const changePassword = useChangePassword();
  const enableMfa = useEnableMfa();
  const auditLog = useAuditLog(1);
  const { translations } = useLanguage();
  const { fontSize, highContrast, setFontSize, setHighContrast } = useAccessibility();
  const [activeTab, setActiveTab] = useState<SettingsTab>('security');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordValidationRequested, setPasswordValidationRequested] = useState<boolean>(false);
  const [securityPin, setSecurityPin] = useState<string>('');
  const [pinValid, setPinValid] = useState<boolean>(false);
  const [mfaCode, setMfaCode] = useState<string>('');
  const [isMfaModalOpen, setIsMfaModalOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState<boolean>(false);
  const [reduceMotion, setReduceMotion] = useState<boolean>(() => readStoredReduceAnimationsPreference());
  const baseConsentState = useMemo<ConsentState>(() => ({
    notificationsEmail: userQuery.user?.settings?.notifications_email ?? true,
    notificationsPush: userQuery.user?.settings?.notifications_push ?? true,
    consentAnalytics: userQuery.user?.settings?.consent_analytics ?? true,
  }), [userQuery.user]);
  const passwordRequirement = getPasswordRequirement(passwordForm.newPassword);
  const currentPasswordError = passwordValidationRequested && !passwordForm.currentPassword.trim()
    ? translations.settings_current_password_required
    : undefined;
  const confirmPasswordError = passwordForm.confirmPassword.length > 0 && passwordForm.newPassword !== passwordForm.confirmPassword
    ? translations.settings_password_mismatch
    : passwordValidationRequested && passwordForm.newPassword !== passwordForm.confirmPassword
      ? translations.settings_password_mismatch
      : undefined;
  const canSubmitPasswordChange = Boolean(passwordForm.currentPassword.trim())
    && Boolean(passwordForm.newPassword.trim())
    && !passwordRequirement
    && passwordForm.newPassword === passwordForm.confirmPassword
    && !changePassword.isPending;
  const [consentDraft, setConsentDraft] = useState<ConsentState | null>(null);
  const consentForm = consentDraft ?? baseConsentState;
  const initialConsentSnapshot = useMemo(() => JSON.stringify(baseConsentState), [baseConsentState]);
  const isConsentDirty = useMemo(() => {
    return initialConsentSnapshot !== '' && JSON.stringify(consentForm) !== initialConsentSnapshot;
  }, [initialConsentSnapshot, consentForm]);
  const updateConsentForm = (updater: (current: ConsentState) => ConsentState): void => {
    setConsentDraft((current) => {
      const source = current ?? baseConsentState;
      return updater(source);
    });
  };
  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setToastMessage('');
    }, 2800);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);
  const submitPasswordChange = async (): Promise<void> => {
    setPasswordValidationRequested(true);
    if (!passwordForm.currentPassword.trim()) {
      return;
    }
    if (passwordRequirement) {
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return;
    }
    try {
      await changePassword.mutateAsync({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
        confirm_password: passwordForm.confirmPassword,
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordValidationRequested(false);
      setToastMessage(translations.settings_saved);
    } catch {
      setToastMessage(changePassword.error?.message ?? translations.settings_save_failed);
    }
  };
  const submitPinChange = async (): Promise<void> => {
    try {
      await apiClient.patch('/api/v1/safety-and-rules', {
        body: {
          parentPin: securityPin,
        },
      });
      setSecurityPin('');
      setToastMessage(translations.settings_saved);
    } catch {
      setToastMessage(translations.settings_save_failed);
    }
  };
  const submitMfaEnable = async (): Promise<void> => {
    try {
      await enableMfa.mutateAsync(undefined);
      setIsMfaModalOpen(true);
    } catch {
      setToastMessage(enableMfa.error?.message ?? translations.settings_save_failed);
    }
  };
  const submitMfaVerify = async (): Promise<void> => {
    try {
      await apiClient.post('/api/v1/users/me/mfa/verify', {
        body: {
          code: mfaCode,
        },
      });
      setIsMfaModalOpen(false);
      setMfaCode('');
      setToastMessage(translations.settings_saved);
      await queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    } catch {
      setToastMessage(translations.settings_save_failed);
    }
  };
  const requestDataExport = (): void => {
    setToastMessage(translations.settings_coming_soon);
  };
  const deleteAccount = async (): Promise<void> => {
    try {
      await apiClient.delete('/api/v1/users/me');
      setToastMessage(translations.settings_deleted);
      await logout();
    } catch {
      setToastMessage(translations.settings_delete_failed);
    }
  };
  const saveConsentSettings = async (): Promise<void> => {
    try {
      await apiClient.patch('/api/v1/users/me/settings', {
        body: {
          notifications_email: consentForm.notificationsEmail,
          notifications_push: consentForm.notificationsPush,
          consent_analytics: consentForm.consentAnalytics,
        },
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.me() });
      setConsentDraft(null);
      setToastMessage(translations.settings_saved);
    } catch {
      setToastMessage(translations.settings_save_failed);
    }
  };
  const loginHistory = (auditLog.data?.entries ?? [])
    .filter((entry) => entry.action.toLowerCase() === 'login')
    .slice(0, 5);
  if (userQuery.isLoading) {
    return (
      <main className="pp-content" aria-label={translations.settings_loading}>
        <div className="pp-skeleton" style={{ height: 220 }} />
      </main>
    );
  }
  if (userQuery.error || !userQuery.user) {
    const isAuthError = Boolean(userQuery.error?.isAuthError);
    return (
      <main className="pp-content">
        <div>
          <h1 className="pp-title">{translations.settings_title}</h1>
          <p className="pp-error" role="alert">
            {isAuthError && userQuery.error?.status === 403
              ? 'Access denied.'
              : userQuery.error?.message ?? translations.settings_save_failed}
          </p>
          {!isAuthError && (
            <button
              type="button"
              className="pp-button pp-touch pp-focusable"
              aria-label={translations.settings_retry}
              disabled={userQuery.isFetching}
              onClick={() => {
                void userQuery.refetch();
              }}
            >
              {userQuery.isFetching ? translations.settings_loading : translations.settings_retry}
            </button>
          )}
        </div>
      </main>
    );
  }
  return (
    <main className="pp-content" aria-labelledby="settings-page-title">
      <article className="pp-card">
        <h1 id="settings-page-title" className="pp-title">{translations.settings_title}</h1>
        <div className="pp-tabs">
          <button
            type="button"
            className={`pp-tab pp-touch pp-focusable ${activeTab === 'security' ? 'pp-tab-active' : ''}`}
            aria-label={translations.settings_tab_security}
            onClick={() => setActiveTab('security')}
          >
            {translations.settings_tab_security}
          </button>
          <button
            type="button"
            className={`pp-tab pp-touch pp-focusable ${activeTab === 'sessions' ? 'pp-tab-active' : ''}`}
            aria-label={translations.settings_tab_sessions}
            onClick={() => setActiveTab('sessions')}
          >
            {translations.settings_tab_sessions}
          </button>
          <button
            type="button"
            className={`pp-tab pp-touch pp-focusable ${activeTab === 'privacy' ? 'pp-tab-active' : ''}`}
            aria-label={translations.settings_tab_privacy}
            onClick={() => setActiveTab('privacy')}
          >
            {translations.settings_tab_privacy}
          </button>
          <button
            type="button"
            className={`pp-tab pp-touch pp-focusable ${activeTab === 'accessibility' ? 'pp-tab-active' : ''}`}
            aria-label={translations.settings_tab_accessibility}
            onClick={() => setActiveTab('accessibility')}
          >
            {translations.settings_tab_accessibility}
          </button>
        </div>
      {activeTab === 'security' && (
        <SecuritySettingsSection
          translations={translations}
          passwordForm={passwordForm}
          currentPasswordError={currentPasswordError}
          confirmPasswordError={confirmPasswordError}
          passwordRequirement={passwordRequirement}
          canSubmitPasswordChange={canSubmitPasswordChange}
          onPasswordFieldChange={(field, value) => {
            setPasswordForm((current) => ({ ...current, [field]: value }));
          }}
          onPasswordFieldBlur={() => setPasswordValidationRequested(true)}
          onSubmitPasswordChange={() => {
            void submitPasswordChange();
          }}
          securityPin={securityPin}
          onSecurityPinChange={setSecurityPin}
          onPinValidityChange={setPinValid}
          onSubmitPinChange={() => {
            void submitPinChange();
          }}
          pinValid={pinValid}
          userMfaEnabled={Boolean(userQuery.user.mfa_enabled)}
          enableMfaPending={enableMfa.isPending}
          onEnableMfa={() => {
            void submitMfaEnable();
          }}
        />
      )}
      {activeTab === 'sessions' && (
        <>
          <h2 className="pp-title">{translations.settings_login_history}</h2>
          {auditLog.isLoading ? (
              <div className="pp-skeleton" style={{ height: 120, marginTop: '0.75rem' }} aria-label={translations.settings_loading} />
            ) : auditLog.error ? (
              <p className="pp-error">{auditLog.error.message}</p>
            ) : (
              <ul style={{ display: 'grid', gap: '0.5rem' }}>
                {loginHistory.map((entry) => (
                  <li key={entry.id} className="pp-card" style={{ padding: '0.75rem' }}>
                    <p style={{ fontWeight: 600 }}>{nowDateTime(entry.created_at)}</p>
                    <p style={{ color: 'var(--text-secondary)' }}>{entry.ip_address ?? 'Unknown IP'}</p>
                  </li>
                ))}
              </ul>
            )}
        </>
      )}
      {activeTab === 'privacy' && (
        <>
          <h2 className="pp-title">Consent</h2>
          <div className="pp-toggle-row">
            <span>{translations.settings_notifications_email}</span>
            <ModernSwitch
              checked={consentForm.notificationsEmail}
              ariaLabel={translations.settings_notifications_email}
              onChange={(checked) => {
                updateConsentForm((current) => ({ ...current, notificationsEmail: checked }));
              }}
            />
          </div>
          <div className="pp-toggle-row">
            <span>{translations.settings_notifications_push}</span>
            <ModernSwitch
              checked={consentForm.notificationsPush}
              ariaLabel={translations.settings_notifications_push}
              onChange={(checked) => {
                updateConsentForm((current) => ({ ...current, notificationsPush: checked }));
              }}
            />
          </div>
          <div className="pp-toggle-row">
            <span>{translations.settings_opt_out_ai_training}</span>
            <ModernSwitch
              checked={!consentForm.consentAnalytics}
              ariaLabel={translations.settings_opt_out_ai_training}
              onChange={(checked) => {
                if (checked) {
                  setIsAnalyticsDialogOpen(true);
                } else {
                  updateConsentForm((current) => ({ ...current, consentAnalytics: true }));
                }
              }}
            />
          </div>
          {isConsentDirty && (
            <button
              type="button"
              className="pp-button pp-button-primary pp-touch pp-focusable"
              aria-label={translations.settings_save}
              onClick={() => {
                void saveConsentSettings();
              }}
            >
              {translations.settings_save}
            </button>
          )}
          <div className="pp-privacy-actions">
            <button
              type="button"
              className="pp-button pp-touch pp-focusable"
              aria-label={translations.settings_request_data}
              onClick={requestDataExport}
            >
              {translations.settings_request_data}
            </button>
            <button
              type="button"
              className="pp-button pp-touch pp-focusable"
              aria-label={translations.settings_delete_account}
              onClick={() => {
                setIsDeleteDialogOpen(true);
              }}
            >
              {translations.settings_delete_account}
            </button>
          </div>
        </>
      )}
      {activeTab === 'accessibility' && (
        <>
          <div className="pp-toggle-row">
            <span>{translations.settings_reduce_motion}</span>
            <ModernSwitch
              checked={reduceMotion}
              ariaLabel={translations.settings_reduce_motion}
              onChange={(checked) => {
                setStoredReduceAnimationsPreference(checked);
                setReduceMotion(checked);
              }}
            />
          </div>
          <div className="pp-toggle-row">
            <span>{translations.settings_high_contrast}</span>
            <ModernSwitch
              checked={highContrast}
              ariaLabel={translations.settings_high_contrast}
              onChange={setHighContrast}
            />
          </div>
          <ModernDropdown
            id="font-size"
            label={translations.settings_font_size}
            ariaLabel={translations.settings_font_size}
            value={fontSize}
            options={FONT_SIZE_OPTIONS}
            onChange={setFontSize}
          />
        </>
      )}
      {isMfaModalOpen && (
        <MfaSetupDialog
          title={translations.settings_verify_mfa}
          verifyLabel={translations.settings_verify_mfa}
          cancelLabel={translations.settings_cancel}
          qrCodeUrl={enableMfa.data?.qr_code_url}
          backupCodes={enableMfa.data?.backup_codes ?? []}
          mfaCode={mfaCode}
          onMfaCodeChange={setMfaCode}
          onCancel={() => setIsMfaModalOpen(false)}
          onVerify={() => {
            void submitMfaVerify();
          }}
        />
      )}
      {isAnalyticsDialogOpen && (
        <AnalyticsConsentDialog
          cancelLabel={translations.settings_cancel}
          warningText={translations.settings_consent_analytics_warning}
          onCancel={() => {
            setIsAnalyticsDialogOpen(false);
          }}
          onConfirm={() => {
            updateConsentForm((current) => ({ ...current, consentAnalytics: false }));
            setIsAnalyticsDialogOpen(false);
          }}
        />
      )}
      {isDeleteDialogOpen && (
        <DeleteAccountDialog
          title={translations.settings_delete_confirm_title}
          description={translations.settings_delete_confirm_desc}
          cancelLabel={translations.settings_cancel}
          confirmLabel={translations.settings_delete_confirm_button}
          confirmText={deleteConfirmText}
          onConfirmTextChange={setDeleteConfirmText}
          onCancel={() => {
            setDeleteConfirmText('');
            setIsDeleteDialogOpen(false);
          }}
          onConfirm={() => {
            void deleteAccount();
          }}
        />
      )}
      {toastMessage && (
        <div className="pp-toast" role="status" aria-live="polite">
          <div className="pp-toast-card">{toastMessage}</div>
        </div>
      )}
      </article>
    </main>
  );
};
export default SettingsPage;
