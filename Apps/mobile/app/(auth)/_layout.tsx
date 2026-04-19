import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthLayout() {
  const { isLoading, isAuthenticated, childProfile } = useAuth();
  const segments = useSegments();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const inChildProfileWizard = segments[1] === 'child-profile-wizard';

  if (isAuthenticated && !inChildProfileWizard) {
    if (!childProfile) {
      return <Redirect href="/(auth)/child-profile-wizard" />;
    }

    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
});
