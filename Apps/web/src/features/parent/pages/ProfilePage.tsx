import { useEffect, useMemo, useRef, useState } from 'react';
import { useMeSummaryQuery } from '../../auth';
import { usePatchSettings } from '../api';
import { useLanguage } from '../../../hooks/useLanguage';
import { getCountryOptions } from '../../../utils/countries';
import { ModernInput, ModernSelect } from '../../../components/ui/ModernInput';
import '../../../styles/parent-portal.css';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'zh', label: 'Chinese' },
];

interface ProfileFormState {
  username: string;
  email: string;
  country: string;
  defaultLanguage: string;
}

const ProfilePage = () => {
  const { translations } = useLanguage();
  const userQuery = useMeSummaryQuery();
  const patchSettings = usePatchSettings();

  const [toastMessage, setToastMessage] = useState<string>('');
  const [profileDraft, setProfileDraft] = useState<ProfileFormState | null>(null);

  // Country selector state
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [isCountryListOpen, setIsCountryListOpen] = useState<boolean>(false);
  const countrySelectorRef = useRef<HTMLDivElement | null>(null);

  const countryOptions = useMemo(() => getCountryOptions('en'), []);

  const baseProfileForm = useMemo<ProfileFormState>(() => {
    return {
      username: userQuery.user?.username ?? '',
      email: userQuery.user?.email ?? '',
      country: userQuery.user?.settings?.country ?? '',
      defaultLanguage: userQuery.user?.settings?.default_language ?? userQuery.user?.settings?.defaultLanguage ?? 'en',
    };
  }, [userQuery.user]);

  const profileForm = profileDraft ?? baseProfileForm;
  const initialProfileSnapshot = useMemo(() => JSON.stringify(baseProfileForm), [baseProfileForm]);

  const updateProfileForm = (updater: (current: ProfileFormState) => ProfileFormState): void => {
    setProfileDraft((current) => {
      const source = current ?? baseProfileForm;
      return updater(source);
    });
  };

  // Filter country options based on search
  const filteredCountryOptions = useMemo(() => {
    const normalizedSearch = countrySearch.trim().toUpperCase();
    if (!normalizedSearch) {
      return countryOptions;
    }
    return countryOptions.filter(
      (country) =>
        country.value.includes(normalizedSearch) ||
        country.label.toUpperCase().includes(normalizedSearch)
    );
  }, [countryOptions, countrySearch]);

  // Close country dropdown on outside click
  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent): void => {
      if (countrySelectorRef.current && !countrySelectorRef.current.contains(event.target as Node)) {
        setIsCountryListOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown);
    };
  }, []);

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
      event.returnValue = translations.profile_page_unsaved;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isProfileDirty]);

  const saveProfile = async (): Promise<void> => {
    try {
      await patchSettings.mutateAsync({
        username: profileForm.username,
        country: profileForm.country,
        default_language: profileForm.defaultLanguage,
      });

      setProfileDraft(null);
      setToastMessage(translations.profile_page_saved);
    } catch {
      setToastMessage(patchSettings.error?.message ?? translations.profile_page_save_failed);
    }
  };

  // Country selector handlers
  const openCountryList = (): void => {
    setCountrySearch('');
    setIsCountryListOpen(true);
  };

  const handleCountrySearchChange = (value: string): void => {
    setCountrySearch(value);
    setIsCountryListOpen(true);
  };

  const handleCountryInputFocus = (): void => {
    openCountryList();
  };

  const handleCountryOptionSelect = (countryCode: string): void => {
    updateProfileForm((current) => ({ ...current, country: countryCode }));
    setCountrySearch('');
    setIsCountryListOpen(false);
  };

  const handleCountryInputBlur = (): void => {
    setIsCountryListOpen(false);
  };

  const selectedCountryLabel = useMemo(() => {
    if (!profileForm.country) {
      return '';
    }
    const selectedCountry = countryOptions.find((c) => c.value === profileForm.country);
    return selectedCountry?.label ?? '';
  }, [countryOptions, profileForm.country]);

  const countryInputValue = isCountryListOpen
    ? countrySearch
    : (selectedCountryLabel || countrySearch);

  if (userQuery.isLoading) {
    return (
      <main className="pp-content" aria-label={translations.profile_page_loading}>
        <article className="pp-card">
          <div className="pp-skeleton" style={{ height: 220 }} />
        </article>
      </main>
    );
  }

  if (userQuery.error || !userQuery.user) {
    const isAuthError = Boolean(userQuery.error?.isAuthError);

    return (
      <main className="pp-content">
        <article className="pp-card">
          <h1 className="pp-title">{translations.profile_page_title}</h1>
          <p className="pp-error" role="alert">
            {isAuthError && userQuery.error?.status === 403
              ? 'Access denied.'
              : userQuery.error?.message ?? translations.profile_page_save_failed}
          </p>
          {!isAuthError && (
            <button
              type="button"
              className="pp-button pp-touch pp-focusable"
              aria-label={translations.profile_page_retry}
              disabled={userQuery.isFetching}
              onClick={() => {
                void userQuery.refetch();
              }}
            >
              {userQuery.isFetching ? translations.profile_page_loading : translations.profile_page_retry}
            </button>
          )}
        </article>
      </main>
    );
  }

  return (
    <main className="pp-content" aria-labelledby="profile-page-title">
      <article className="pp-card">
        <h1 id="profile-page-title" className="pp-title">{translations.profile_page_title}</h1>

        <form
          className="pp-form-grid"
          style={{ marginTop: '1.25rem' }}
          onSubmit={(event) => {
            event.preventDefault();
            void saveProfile();
          }}
        >
          <ModernInput
            id="settings-username"
            label="Username"
            placeholder="Enter username"
            value={profileForm.username}
            onChange={(event) => {
              const username = event.currentTarget.value;
              updateProfileForm((current) => ({ ...current, username }));
            }}
            success={profileForm.username.length > 0}
          />

          <ModernInput
            id="settings-email"
            type="email"
            label="Email"
            hint="Contact support to change email"
            value={profileForm.email}
            disabled
          />

          <div className="pp-grid-two" style={{ marginTop: '0.5rem' }}>
            {/* Country Selector */}
            <div ref={countrySelectorRef} style={{ position: 'relative' }}>
              <ModernInput
                id="settings-country"
                label={translations.profile_page_country}
                placeholder={translations.profile_page_country_search}
                hint={translations.profile_page_country_hint}
                value={countryInputValue}
                onChange={(event) => handleCountrySearchChange(event.currentTarget.value)}
                onFocus={handleCountryInputFocus}
                onBlur={handleCountryInputBlur}
              />
              {isCountryListOpen && (
                <div
                  className="pp-country-dropdown"
                  role="listbox"
                  aria-label={translations.profile_page_country}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {filteredCountryOptions.length === 0 ? (
                    <p style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      No matching countries
                    </p>
                  ) : (
                    filteredCountryOptions.map((country) => {
                      const isSelected = country.value === profileForm.country;
                      return (
                        <button
                          key={country.value}
                          type="button"
                          className={`pp-country-option ${isSelected ? 'pp-country-option-selected' : ''}`}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleCountryOptionSelect(country.value);
                          }}
                          role="option"
                          aria-selected={isSelected}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.625rem 0.875rem',
                            fontSize: '0.875rem',
                            background: isSelected ? 'rgba(255, 107, 53, 0.08)' : 'transparent',
                            border: 'none',
                            borderBottom: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                          }}
                        >
                          {country.label}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <ModernSelect
              id="settings-default-language"
              label={translations.profile_page_default_language}
              value={profileForm.defaultLanguage}
              onChange={(event) => {
                const defaultLanguage = event.currentTarget.value;
                updateProfileForm((current) => ({ ...current, defaultLanguage }));
              }}
              options={LANGUAGE_OPTIONS}
            />
          </div>

          {isProfileDirty && <p className="pill-amber pp-pill">{translations.profile_page_unsaved}</p>}

          <button
            type="submit"
            className="pp-button pp-button-primary pp-touch pp-focusable"
            aria-label={translations.profile_page_save}
            disabled={patchSettings.isPending}
          >
            {patchSettings.isPending ? `${translations.profile_page_save}...` : translations.profile_page_save}
          </button>
        </form>
      </article>

      {toastMessage && (
        <div className="pp-toast" role="status" aria-live="polite">
          <div className="pp-toast-card">{toastMessage}</div>
        </div>
      )}
    </main>
  );
};

export default ProfilePage;
