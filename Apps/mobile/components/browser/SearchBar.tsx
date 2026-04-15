import { memo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

interface SearchBarProps {
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
}

function SearchBarComponent({
  value,
  placeholder = 'Search subjects or topics',
  onChangeText,
  onClear,
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="magnify" size={20} color={Colors.placeholder} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="Search subjects and topics"
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={onClear}
          style={({ pressed }) => [styles.clearButton, pressed ? styles.clearButtonPressed : null]}
        >
          <MaterialCommunityIcons name="close-circle" size={20} color={Colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export const SearchBar = memo(SearchBarComponent);

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    paddingVertical: 0,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonPressed: {
    backgroundColor: Colors.surfaceContainer,
  },
});
