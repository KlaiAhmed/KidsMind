import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChildrenQuery, type ChildRecord } from '../api';
import { AddChildModal } from '../components';
import { useActiveChild } from '../hooks';
import { useLanguage } from '../../../hooks/useLanguage';
import { apiClient } from '../../../lib/api';
import { queryKeys } from '../../../lib/queryKeys';
import ModernSwitch from '../../../components/ui/ModernSwitch/ModernSwitch';
import ChildProfileEditSheet from './ChildProfileEditSheet';
import RemoveChildDialog from './RemoveChildDialog';
import { SUBJECT_OPTIONS, WEEKDAY_KEYS, AVATAR_OPTIONS, LANGUAGE_OPTIONS, PRESET_MINUTES, SLIDER_MIN, SLIDER_MAX, SLIDER_STEP, SUBJECT_META, type ChildProfilesTab, type ChildPatchPayload, type EditChildFormState, type SafetyFormState, toAge, normalizeSafetyForm } from './childProfilesData';
import '../../../styles/parent-portal.css';

const getWeekdayLabels = (translations: any) => [
  translations.monday || 'Mon',
  translations.tuesday || 'Tue',
  translations.wednesday || 'Wed',
  translations.thursday || 'Thu',
  translations.friday || 'Fri',
  translations.saturday || 'Sat',
  translations.sunday || 'Sun',
];

