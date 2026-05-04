import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Colors, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import type { ChatQuizQuestion } from '@/types/chat';

interface QuizQuestionCardProps {
  question: ChatQuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  disabled?: boolean;
  onAnswer: (questionId: number, answer: string) => void;
}

type OptionState = 'idle' | 'selected' | 'pending' | 'selected_correct' | 'selected_wrong' | 'revealed_correct';

function normalizeDisplayAnswer(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function getOptionState(option: string, question: ChatQuizQuestion): OptionState {
  if (!question.userAnswer) return 'idle';

  const isSelected = option === question.userAnswer;
  const isCorrectAnswer = normalizeDisplayAnswer(option) === normalizeDisplayAnswer(question.correctAnswer);

  if (question.status === 'pending' && isSelected) return 'pending';
  if (question.status === 'correct' && isSelected) return 'selected_correct';
  if (question.status === 'incorrect' && isSelected) return 'selected_wrong';
  if (question.status === 'incorrect' && isCorrectAnswer) return 'revealed_correct';
  if (isSelected) return 'selected';
  return 'idle';
}

function OptionButton({
  label,
  state,
  disabled,
  onPress,
}: {
  label: string;
  state: OptionState;
  disabled: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    if (disabled) return;

    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    onPress();
  }, [disabled, onPress, scale]);

  const backgroundColor =
    state === 'selected_correct'
      ? Colors.success
      : state === 'selected_wrong'
        ? Colors.error
        : state === 'revealed_correct'
          ? Colors.success
          : state === 'selected' || state === 'pending'
            ? Colors.primaryFixed
            : Colors.surfaceContainerLowest;

  const borderColor =
    state === 'selected_correct'
      ? Colors.success
      : state === 'selected_wrong'
        ? Colors.error
        : state === 'revealed_correct'
          ? Colors.success
          : state === 'selected' || state === 'pending'
            ? Colors.primary
            : Colors.outlineVariant;

  const textColor =
    state === 'selected_correct' || state === 'selected_wrong' || state === 'revealed_correct'
      ? Colors.white
      : Colors.text;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, selected: state !== 'idle' }}
        disabled={disabled}
        onPress={handlePress}
        style={[styles.optionButton, { backgroundColor, borderColor }]}
      >
        <View style={styles.optionContent}>
          <Text style={[styles.optionText, { color: textColor }]} numberOfLines={3}>
            {label}
          </Text>
          {state === 'pending' ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : state === 'selected_correct' || state === 'revealed_correct' ? (
            <MaterialCommunityIcons name="check-circle" size={20} color={Colors.white} />
          ) : state === 'selected_wrong' ? (
            <MaterialCommunityIcons name="close-circle" size={20} color={Colors.white} />
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function ShortAnswerSection({
  isLocked,
  isPending,
  isCorrect,
  selectedAnswer,
  correctAnswer,
  onSubmit,
}: {
  isLocked: boolean;
  isPending: boolean;
  isCorrect: boolean | undefined;
  selectedAnswer: string | null;
  correctAnswer?: string;
  onSubmit: (answer: string) => void;
}) {
  const [textInput, setTextInput] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = textInput.trim();
    if (!trimmed || isLocked) return;
    onSubmit(trimmed);
  }, [textInput, isLocked, onSubmit]);

  if (!isLocked) {
    return (
      <View style={styles.shortAnswerInputRow}>
        <TextInput
          style={styles.shortAnswerInput}
          placeholder="Type your answer..."
          placeholderTextColor={Colors.placeholder}
          value={textInput}
          onChangeText={setTextInput}
          editable={!isLocked}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          accessibilityLabel="Type your answer"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Submit answer"
          disabled={!textInput.trim() || isLocked}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.shortAnswerSubmitButton,
            (!textInput.trim() || isLocked) && styles.shortAnswerSubmitDisabled,
            pressed && styles.optionPressed,
          ]}
        >
          <MaterialCommunityIcons name="send" size={18} color={Colors.white} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.shortAnswerFeedback}>
      <View style={styles.shortAnswerResultRow}>
        <Text style={styles.shortAnswerLabel}>Your answer: </Text>
        <Text
          style={[
            styles.shortAnswerValue,
            isCorrect === true ? styles.shortAnswerCorrect : isCorrect === false ? styles.shortAnswerWrong : null,
          ]}
        >
          {selectedAnswer}
        </Text>
        {isPending ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
        {isCorrect === true ? (
          <MaterialCommunityIcons name="check-circle" size={18} color={Colors.success} />
        ) : isCorrect === false ? (
          <MaterialCommunityIcons name="close-circle" size={18} color={Colors.error} />
        ) : null}
      </View>
      {isCorrect === false && correctAnswer ? (
        <View style={styles.shortAnswerResultRow}>
          <Text style={styles.shortAnswerLabel}>Correct answer: </Text>
          <Text style={[styles.shortAnswerValue, styles.shortAnswerCorrect]}>
            {correctAnswer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function FeedbackSection({
  isCorrect,
  explanation,
}: {
  isCorrect: boolean;
  explanation: string;
}) {
  const scale = useSharedValue(0.97);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(180).easing(Easing.out(Easing.ease))}
      onLayout={() => {
        scale.value = withSpring(1.03, { damping: 12, stiffness: 300 }, () => {
          scale.value = withSpring(1, { damping: 15, stiffness: 200 });
        });
      }}
      style={animatedStyle}
    >
      <View
        style={[
          styles.feedbackContainer,
          isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect,
        ]}
      >
        <View style={styles.feedbackHeader}>
          <Text style={[styles.feedbackResultText, isCorrect ? styles.textCorrect : styles.textWrong]}>
            {isCorrect ? 'Correct!' : 'Not quite!'}
          </Text>
        </View>
        {explanation ? <Text style={styles.explanationText}>{explanation}</Text> : null}
      </View>
    </Animated.View>
  );
}

function QuizQuestionCardComponent({
  question,
  questionIndex,
  totalQuestions,
  disabled = false,
  onAnswer,
}: QuizQuestionCardProps) {
  const selectedAnswer = question.userAnswer ?? null;
  const isPending = question.status === 'pending';
  const hasServerResult = question.status === 'correct' || question.status === 'incorrect';
  const isLocked = Boolean(selectedAnswer) || disabled || isPending || hasServerResult;
  const isCorrect = hasServerResult ? Boolean(question.isCorrect) : undefined;

  const handleOptionPress = useCallback(
    (option: string) => {
      if (isLocked) return;

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      onAnswer(question.id, option);
    },
    [isLocked, onAnswer, question.id],
  );

  const handleShortAnswer = useCallback(
    (answer: string) => {
      if (isLocked) return;

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      onAnswer(question.id, answer);
    },
    [isLocked, onAnswer, question.id],
  );

  const isShortAnswer = question.type === 'short_answer';
  const options = question.type === 'true_false'
    ? ['True', 'False']
    : question.options ?? [];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.questionCounter}>
          Question {questionIndex + 1} of {totalQuestions}
        </Text>
        <View style={styles.typePill}>
          <MaterialCommunityIcons
            name={question.type === 'mcq' ? 'format-list-bulleted' : question.type === 'true_false' ? 'toggle-switch' : 'form-textbox'}
            size={12}
            color={Colors.primary}
          />
          <Text style={styles.typePillText}>
            {question.type === 'mcq' ? 'Multiple Choice' : question.type === 'true_false' ? 'True or False' : 'Short Answer'}
          </Text>
        </View>
      </View>

      <Text style={styles.promptText}>{question.prompt}</Text>

      {isShortAnswer ? (
        <ShortAnswerSection
          isLocked={isLocked}
          isPending={isPending}
          isCorrect={isCorrect}
          selectedAnswer={selectedAnswer}
          correctAnswer={question.correctAnswer}
          onSubmit={handleShortAnswer}
        />
      ) : (
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <OptionButton
              key={option}
              label={option}
              state={getOptionState(option, question)}
              disabled={isLocked}
              onPress={() => handleOptionPress(option)}
            />
          ))}
        </View>
      )}

      {isPending ? (
        <View style={styles.pendingRow}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.pendingText}>Waiting for server</Text>
        </View>
      ) : null}

      {hasServerResult && isCorrect !== undefined ? (
        <FeedbackSection
          isCorrect={isCorrect}
          explanation={question.explanation ?? ''}
        />
      ) : null}
    </View>
  );
}

