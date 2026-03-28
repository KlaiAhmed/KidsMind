/** GetStartedPage — Multi-step onboarding flow for new parent registration with 4 steps. */
import { useState, useCallback } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useMultiStep } from '../../hooks/useMultiStep';
import { getCsrfHeader, setCsrfToken } from '../../utils/csrf';
import type {
  OnboardingStep,
  ParentAccountFormData,
  ChildProfileFormData,
  PreferencesFormData,
  TranslationMap,
} from '../../types';
import AuthLayout from '../../components/shared/AuthLayout/AuthLayout';
import StepIndicator from '../../components/GetStarted/StepIndicator/StepIndicator';
import ProgressBar from '../../components/shared/ProgressBar/ProgressBar';
import StepParentAccount from '../../components/GetStarted/StepParentAccount/StepParentAccount';
import StepChildProfile from '../../components/GetStarted/StepChildProfile/StepChildProfile';
import StepPreferences from '../../components/GetStarted/StepPreferences/StepPreferences';
import StepWelcome from '../../components/GetStarted/StepWelcome/StepWelcome';
import styles from './GetStartedPage.module.css';

/** Total number of steps in the onboarding flow */
const TOTAL_STEPS = 4;
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

interface ApiErrorResponse {
  detail?: string | Array<{ msg?: string }>;
}

interface LoginSuccessResponse {
  csrf_token?: string;
}

