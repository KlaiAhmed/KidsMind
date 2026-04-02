import { useEffect, useMemo, useState } from 'react';
import { useAuditLog } from '../../hooks/api/useAuditLog';
import { useChangePassword } from '../../hooks/api/useChangePassword';
import { useCurrentUser } from '../../hooks/api/useCurrentUser';
import { useEnableMfa } from '../../hooks/api/useEnableMfa';
import { usePatchSettings } from '../../hooks/api/usePatchSettings';
import { apiClient } from '../../lib/api';
import { authStore } from '../../store/auth.store';
import '../../styles/parent-portal.css';

const COPY = {
  title: 'App settings',
  tabProfile: 'Profile',
  tabSecurity: 'Security',
  tabPrivacy: 'Privacy',
  tabAccessibility: 'Accessibility',
  cancel: 'Cancel',
  save: 'Save changes',
  loading: 'Loading settings...',
  saved: 'Settings updated',
  saveFailed: 'Could not update settings.',
  changeEmail: 'Change email',
  profileUnsaved: 'You have unsaved profile changes.',
  changePassword: 'Change password',
  enableMfa: 'Enable 2FA',
  verifyMfa: 'Verify 2FA',
  parentPin: 'Parent PIN',
  updatePin: 'Update PIN',
  loginHistory: 'Login history',
  requestData: 'Request my data',
  comingSoon: 'Coming soon',
  deleteAccount: 'Delete account',
  deleteConfirmTitle: 'Delete account permanently?',
  deleteConfirmDesc: 'Type DELETE to unlock account deletion.',
  deleteConfirmButton: 'Delete permanently',
  deleted: 'Account deleted',
  deleteFailed: 'Could not delete account.',
  consentAnalyticsWarning: 'Disabling this will opt out of AI model training improvements.',
  reduceMotion: 'Reduce animations',
  highContrast: 'High contrast',
  fontSize: 'Font size',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
} as const;

const FONT_SCALE_MAP = {
  small: '0.875',
  medium: '1',
  large: '1.125',
} as const;

const LOCAL_STORAGE_KEYS = {
  reduceMotion: 'kidsmind_reduce_motion',
  highContrast: 'kidsmind_high_contrast',
  fontScale: 'kidsmind_font_scale',
} as const;

const FALLBACK_TIMEZONES = [
  'UTC',
  'Europe/Paris',
  'Europe/London',
  'Africa/Tunis',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Tokyo',
];

type SettingsTab = 'profile' | 'security' | 'privacy' | 'accessibility';
type FontScaleOption = keyof typeof FONT_SCALE_MAP;

interface ProfileFormState {
  username: string;
  email: string;
  country: string;
  timezone: string;
  defaultLanguage: string;
  notificationsEmail: boolean;
  notificationsPush: boolean;
  consentAnalytics: boolean;
}

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface AccessibilityState {
  reduceMotion: boolean;
  highContrast: boolean;
  fontScale: FontScaleOption;
}

const nowDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const getAllTimezones = (): string[] => {
  const supportedValuesOf = Intl as Intl.DateTimeFormatOptions & {
    supportedValuesOf?: (option: string) => string[];
  };

  if (typeof supportedValuesOf.supportedValuesOf === 'function') {
    return supportedValuesOf.supportedValuesOf('timeZone').slice();
  }

  return FALLBACK_TIMEZONES;
};

const readBoolean = (key: string, fallback: boolean): boolean => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(key);
  if (rawValue === null) {
    return fallback;
  }

  return rawValue === 'true';
};

