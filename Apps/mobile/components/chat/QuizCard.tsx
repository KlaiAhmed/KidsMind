import { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';
import { Colors, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { QuizQuestionCard } from '@/components/chat/QuizQuestionCard';
import type { ChatQuizQuestion, QuizState, QuizSummary } from '@/types/chat';

interface QuizCardProps {
  quizId: string;
  intro: string;
  questions: ChatQuizQuestion[];
  state: QuizState;
  summary?: QuizSummary;
  error?: string;
  subject?: string;
  topic?: string;
  requestedAt?: string;
  onAnswer: (questionId: number, answer: string) => void;
  onSubmit: (quizId: string) => void;
  onRetrySubmit: (quizId: string) => void;
  onTryAnother: (topic?: string) => void;
}

const LOADING_STILL_WORKING_SECONDS = 30;

function getLoadingStartedAt(requestedAt?: string): number {
  if (!requestedAt) {
    return Date.now();
  }

  const parsed = new Date(requestedAt).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function useLoadingSeconds(state: QuizState, requestedAt?: string): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state !== 'loading') {
      return;
    }

    setNow(Date.now());
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [state]);

  return Math.max(0, Math.floor((now - getLoadingStartedAt(requestedAt)) / 1000));
}

function buildStateLabel(state: QuizState): string {
  if (state === 'loading') return 'Loading';
  if (state === 'ready') return 'Ready';
  if (state === 'answering') return 'Answering';
  if (state === 'submitting') return 'Submitting';
  if (state === 'results') return 'Results';
  return 'Needs attention';
}

function SummaryMetric({
  label,
  value,
  tone = 'primary',
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'success';
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tone === 'success' ? styles.metricSuccess : null]}>{value}</Text>
    </View>
  );
}

