import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

const THINKING_PHRASES = [
  'Thinking',
  'Looking it up',
  'Cooking up an answer',
  'Almost there',
  'Great question!',
  'Let me think',
  'Searching my brain',
  'Qubie is on it!',
  'Hmm, interesting',
  'Loading magic',
  'Connecting dots',
  'Cooking',
  'Big brain time',
  'Locking in',
  'Trusting the process',
  'Qubing it up',
  'Understood the assignment',
  'On it',
  'Interesting',
  'Challenge accepted',
  'Ooh good one',
  'Let me see',
  'Hmmmm',
  'Qubie is Qubing',
  'Computing',
  'Say less',
];

const DOT_FRAMES = ['.', '..', '...'];
const DOT_INTERVAL = 400;

function AnimatedDots() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % DOT_FRAMES.length);
    }, DOT_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return <Text style={styles.dots}>{DOT_FRAMES[frame]}</Text>;
}

export function ThinkingIndicator() {
  const [phrase] = useState(
    () => THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]
  );

  return (
    <View
      accessibilityLabel="Qubie is thinking"
      accessibilityRole="text"
      style={styles.container}
    >
      <View style={styles.row}>
        <Text style={styles.phrase}>{phrase}</Text>
        <AnimatedDots />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  phrase: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  dots: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    width: 18,
  },
});