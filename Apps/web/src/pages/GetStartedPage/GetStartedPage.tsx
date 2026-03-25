/** GetStartedPage — Multi-step onboarding flow for new parent registration with 4 steps. */
import { useState, useCallback } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useMultiStep } from '../../hooks/useMultiStep';
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

  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const handleParentComplete = useCallback(
    (data: ParentAccountFormData) => {
      setParentData(data);
      setDirection('forward');
      goToNextStep();
    },
    [goToNextStep]
  );

  const handleChildComplete = useCallback(
    (data: ChildProfileFormData) => {
      setChildData(data);
      setDirection('forward');
      goToNextStep();
    },
    [goToNextStep]
  );

  const handlePreferencesComplete = useCallback(
    (data: PreferencesFormData) => {
      setPreferencesData(data);
      setDirection('forward');
      goToNextStep();
    },
    [goToNextStep]
  );

  const handleBack = () => {
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