export const QuizQuestionCard = memo(QuizQuestionCardComponent);

const Sizing_minTapTarget = 44;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    ...Shadows.card,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionCounter: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  typePillText: {
    ...Typography.label,
    color: Colors.primary,
    fontSize: 10,
  },
  promptText: {
    ...Typography.bodySemiBold,
    color: Colors.text,
    fontSize: 17,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: Spacing.sm,
  },
  optionButton: {
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: Sizing_minTapTarget,
    justifyContent: 'center',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  optionText: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  optionPressed: {
    transform: [{ scale: 0.96 }],
  },
  shortAnswerInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  shortAnswerInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  shortAnswerSubmitButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortAnswerSubmitDisabled: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  shortAnswerFeedback: {
    gap: Spacing.xs,
  },
  shortAnswerResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  shortAnswerLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  shortAnswerValue: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  shortAnswerCorrect: {
    color: Colors.success,
  },
  shortAnswerWrong: {
    color: Colors.error,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  pendingText: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  feedbackContainer: {
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  feedbackCorrect: {
    backgroundColor: Colors.success + '15',
  },
  feedbackIncorrect: {
    backgroundColor: Colors.errorContainer,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedbackResultText: {
    ...Typography.bodySemiBold,
  },
  textCorrect: {
    color: Colors.success,
  },
  textWrong: {
    color: Colors.error,
  },
  explanationText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