function QuizCardComponent({
  quizId,
  intro,
  questions,
  state,
  summary,
  error,
  subject,
  topic,
  requestedAt,
  onAnswer,
  onSubmit,
  onRetrySubmit,
  onTryAnother,
}: QuizCardProps) {
  const loadingSeconds = useLoadingSeconds(state, requestedAt);
  const answeredCount = useMemo(
    () => questions.filter((question) => Boolean(question.userAnswer?.trim())).length,
    [questions],
  );
  const totalQuestions = questions.length;
  const remainingCount = Math.max(0, totalQuestions - answeredCount);
  const hasAllAnswers = totalQuestions > 0 && remainingCount === 0;
  const isLoading = state === 'loading';
  const isSubmitting = state === 'submitting';
  const isResults = state === 'results';
  const isError = state === 'error';
  const isGenerationError = isError && totalQuestions === 0;
  const isSubmissionError = isError && totalQuestions > 0;
  const canSubmit = !isLoading && !isSubmitting && !isResults && !isError && hasAllAnswers;
  const questionDisabled = isLoading || isSubmitting || isResults || isGenerationError;
  const progressWidth = (totalQuestions > 0 ? `${Math.round((answeredCount / totalQuestions) * 100)}%` : '0%') as DimensionValue;
  const loadingText =
    loadingSeconds >= LOADING_STILL_WORKING_SECONDS
      ? 'Still working...'
      : 'Generating quiz...';

  return (
    <Animated.View
      entering={FadeIn.duration(180)
        .easing(Easing.out(Easing.ease))
        .withInitialValues({ opacity: 0, transform: [{ scale: 0.98 }] })}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>{subject ?? 'Practice'}</Text>
          <Text style={styles.title}>{topic ?? 'Quiz'}</Text>
        </View>
        <View style={[styles.statePill, isError ? styles.statePillError : null]}>
          <Text style={[styles.statePillText, isError ? styles.statePillErrorText : null]}>
            {buildStateLabel(state)}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingPanel}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <View style={styles.loadingTextGroup}>
            <Text style={styles.loadingTitle}>{loadingText}</Text>
            <Text style={styles.loadingBody}>
              {loadingSeconds >= LOADING_STILL_WORKING_SECONDS
                ? 'The quiz can take up to two minutes. I will keep this card updated.'
                : 'Preparing the questions and answer choices.'}
            </Text>
          </View>
        </View>
      ) : null}

      {!isLoading && intro.trim().length > 0 ? (
        <Text style={styles.introText}>{intro}</Text>
      ) : null}

      {!isLoading && totalQuestions === 0 ? (
        <View style={[styles.noticePanel, styles.errorPanel]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={Colors.errorText} />
          <View style={styles.noticeTextGroup}>
            <Text style={styles.errorTitle}>Quiz unavailable</Text>
            <Text style={styles.errorText}>{error ?? 'This quiz did not include any questions.'}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry quiz generation"
            onPress={() => onTryAnother(topic)}
            style={({ pressed }) => [styles.secondaryButton, pressed ? styles.buttonPressed : null]}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={Colors.primary} />
            <Text style={styles.secondaryButtonText}>Retry quiz</Text>
          </Pressable>
        </View>
      ) : null}

      {totalQuestions > 0 ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressCount}>
              {answeredCount}/{totalQuestions}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>
      ) : null}

      {totalQuestions > 0 ? (
        <View style={styles.questions}>
          {questions.map((question, index) => (
            <QuizQuestionCard
              key={question.id}
              question={question}
              questionIndex={index}
              totalQuestions={totalQuestions}
              disabled={questionDisabled}
              onAnswer={onAnswer}
            />
          ))}
        </View>
      ) : null}

      {totalQuestions > 0 && !isResults ? (
        <View style={styles.actionBlock}>
          {isSubmissionError ? (
            <View style={[styles.noticePanel, styles.errorPanel]}>
              <MaterialCommunityIcons name="wifi-alert" size={20} color={Colors.errorText} />
              <View style={styles.noticeTextGroup}>
                <Text style={styles.errorTitle}>Submission failed</Text>
                <Text style={styles.errorText}>
                  {error ?? 'Could not submit the quiz. Your answers are saved for retry.'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.helperText}>
              {hasAllAnswers ? 'All answers are ready.' : `Answer ${remainingCount} more before submitting.`}
            </Text>
          )}

          <View style={styles.buttonRow}>
            {isSubmissionError ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry quiz submission"
                onPress={() => onRetrySubmit(quizId)}
                style={({ pressed }) => [styles.primaryButton, pressed ? styles.buttonPressed : null]}
              >
                <MaterialCommunityIcons name="refresh" size={18} color={Colors.white} />
                <Text style={styles.primaryButtonText}>Retry submission</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Submit quiz answers"
                accessibilityState={{ disabled: !canSubmit }}
                disabled={!canSubmit}
                onPress={() => onSubmit(quizId)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  !canSubmit ? styles.primaryButtonDisabled : null,
                  pressed && canSubmit ? styles.buttonPressed : null,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <MaterialCommunityIcons name="send-check" size={18} color={Colors.white} />
                )}
                <Text style={styles.primaryButtonText}>
                  {isSubmitting ? 'Submitting...' : 'Submit answers'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}

      {isResults && summary ? (
        <View style={styles.resultsBlock}>
          <View style={styles.resultHeader}>
            <View>
              <Text style={styles.resultsTitle}>Results</Text>
              <Text style={styles.resultsSubtitle}>
                {summary.correctCount}/{summary.totalQuestions} correct
              </Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>{Math.round(summary.scorePercentage)}%</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <SummaryMetric label="XP earned" value={`+${summary.xpEarned}`} tone="success" />
            <SummaryMetric label="Bonus" value={`+${summary.bonusXp}`} />
            <SummaryMetric label="Total XP" value={`${summary.totalXp}`} />
            <SummaryMetric label="Streak" value={`${summary.streakMultiplier}x`} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try another quiz"
            onPress={() => onTryAnother(topic)}
            style={({ pressed }) => [styles.secondaryButton, styles.tryAnotherButton, pressed ? styles.buttonPressed : null]}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={Colors.primary} />
            <Text style={styles.secondaryButtonText}>Try another quiz</Text>
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  );
}

export const QuizCard = memo(QuizCardComponent);

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
  },
  eyebrow: {
    ...Typography.label,
    color: Colors.primary,
  },
  title: {
    ...Typography.title,
    color: Colors.text,
  },
  statePill: {
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statePillError: {
    backgroundColor: Colors.errorContainer,
  },
  statePillText: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  statePillErrorText: {
    color: Colors.errorText,
  },
  loadingPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.md,
  },
  loadingTextGroup: {
    flex: 1,
    gap: Spacing.xs,
  },
  loadingTitle: {
    ...Typography.bodySemiBold,
    color: Colors.text,
  },
  loadingBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  introText: {
    ...Typography.body,
    color: Colors.text,
  },
  progressBlock: {
    gap: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  progressCount: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.full,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  questions: {
    gap: Spacing.md,
  },
  actionBlock: {
    gap: Spacing.sm,
  },
  helperText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  primaryButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  primaryButtonText: {
    ...Typography.bodySemiBold,
    color: Colors.white,
    fontSize: 14,
  },
  secondaryButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.md,
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  secondaryButtonText: {
    ...Typography.bodySemiBold,
    color: Colors.primary,
    fontSize: 14,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  noticePanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  noticeTextGroup: {
    flex: 1,
    gap: Spacing.xs,
  },
  errorPanel: {
    backgroundColor: Colors.errorContainer,
  },
  errorTitle: {
    ...Typography.captionMedium,
    color: Colors.errorText,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.errorText,
  },
  resultsBlock: {
    gap: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  resultsTitle: {
    ...Typography.title,
    color: Colors.text,
  },
  resultsSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  scoreBadge: {
    minWidth: 56,
    alignItems: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  scoreBadgeText: {
    ...Typography.bodySemiBold,
    color: Colors.white,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metric: {
    minWidth: 112,
    flex: 1,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  metricValue: {
    ...Typography.bodySemiBold,
    color: Colors.primary,
  },
  metricSuccess: {
    color: Colors.success,
  },
  tryAnotherButton: {
    alignSelf: 'flex-start',
  },
});