const extractApiErrorMessage = async (response: Response, fallbackMessage: string): Promise<string> => {
  try {
    const errorBody = (await response.json()) as ApiErrorResponse;

    if (!errorBody.detail) {
      return fallbackMessage;
    }

    if (typeof errorBody.detail === 'string') {
      return errorBody.detail;
    }

    const firstValidationError = errorBody.detail.find((item) => item?.msg)?.msg;
    return firstValidationError || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

/**
 * Builds the step configuration array with current completion state.
 */
const buildStepConfig = (currentIndex: number): OnboardingStep[] => {
  const stepDefinitions: Array<{
    titleKey: keyof TranslationMap;
    subtitleKey: keyof TranslationMap;
    iconName: string;
  }> = [
    { titleKey: 'gs_step1_title', subtitleKey: 'gs_step1_subtitle', iconName: 'User' },
    { titleKey: 'gs_step2_title', subtitleKey: 'gs_step2_subtitle', iconName: 'UserPlus' },
    { titleKey: 'gs_step3_title', subtitleKey: 'gs_step3_subtitle', iconName: 'Shield' },
    { titleKey: 'gs_step4_title', subtitleKey: 'gs_step4_subtitle', iconName: 'CheckCircle' },
  ];

  return stepDefinitions.map((stepDefinition, index) => ({
    index,
    titleKey: stepDefinition.titleKey,
    subtitleKey: stepDefinition.subtitleKey,
    iconName: stepDefinition.iconName,
    isComplete: index < currentIndex,
  }));
};

const GetStartedPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, translations } = useLanguage();
  const {
    currentStepIndex,
    progressPercent,
    goToNextStep,
    goToPreviousStep,
    isFirstStep,
  } = useMultiStep(TOTAL_STEPS);

  // ─── Onboarding State ──────────────────────────────────────────────────
  const [parentData, setParentData] = useState<Partial<ParentAccountFormData>>({});
  const [childData, setChildData] = useState<Partial<ChildProfileFormData>>({});
  const [preferencesData, setPreferencesData] = useState<Partial<PreferencesFormData>>({});
  const [submitError, setSubmitError] = useState('');

  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const completeRegistrationFlow = useCallback(
    async (
      parent: ParentAccountFormData,
      child: ChildProfileFormData,
      preferences: PreferencesFormData
    ): Promise<void> => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const registerPayload = {
        email: parent.email,
        password: parent.password,
        default_language: parent.language,
        timezone,
        consents: {
          terms: parent.agreedToTerms,
          data_processing: parent.agreedToTerms,
          analytics: false,
        },
        parent_pin: preferences.parentPinCode,
        ...(parent.country ? { country: parent.country } : {}),
      };

      const registerResponse = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'web',
        },
        credentials: 'include',
        body: JSON.stringify(registerPayload),
      });

      if (!registerResponse.ok && registerResponse.status !== 409) {
        throw new Error(await extractApiErrorMessage(registerResponse, 'Unable to create account.'));
      }

      const loginResponse = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'web',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: parent.email,
          password: parent.password,
        }),
      });

      if (!loginResponse.ok) {
        throw new Error(await extractApiErrorMessage(loginResponse, 'Unable to log in after registration.'));
      }

      try {
        const loginBody = (await loginResponse.json()) as LoginSuccessResponse;
        setCsrfToken(loginBody.csrf_token ?? null);
      } catch {
        setCsrfToken(null);
      }

      const childPayload = {
        nickname: child.nickname,
        birth_date: child.birthDate,
        education_stage: child.educationStage,
        languages: [child.preferredLanguage],
        avatar: child.avatarEmoji,
        settings_json: {
          daily_limit_minutes: preferences.dailyLimitMinutes,
          allowed_subjects: preferences.allowedSubjects,
          voice_enabled: preferences.enableVoice,
        },
      };

      const childResponse = await fetch(`${apiBaseUrl}/api/v1/children`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'web',
          ...getCsrfHeader(),
        },
        credentials: 'include',
        body: JSON.stringify(childPayload),
      });

      if (!childResponse.ok) {
        throw new Error(
          await extractApiErrorMessage(
            childResponse,
            'Account created, but child profile setup failed. Please retry.'
          )
        );
      }
    },
    []
  );

  const handleParentComplete = useCallback(
    (data: ParentAccountFormData) => {
      setParentData(data);
      setSubmitError('');
      setDirection('forward');
      goToNextStep();
    },
    [goToNextStep]
  );

  const handleChildComplete = useCallback(
    (data: ChildProfileFormData) => {
      setChildData(data);
      setSubmitError('');
      setDirection('forward');
      goToNextStep();
    },
    [goToNextStep]
  );

  const handlePreferencesComplete = useCallback(
    async (data: PreferencesFormData) => {
      setPreferencesData(data);
      setSubmitError('');

      const parentIsComplete =
        !!parentData.email
        && !!parentData.password
        && !!parentData.confirmPassword
        && !!parentData.language
        && typeof parentData.agreedToTerms === 'boolean';

      const childIsComplete =
        !!childData.nickname
        && !!childData.birthDate
        && !!childData.educationStage
        && !!childData.avatarEmoji
        && !!childData.preferredLanguage;

      if (!parentIsComplete || !childIsComplete) {
        setSubmitError('Please complete previous steps before continuing.');
        return;
      }

      try {
        await completeRegistrationFlow(
          parentData as ParentAccountFormData,
          childData as ChildProfileFormData,
          data
        );
        setDirection('forward');
        goToNextStep();
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Registration failed. Please try again.'
        );
      }
    },
    [childData, completeRegistrationFlow, goToNextStep, parentData]
  );

  const handleBack = () => {
    setSubmitError('');
    setDirection('backward');
    goToPreviousStep();
  };

  const handleFinish = () => {
    window.location.href = '/dashboard';
  };

  const onboardingSteps = buildStepConfig(currentStepIndex);

  const containerClassName = direction === 'backward'
    ? styles.stepContainerBackward
    : styles.stepContainerForward;

  return (
    <div
      data-theme={theme}
      dir={translations.dir}
      lang={language}
    >
      <AuthLayout
        illustrationVariant="register"
        translations={translations}
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onToggleTheme={toggleTheme}
      >
        <StepIndicator steps={onboardingSteps} currentIndex={currentStepIndex} translations={translations} />
        <ProgressBar percent={progressPercent} />

        <div className={styles.stepNavigation}>
          {!isFirstStep && currentStepIndex < TOTAL_STEPS - 1 && (
            <button
              className={styles.backButton}
              onClick={handleBack}
              type="button"
              aria-label={`Go back to step ${currentStepIndex}`}
            >
              {translations.gs_back_button}
            </button>
          )}
        </div>

        <div className={containerClassName} key={currentStepIndex}>
          {currentStepIndex === 0 && (
            <StepParentAccount
              translations={translations}
              language={language}
              onComplete={handleParentComplete}
            />
          )}
          {currentStepIndex === 1 && (
            <StepChildProfile
              translations={translations}
              language={language}
              onComplete={handleChildComplete}
            />
          )}
          {currentStepIndex === 2 && (
            <StepPreferences
              translations={translations}
              onComplete={handlePreferencesComplete}
              submitError={submitError}
            />
          )}
          {currentStepIndex === 3 && (
            <StepWelcome
              translations={translations}
              parentData={parentData}
              childData={childData}
              preferencesData={preferencesData}
              onFinish={handleFinish}
            />
          )}
        </div>

        {currentStepIndex < TOTAL_STEPS - 1 && (
          <div className={styles.bottomLink}>
            <span>{translations.gs_already_have_account}</span>
            <a href="/login" className={styles.bottomLinkAnchor}>
              {translations.gs_login_link}
            </a>
          </div>
        )}
      </AuthLayout>
    </div>
  );
};

export default GetStartedPage;