const ChildProfilesPage = () => {
  const queryClient = useQueryClient();
  const { translations } = useLanguage();
  const childrenQuery = useChildrenQuery();
  const { activeChild, setActiveChildId } = useActiveChild();
  const [activeTab, setActiveTab] = useState<ChildProfilesTab>('all');
  const [editForm, setEditForm] = useState<EditChildFormState | null>(null);
  const [removeCandidate, setRemoveCandidate] = useState<ChildRecord | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [safetyForm, setSafetyForm] = useState<SafetyFormState>(normalizeSafetyForm(activeChild));
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState<boolean>(false);
  const children = useMemo(() => childrenQuery.data ?? [], [childrenQuery.data]);
  const maxProfilesReached = children.length >= 5;
  useEffect(() => {
    setSafetyForm(normalizeSafetyForm(activeChild));
  }, [activeChild]);
  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setToastMessage('');
    }, 3000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);
  const selectedChild = useMemo(() => {
    return children.find((child) => child.child_id === activeChild?.child_id) ?? activeChild;
  }, [activeChild, children]);
  const handleEditOpen = (child: ChildRecord): void => {
    setEditForm({
      childId: child.child_id,
      nickname: child.nickname,
      birthDate: child.birth_date ?? '',
      educationStage: child.education_stage ?? 'PRIMARY',
      languages: child.languages ?? ['en'],
      avatar: child.avatar ?? '🧒',
      isAccelerated: Boolean(child.is_accelerated),
      isBelowExpectedStage: Boolean(child.is_below_expected_stage),
    });
  };
  const saveChildEdit = async (): Promise<void> => {
    if (!editForm) {
      return;
    }
    setIsSaving(true);
    try {
      const payload: ChildPatchPayload = {
        nickname: editForm.nickname,
        birth_date: editForm.birthDate,
        education_stage: editForm.educationStage,
        languages: editForm.languages,
        avatar: editForm.avatar,
        is_accelerated: editForm.isAccelerated,
        is_below_expected_stage: editForm.isBelowExpectedStage,
      };
      await apiClient.patch(`/api/v1/children/${editForm.childId}`, {
        body: payload,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.children() });
      setEditForm(null);
      setToastMessage(translations.child_profiles_save_success);
    } catch {
      setToastMessage(translations.child_profiles_save_failed);
    } finally {
      setIsSaving(false);
    }
  };
  const removeChild = async (): Promise<void> => {
    if (!removeCandidate) {
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.delete(`/api/v1/children/${removeCandidate.child_id}`);
      await queryClient.invalidateQueries({ queryKey: queryKeys.children() });
      setRemoveCandidate(null);
      setToastMessage(translations.child_profiles_save_success);
    } catch {
      setToastMessage(translations.child_profiles_delete_failed);
    } finally {
      setIsSaving(false);
    }
  };
  /* ─── Safety tab handlers ──────────────────────────────────────────────── */
  const handlePresetClick = useCallback(
    (minutes: number) => {
      setSafetyForm((current) => ({ ...current, dailyLimitMinutes: minutes }));
    },
    []
  );
  const handleSubjectToggle = useCallback(
    (subjectId: string) => {
      setSafetyForm((current) => ({
        ...current,
        allowedSubjects: current.allowedSubjects.includes(subjectId)
          ? current.allowedSubjects.filter((s) => s !== subjectId)
          : [...current.allowedSubjects, subjectId],
      }));
    },
    []
  );
  const handleWeekdayToggle = useCallback(
    (weekday: string) => {
      setSafetyForm((current) => ({
        ...current,
        allowedWeekdays: current.allowedWeekdays.includes(weekday)
          ? current.allowedWeekdays.filter((d) => d !== weekday)
          : [...current.allowedWeekdays, weekday],
      }));
    },
    []
  );
  const saveSafetySettings = async (): Promise<void> => {
    if (!selectedChild) {
      setToastMessage(translations.child_profiles_no_active);
      return;
    }
    setIsSaving(true);
    setSubmitError('');
    try {
      await apiClient.patch('/api/v1/safety-and-rules', {
        body: {
          childSettings: {
            dailyLimitMinutes: safetyForm.dailyLimitMinutes,
            allowedSubjects: safetyForm.allowedSubjects,
            allowedWeekdays: safetyForm.allowedWeekdays,
            enableVoice: safetyForm.enableVoice,
            storeAudioHistory: safetyForm.storeAudioHistory,
          },
        },
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.children() });
      setToastMessage(translations.child_profiles_save_success);
    } catch (err) {
      setToastMessage(translations.child_profiles_save_failed);
      setSubmitError(err instanceof Error ? err.message : 'Failed to save safety settings');
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <main className="pp-content" aria-labelledby="child-profiles-title">
      <article className="pp-card">
        <h1 id="child-profiles-title" className="pp-title">{translations.child_profiles_title}</h1>
        <div className="pp-tabs">
          <button
            type="button"
            className={`pp-tab pp-touch pp-focusable ${activeTab === 'all' ? 'pp-tab-active' : ''}`}
            aria-label={translations.child_profiles_tab_all}
            onClick={() => {
              setActiveTab('all');
            }}
          >
            {translations.child_profiles_tab_all}
          </button>
          <button
            type="button"
            className={`pp-tab pp-touch pp-focusable ${activeTab === 'safety' ? 'pp-tab-active' : ''}`}
            aria-label={translations.child_profiles_tab_safety}
            onClick={() => {
              setActiveTab('safety');
            }}
          >
            {translations.child_profiles_tab_safety}
          </button>
        </div>
        {childrenQuery.isLoading ? (
        <div className="pp-skeleton" style={{ marginTop: '0.8rem', height: 220 }} aria-label={translations.child_profiles_loading} />
      ) : childrenQuery.error ? (
        <div role="alert" style={{ marginTop: '0.8rem' }}>
          <p className="pp-error">
            {childrenQuery.error.isAuthError && childrenQuery.error.status === 403
              ? 'Access denied.'
              : childrenQuery.error.message}
          </p>
          {!childrenQuery.error.isAuthError && (
            <button
              type="button"
              className="pp-button pp-touch pp-focusable"
              aria-label={translations.child_profiles_retry}
              disabled={childrenQuery.isFetching}
              onClick={() => {
                void childrenQuery.refetch();
              }}
            >
              {childrenQuery.isFetching ? `${translations.child_profiles_retry}...` : translations.child_profiles_retry}
            </button>
          )}
        </div>
      ) : activeTab === 'all' ? (
        <div className="pp-grid-two">
          {children.length === 0 ? (
            <article className="pp-empty">{translations.child_profiles_none}</article>
          ) : (
            children.map((child) => {
              const childAge = child.age ?? toAge(child.birth_date);
              const dailyLimit = child.settings_json?.daily_limit_minutes ?? child.settings_json?.dailyLimitMinutes ?? 60;
              const voiceEnabled = child.settings_json?.enable_voice ?? child.settings_json?.enableVoice ?? false;
              const subjectCount = (child.settings_json?.allowed_subjects ?? child.settings_json?.allowedSubjects ?? []).length;
              return (
                <div key={child.child_id} className="pp-card pp-profile-card">
                  <header className="pp-profile-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span className="pp-avatar-lg" aria-hidden="true">{child.avatar ?? '🧒'}</span>
                      <div>
                        <p style={{ fontWeight: 700 }}>{child.nickname}</p>
                        <p style={{ color: 'var(--pp-muted)' }}>
                          {childAge ?? '—'} yrs • {child.education_stage ?? 'Unknown stage'}
                        </p>
                      </div>
                    </div>
                    <span className={`pp-pill ${child.is_active ? 'pill-green' : 'pill-gray'}`}>
                      {child.is_active ? translations.child_profiles_active : translations.child_profiles_inactive}
                    </span>
                  </header>
                  <div className="pp-limit-pills">
                    <span className="pp-pill pill-gray">{dailyLimit} {translations.child_profiles_min_per_day}</span>
                    <span className="pp-pill pill-gray">{translations.child_profiles_voice} {voiceEnabled ? translations.child_profiles_on : translations.child_profiles_off}</span>
                    <span className="pp-pill pill-gray">{subjectCount} {translations.child_profiles_subjects_count}</span>
                  </div>
                  <div className="pp-profile-actions">
                    <button
                      type="button"
                      className="pp-button pp-touch pp-focusable"
                      aria-label={`${translations.child_profiles_edit} ${child.nickname}`}
                      onClick={() => {
                        handleEditOpen(child);
                      }}
                    >
                      {translations.child_profiles_edit}
                    </button>
                    <button
                      type="button"
                      className="pp-button pp-touch pp-focusable"
                      aria-label={`${translations.child_profiles_set_limits} ${child.nickname}`}
                      onClick={() => {
                        setActiveChildId(child.child_id);
                        setActiveTab('safety');
                      }}
                    >
                      {translations.child_profiles_set_limits}
                    </button>
                    <button
                      type="button"
                      className="pp-button pp-touch pp-focusable"
                      aria-label={`${translations.child_profiles_remove} ${child.nickname}`}
                      onClick={() => {
                        setRemoveCandidate(child);
                      }}
                    >
                      {translations.child_profiles_remove}
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <div className="pp-card pp-profile-card" title={maxProfilesReached ? translations.child_profiles_max_reached : translations.child_profiles_add}>
            <h2 className="pp-title">{translations.child_profiles_add}</h2>
            <p style={{ color: 'var(--pp-muted)' }}>
              {maxProfilesReached ? translations.child_profiles_max_reached : translations.child_profiles_add_first}
            </p>
            {maxProfilesReached ? (
              <button
                type="button"
                className="pp-button pp-touch"
                disabled
                aria-label={translations.child_profiles_max_reached}
              >
                {translations.child_profiles_max_reached}
              </button>
            ) : (
              <button
                type="button"
                className="pp-button pp-button-primary pp-touch pp-focusable"
                aria-label={translations.child_profiles_add}
                onClick={() => setIsAddChildModalOpen(true)}
              >
                {translations.child_profiles_add}
              </button>
            )}
          </div>
        </div>
      ) : !selectedChild ? (
        <p className="pp-empty">{translations.child_profiles_no_active}</p>
      ) : (
        <form
          className="pp-safety-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSafetySettings();
          }}
        >
          {/* Daily Limit Section */}
          <div className="pp-safety-section">
            <span className="pp-safety-section-label">{translations.child_profiles_daily_limit}</span>
            <div className="pp-safety-slider" style={{ '--safety-slider-fill': `${((safetyForm.dailyLimitMinutes - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100}%` } as React.CSSProperties}>
              <input
                id="daily-limit-slider"
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={SLIDER_STEP}
                aria-label={translations.child_profiles_daily_limit}
                aria-valuetext={`${safetyForm.dailyLimitMinutes} min`}
                value={safetyForm.dailyLimitMinutes}
                onChange={(event) => {
                  const value = Number(event.currentTarget.value);
                  setSafetyForm((current) => ({
                    ...current,
                    dailyLimitMinutes: value,
                  }));
                }}
              />
              <span className="pp-safety-slider-value">{safetyForm.dailyLimitMinutes} min</span>
            </div>
            <div className="pp-safety-presets">
              {PRESET_MINUTES.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={`pp-safety-preset pp-touch pp-focusable ${safetyForm.dailyLimitMinutes === minutes ? 'pp-safety-preset-active' : ''}`}
                  aria-pressed={safetyForm.dailyLimitMinutes === minutes}
                  onClick={() => handlePresetClick(minutes)}
                >
                  {minutes} min
                </button>
              ))}
            </div>
            <span className="pp-safety-section-label" style={{ marginTop: '0.75rem' }}>{translations.child_profiles_allowed_weekdays}</span>
            <div className="pp-safety-chips" role="group" aria-label={translations.child_profiles_allowed_weekdays}>
              {getWeekdayLabels(translations).map((dayLabel, index) => {
                const weekdayKey = WEEKDAY_KEYS[index];
                const isActive = safetyForm.allowedWeekdays.includes(weekdayKey);
                return (
                  <button
                    key={weekdayKey}
                    type="button"
                    className={`pp-safety-chip pp-touch pp-focusable ${isActive ? 'pp-safety-chip-active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => handleWeekdayToggle(weekdayKey)}
                  >
                    {dayLabel}
                  </button>
                );
              })}
            </div>
          </div>
          <hr className="pp-safety-divider" />
          {/* Subjects Section */}
          <div className="pp-safety-section">
            <span className="pp-safety-section-label">{translations.child_profiles_allowed_subjects}</span>
            <div className="pp-safety-chips" role="group" aria-label={translations.child_profiles_allowed_subjects}>
              {SUBJECT_OPTIONS.map((subjectId) => {
                const meta = SUBJECT_META[subjectId];
                const isActive = safetyForm.allowedSubjects.includes(subjectId);
                return (
                  <button
                    key={subjectId}
                    type="button"
                    className={`pp-safety-chip pp-touch pp-focusable ${isActive ? 'pp-safety-chip-active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => handleSubjectToggle(subjectId)}
                  >
                    <span aria-hidden="true">{meta?.emoji}</span>
                    <span>{meta?.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <hr className="pp-safety-divider" />
          {/* Voice Section */}
          <div className="pp-safety-section">
            <div className="pp-safety-toggle">
              <div className="pp-safety-toggle-label">
                <span className="pp-safety-toggle-text">{translations.child_profiles_voice_enabled}</span>
              </div>
              <ModernSwitch
                checked={safetyForm.enableVoice}
                onChange={() => {
                  setSafetyForm((current) => {
                    const next = !current.enableVoice;
                    return { ...current, enableVoice: next, storeAudioHistory: next ? current.storeAudioHistory : false };
                  });
                }}
                ariaLabel={translations.child_profiles_voice_enabled}
              />
            </div>
            {safetyForm.enableVoice && (
              <div className="pp-safety-toggle">
                <div className="pp-safety-toggle-label">
                  <span className="pp-safety-toggle-text">{translations.child_profiles_store_audio}</span>
                </div>
                <ModernSwitch
                  checked={safetyForm.storeAudioHistory}
                  onChange={() => {
                    setSafetyForm((current) => ({ ...current, storeAudioHistory: !current.storeAudioHistory }));
                  }}
                  ariaLabel={translations.child_profiles_store_audio}
                />
              </div>
            )}
          </div>
          <hr className="pp-safety-divider" />
          {submitError && (
            <p className="pp-safety-error" role="alert">{submitError}</p>
          )}
          <button
            type="submit"
            className="pp-button pp-button-primary pp-touch pp-focusable pp-safety-save"
            aria-label={translations.child_profiles_save}
            disabled={isSaving}
          >
            {isSaving ? `${translations.child_profiles_save}...` : translations.child_profiles_save}
          </button>
        </form>
      )}
      {editForm && (
        <ChildProfileEditSheet
          editForm={editForm}
          languageOptions={LANGUAGE_OPTIONS}
          avatarOptions={AVATAR_OPTIONS}
          isSaving={isSaving}
          saveLabel={translations.child_profiles_save}
          cancelLabel={translations.child_profiles_cancel}
          editLabel={translations.child_profiles_edit}
          onClose={() => {
            setEditForm(null);
          }}
          onSave={() => {
            void saveChildEdit();
          }}
          onUpdateForm={(updater) => {
            setEditForm((current) => {
              if (!current) {
                return current;
              }
              return updater(current);
            });
          }}
        />
      )}
      {removeCandidate && (
        <RemoveChildDialog
          title={translations.child_profiles_delete_title}
          description={translations.child_profiles_delete_desc}
          candidateName={removeCandidate.nickname}
          cancelLabel={translations.child_profiles_cancel}
          confirmLabel={translations.child_profiles_delete_confirm}
          isSaving={isSaving}
          onCancel={() => {
            setRemoveCandidate(null);
          }}
          onConfirm={() => {
            void removeChild();
          }}
        />
      )}
      {toastMessage && (
        <div className="pp-toast" role="status" aria-live="polite">
          <div className="pp-toast-card">{toastMessage}</div>
        </div>
      )}
      <AddChildModal
        isOpen={isAddChildModalOpen}
        onClose={() => setIsAddChildModalOpen(false)}
        onSuccess={() => {
          setToastMessage('Child profile created successfully');
        }}
      />
      </article>
    </main>
  );
};
export default ChildProfilesPage;