const SettingsPage = () => {
  const userQuery = useCurrentUser();
  const patchSettings = usePatchSettings();
  const changePassword = useChangePassword();
  const enableMfa = useEnableMfa();
  const auditLog = useAuditLog(1);

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [timezoneSearch, setTimezoneSearch] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [profileDraft, setProfileDraft] = useState<ProfileFormState | null>(null);

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [securityPin, setSecurityPin] = useState<string>('');
  const [mfaCode, setMfaCode] = useState<string>('');
  const [isMfaModalOpen, setIsMfaModalOpen] = useState<boolean>(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');

  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState<boolean>(false);

  const [accessibility, setAccessibility] = useState<AccessibilityState>({
    reduceMotion: readBoolean(LOCAL_STORAGE_KEYS.reduceMotion, false),
    highContrast: readBoolean(LOCAL_STORAGE_KEYS.highContrast, false),
    fontScale: (typeof window !== 'undefined' && (window.localStorage.getItem(LOCAL_STORAGE_KEYS.fontScale) as FontScaleOption | null)) || 'medium',
  });

  const baseProfileForm = useMemo<ProfileFormState>(() => {
    return {
      username: userQuery.data?.username ?? '',
      email: userQuery.data?.email ?? '',
      country: userQuery.data?.settings?.country ?? '',
      timezone: userQuery.data?.settings?.timezone ?? 'UTC',
      defaultLanguage: userQuery.data?.settings?.default_language ?? userQuery.data?.settings?.defaultLanguage ?? 'en',
      notificationsEmail: userQuery.data?.settings?.notifications_email ?? true,
      notificationsPush: userQuery.data?.settings?.notifications_push ?? true,
      consentAnalytics: userQuery.data?.settings?.consent_analytics ?? true,
    };
  }, [userQuery.data]);

  const profileForm = profileDraft ?? baseProfileForm;
  const initialProfileSnapshot = useMemo(() => JSON.stringify(baseProfileForm), [baseProfileForm]);

  const updateProfileForm = (updater: (current: ProfileFormState) => ProfileFormState): void => {
    setProfileDraft((current) => {
      const source = current ?? baseProfileForm;
      return updater(source);
    });
  };

  const allTimezones = useMemo(() => getAllTimezones(), []);

  const visibleTimezones = useMemo(() => {
    if (!timezoneSearch.trim()) {
      return allTimezones;
    }

    const lower = timezoneSearch.toLowerCase();
    return allTimezones.filter((timezone) => timezone.toLowerCase().includes(lower));
  }, [allTimezones, timezoneSearch]);

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

  const isProfileDirty = useMemo(() => {
    return initialProfileSnapshot !== '' && JSON.stringify(profileForm) !== initialProfileSnapshot;
  }, [initialProfileSnapshot, profileForm]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (!isProfileDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = COPY.profileUnsaved;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isProfileDirty]);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle('reduce-motion', accessibility.reduceMotion);
    root.classList.toggle('high-contrast', accessibility.highContrast);
    root.style.setProperty('--font-scale', FONT_SCALE_MAP[accessibility.fontScale]);

    window.localStorage.setItem(LOCAL_STORAGE_KEYS.reduceMotion, String(accessibility.reduceMotion));
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.highContrast, String(accessibility.highContrast));
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.fontScale, accessibility.fontScale);
  }, [accessibility]);

  const saveProfile = async (): Promise<void> => {
    try {
      await patchSettings.mutateAsync({
        username: profileForm.username,
        country: profileForm.country,
        timezone: profileForm.timezone,
        default_language: profileForm.defaultLanguage,
        notifications_email: profileForm.notificationsEmail,
        notifications_push: profileForm.notificationsPush,
        consent_analytics: profileForm.consentAnalytics,
      });

      await userQuery.refetch();
      setProfileDraft(null);
      setToastMessage(COPY.saved);
    } catch {
      setToastMessage(patchSettings.error?.message ?? COPY.saveFailed);
    }
  };

  const submitPasswordChange = async (): Promise<void> => {
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

      setToastMessage(COPY.saved);
    } catch {
      setToastMessage(changePassword.error?.message ?? COPY.saveFailed);
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
      setToastMessage(COPY.saved);
    } catch {
      setToastMessage(COPY.saveFailed);
    }
  };

  const submitMfaEnable = async (): Promise<void> => {
    try {
      await enableMfa.mutateAsync(undefined);
      setIsMfaModalOpen(true);
    } catch {
      setToastMessage(enableMfa.error?.message ?? COPY.saveFailed);
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
      setToastMessage(COPY.saved);
      await userQuery.refetch();
    } catch {
      setToastMessage(COPY.saveFailed);
    }
  };

  const requestDataExport = (): void => {
    setToastMessage(COPY.comingSoon);
  };

  const deleteAccount = async (): Promise<void> => {
    try {
      await apiClient.delete('/api/v1/users/me');
      setToastMessage(COPY.deleted);
      authStore.logout({ redirectToLogin: true });
    } catch {
      setToastMessage(COPY.deleteFailed);
    }
  };

  const loginHistory = (auditLog.data?.entries ?? [])
    .filter((entry) => entry.action.toLowerCase() === 'login')
    .slice(0, 5);

  if (userQuery.isLoading) {
    return (
      <main className="pp-content" aria-label={COPY.loading}>
        <div className="pp-skeleton" style={{ height: 220 }} />
      </main>
    );
  }

  if (userQuery.error || !userQuery.data) {
    return (
      <main className="pp-content">
        <article className="pp-card">
          <h1 className="pp-title">{COPY.title}</h1>
          <p className="pp-error" role="alert">{userQuery.error?.message ?? COPY.saveFailed}</p>
        </article>
      </main>
    );
  }

  return (
    <main className="pp-content" aria-labelledby="settings-page-title">
      <article className="pp-card">
        <h1 id="settings-page-title" className="pp-title">{COPY.title}</h1>

        <div className="pp-tabs" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className={`pp-tab pp-touch pp-focusable ${activeTab === 'profile' ? 'pp-tab-active' : ''}`}
            aria-label={COPY.tabProfile}
            onClick={() => setActiveTab('profile')}
          >
            {COPY.tabProfile}
          </button>
          <button
            type="button"
            className={`pp-tab pp-touch pp-focusable ${activeTab === 'security' ? 'pp-tab-active' : ''}`}
            aria-label={COPY.tabSecurity}
            onClick={() => setActiveTab('security')}
          >
            {COPY.tabSecurity}
          </button>
          <button
            type="button"
            className={`pp-tab pp-touch pp-focusable ${activeTab === 'privacy' ? 'pp-tab-active' : ''}`}
            aria-label={COPY.tabPrivacy}
            onClick={() => setActiveTab('privacy')}
          >
            {COPY.tabPrivacy}
          </button>
          <button
            type="button"
            className={`pp-tab pp-touch pp-focusable ${activeTab === 'accessibility' ? 'pp-tab-active' : ''}`}
            aria-label={COPY.tabAccessibility}
            onClick={() => setActiveTab('accessibility')}
          >
            {COPY.tabAccessibility}
          </button>
        </div>

        {activeTab === 'profile' && (
          <form
            className="pp-form-grid"
            style={{ marginTop: '0.8rem' }}
            onSubmit={(event) => {
              event.preventDefault();
              void saveProfile();
            }}
          >
            <div className="pp-form-row">
              <label htmlFor="settings-username">Username</label>
              <input
                id="settings-username"
                aria-label="Username"
                value={profileForm.username}
                  onChange={(event) => updateProfileForm((current) => ({ ...current, username: event.currentTarget.value }))}
              />
            </div>

            <div className="pp-form-row">
              <label htmlFor="settings-email">Email</label>
              <input id="settings-email" aria-label="Email" value={profileForm.email} readOnly />
              <button type="button" className="pp-button pp-touch pp-focusable" aria-label={COPY.changeEmail}>
                {COPY.changeEmail}
              </button>
            </div>

            <div className="pp-grid-two">
              <div className="pp-form-row">
                <label htmlFor="settings-country">Country</label>
                <input
                  id="settings-country"
                  aria-label="Country"
                  value={profileForm.country}
                  onChange={(event) => updateProfileForm((current) => ({ ...current, country: event.currentTarget.value }))}
                />
              </div>
              <div className="pp-form-row">
                <label htmlFor="settings-default-language">Default language</label>
                <select
                  id="settings-default-language"
                  aria-label="Default language"
                  value={profileForm.defaultLanguage}
                  onChange={(event) => updateProfileForm((current) => ({ ...current, defaultLanguage: event.currentTarget.value }))}
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="it">Italian</option>
                  <option value="ar">Arabic</option>
                  <option value="ch">Chinese</option>
                </select>
              </div>
            </div>

            <div className="pp-form-row">
              <label htmlFor="settings-timezone-search">Timezone</label>
              <input
                id="settings-timezone-search"
                aria-label="Search timezone"
                placeholder="Search timezone"
                value={timezoneSearch}
                onChange={(event) => setTimezoneSearch(event.currentTarget.value)}
              />
              <select
                aria-label="Timezone"
                value={profileForm.timezone}
                onChange={(event) => updateProfileForm((current) => ({ ...current, timezone: event.currentTarget.value }))}
              >
                {visibleTimezones.map((timezone) => (
                  <option key={timezone} value={timezone}>{timezone}</option>
                ))}
              </select>
            </div>

            {isProfileDirty && <p className="pill-amber pp-pill">{COPY.profileUnsaved}</p>}

            <button
              type="submit"
              className="pp-button pp-button-primary pp-touch pp-focusable"
              aria-label={COPY.save}
              disabled={patchSettings.isPending}
            >
              {patchSettings.isPending ? `${COPY.save}...` : COPY.save}
            </button>
          </form>
        )}

        {activeTab === 'security' && (
          <section style={{ marginTop: '0.8rem', display: 'grid', gap: '0.8rem' }}>
            <article className="pp-card">
              <h2 className="pp-title">{COPY.changePassword}</h2>
              <form
                className="pp-form-grid"
                style={{ marginTop: '0.6rem' }}
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitPasswordChange();
                }}
              >
                <input
                  type="password"
                  aria-label="Current password"
                  placeholder="Current password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => {
                    setPasswordForm((current) => ({ ...current, currentPassword: event.currentTarget.value }));
                  }}
                />
                <input
                  type="password"
                  aria-label="New password"
                  placeholder="New password"
                  value={passwordForm.newPassword}
                  onChange={(event) => {
                    setPasswordForm((current) => ({ ...current, newPassword: event.currentTarget.value }));
                  }}
                />
                <input
                  type="password"
                  aria-label="Confirm new password"
                  placeholder="Confirm password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => {
                    setPasswordForm((current) => ({ ...current, confirmPassword: event.currentTarget.value }));
                  }}
                />
                <button type="submit" className="pp-button pp-button-primary pp-touch pp-focusable" aria-label={COPY.changePassword}>
                  {COPY.changePassword}
                </button>
              </form>
            </article>

            <article className="pp-card">
              <h2 className="pp-title">2FA</h2>
              {userQuery.data.mfa_enabled ? (
                <p className="pill-green pp-pill">Enabled</p>
              ) : (
                <button
                  type="button"
                  className="pp-button pp-button-primary pp-touch pp-focusable"
                  aria-label={COPY.enableMfa}
                  onClick={() => {
                    void submitMfaEnable();
                  }}
                >
                  {enableMfa.isPending ? `${COPY.enableMfa}...` : COPY.enableMfa}
                </button>
              )}
            </article>

            <article className="pp-card">
              <h2 className="pp-title">{COPY.parentPin}</h2>
              <form
                className="pp-form-grid"
                style={{ marginTop: '0.6rem' }}
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitPinChange();
                }}
              >
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]*"
                  aria-label={COPY.parentPin}
                  placeholder="1234"
                  value={securityPin}
                  onChange={(event) => {
                    setSecurityPin(event.currentTarget.value.replace(/\D/g, '').slice(0, 4));
                  }}
                />
                <button type="submit" className="pp-button pp-button-primary pp-touch pp-focusable" aria-label={COPY.updatePin}>
                  {COPY.updatePin}
                </button>
              </form>
            </article>

            <article className="pp-card">
              <h2 className="pp-title">{COPY.loginHistory}</h2>
              {auditLog.isLoading ? (
                <div className="pp-skeleton" style={{ height: 120, marginTop: '0.6rem' }} aria-label={COPY.loading} />
              ) : auditLog.error ? (
                <p className="pp-error">{auditLog.error.message}</p>
              ) : (
                <ul style={{ marginTop: '0.6rem', display: 'grid', gap: '0.45rem' }}>
                  {loginHistory.map((entry) => (
                    <li key={entry.id} className="pp-card">
                      <p style={{ fontWeight: 700 }}>{nowDateTime(entry.created_at)}</p>
                      <p style={{ color: 'var(--pp-muted)' }}>{entry.ip_address ?? 'Unknown IP'}</p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        )}

        {activeTab === 'privacy' && (
          <section style={{ marginTop: '0.8rem', display: 'grid', gap: '0.8rem' }}>
            <article className="pp-card">
              <h2 className="pp-title">Consent</h2>

              <div className="pp-toggle-row" style={{ marginTop: '0.6rem' }}>
                <span>Email notifications</span>
                <button
                  type="button"
                  className={`pp-switch pp-touch pp-focusable ${profileForm.notificationsEmail ? 'pp-switch-on' : ''}`}
                  aria-label="Toggle email notifications"
                  onClick={() => {
                    updateProfileForm((current) => ({ ...current, notificationsEmail: !current.notificationsEmail }));
                  }}
                />
              </div>

              <div className="pp-toggle-row" style={{ marginTop: '0.6rem' }}>
                <span>Push notifications</span>
                <button
                  type="button"
                  className={`pp-switch pp-touch pp-focusable ${profileForm.notificationsPush ? 'pp-switch-on' : ''}`}
                  aria-label="Toggle push notifications"
                  onClick={() => {
                    updateProfileForm((current) => ({ ...current, notificationsPush: !current.notificationsPush }));
                  }}
                />
              </div>

              <div className="pp-toggle-row" style={{ marginTop: '0.6rem' }}>
                <span>Opt out of AI model training</span>
                <button
                  type="button"
                  className={`pp-switch pp-touch pp-focusable ${!profileForm.consentAnalytics ? 'pp-switch-on' : ''}`}
                  aria-label="Toggle AI model training consent"
                  onClick={() => {
                    if (profileForm.consentAnalytics) {
                      setIsAnalyticsDialogOpen(true);
                    } else {
                      updateProfileForm((current) => ({ ...current, consentAnalytics: true }));
                    }
                  }}
                />
              </div>

              <button
                type="button"
                className="pp-button pp-button-primary pp-touch pp-focusable"
                aria-label={COPY.save}
                style={{ marginTop: '0.8rem' }}
                onClick={() => {
                  void saveProfile();
                }}
              >
                {COPY.save}
              </button>
            </article>

            <article className="pp-card">
              <button
                type="button"
                className="pp-button pp-touch pp-focusable"
                aria-label={COPY.requestData}
                onClick={requestDataExport}
              >
                {COPY.requestData}
              </button>
            </article>

            <article className="pp-card">
              <button
                type="button"
                className="pp-button pp-touch pp-focusable"
                aria-label={COPY.deleteAccount}
                onClick={() => {
                  setIsDeleteDialogOpen(true);
                }}
              >
                {COPY.deleteAccount}
              </button>
            </article>
          </section>
        )}

        {activeTab === 'accessibility' && (
          <section style={{ marginTop: '0.8rem', display: 'grid', gap: '0.8rem' }}>
            <article className="pp-card">
              <div className="pp-toggle-row">
                <span>{COPY.reduceMotion}</span>
                <button
                  type="button"
                  className={`pp-switch pp-touch pp-focusable ${accessibility.reduceMotion ? 'pp-switch-on' : ''}`}
                  aria-label={COPY.reduceMotion}
                  onClick={() => {
                    setAccessibility((current) => ({
                      ...current,
                      reduceMotion: !current.reduceMotion,
                    }));
                  }}
                />
              </div>

              <div className="pp-toggle-row" style={{ marginTop: '0.6rem' }}>
                <span>{COPY.highContrast}</span>
                <button
                  type="button"
                  className={`pp-switch pp-touch pp-focusable ${accessibility.highContrast ? 'pp-switch-on' : ''}`}
                  aria-label={COPY.highContrast}
                  onClick={() => {
                    setAccessibility((current) => ({
                      ...current,
                      highContrast: !current.highContrast,
                    }));
                  }}
                />
              </div>

              <div className="pp-form-row" style={{ marginTop: '0.7rem' }}>
                <label htmlFor="font-scale">{COPY.fontSize}</label>
                <select
                  id="font-scale"
                  aria-label={COPY.fontSize}
                  value={accessibility.fontScale}
                  onChange={(event) => {
                    setAccessibility((current) => ({
                      ...current,
                      fontScale: event.currentTarget.value as FontScaleOption,
                    }));
                  }}
                >
                  <option value="small">{COPY.small}</option>
                  <option value="medium">{COPY.medium}</option>
                  <option value="large">{COPY.large}</option>
                </select>
              </div>
            </article>
          </section>
        )}
      </article>

      {isMfaModalOpen && (
        <div className="pp-dialog-backdrop" role="dialog" aria-modal="true" aria-label={COPY.verifyMfa}>
          <div className="pp-dialog">
            <h2 className="pp-title">{COPY.verifyMfa}</h2>
            {enableMfa.data?.qr_code_url && (
              <img
                src={enableMfa.data.qr_code_url}
                alt="MFA QR code"
                style={{ width: 220, maxWidth: '100%', borderRadius: 10, border: '1px solid var(--pp-border)' }}
              />
            )}
            <div>
              <p style={{ fontWeight: 700, marginBottom: '0.3rem' }}>Backup codes</p>
              <ul style={{ display: 'grid', gap: '0.25rem' }}>
                {(enableMfa.data?.backup_codes ?? []).map((code) => (
                  <li key={code} className="pp-pill pill-gray">{code}</li>
                ))}
              </ul>
            </div>
            <input
              aria-label="MFA verification code"
              placeholder="Enter code"
              value={mfaCode}
              onChange={(event) => setMfaCode(event.currentTarget.value)}
            />
            <div className="pp-topbar-actions">
              <button
                type="button"
                className="pp-button pp-touch pp-focusable"
                aria-label={COPY.cancel}
                onClick={() => setIsMfaModalOpen(false)}
              >
                {COPY.cancel}
              </button>
              <button
                type="button"
                className="pp-button pp-button-primary pp-touch pp-focusable"
                aria-label={COPY.verifyMfa}
                onClick={() => {
                  void submitMfaVerify();
                }}
              >
                {COPY.verifyMfa}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAnalyticsDialogOpen && (
        <div className="pp-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Consent warning">
          <div className="pp-dialog">
            <h2 className="pp-title">Consent</h2>
            <p>{COPY.consentAnalyticsWarning}</p>
            <div className="pp-topbar-actions">
              <button
                type="button"
                className="pp-button pp-touch pp-focusable"
                aria-label={COPY.cancel}
                onClick={() => {
                  setIsAnalyticsDialogOpen(false);
                }}
              >
                {COPY.cancel}
              </button>
              <button
                type="button"
                className="pp-button pp-button-primary pp-touch pp-focusable"
                aria-label="Confirm opt out"
                onClick={() => {
                  updateProfileForm((current) => ({
                    ...current,
                    consentAnalytics: false,
                  }));
                  setIsAnalyticsDialogOpen(false);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteDialogOpen && (
        <div className="pp-dialog-backdrop" role="dialog" aria-modal="true" aria-label={COPY.deleteConfirmTitle}>
          <div className="pp-dialog">
            <h2 className="pp-title">{COPY.deleteConfirmTitle}</h2>
            <p>{COPY.deleteConfirmDesc}</p>
            <input
              aria-label="Type DELETE to confirm"
              placeholder="DELETE"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.currentTarget.value)}
            />
            <div className="pp-topbar-actions">
              <button
                type="button"
                className="pp-button pp-touch pp-focusable"
                aria-label={COPY.cancel}
                onClick={() => {
                  setDeleteConfirmText('');
                  setIsDeleteDialogOpen(false);
                }}
              >
                {COPY.cancel}
              </button>
              <button
                type="button"
                className="pp-button pp-button-primary pp-touch pp-focusable"
                aria-label={COPY.deleteConfirmButton}
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={() => {
                  void deleteAccount();
                }}
              >
                {COPY.deleteConfirmButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="pp-toast" role="status" aria-live="polite">
          <div className="pp-toast-card">{toastMessage}</div>
        </div>
      )}
    </main>
  );
};

export default SettingsPage;
