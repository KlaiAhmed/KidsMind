import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthLayout() {
  const { isLoading, isAuthenticated, childProfileStatus, user } = useAuth();
  const segments = useSegments();

  if (
    isLoading ||
    (isAuthenticated && childProfileStatus === 'unknown')
  ) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const inSetupPin = segments[1] === 'setup-pin';
  const inChildProfileWizard = segments[1] === 'child-profile-wizard';
  const hasPinConfigured = Boolean(user?.pinConfigured);

  if (isAuthenticated) {
    if (!hasPinConfigured && !inSetupPin) {
      return <Redirect href="/(auth)/setup-pin" />;
    }

    if (hasPinConfigured && !inChildProfileWizard && !inSetupPin) {
      return <Redirect href="/(tabs)" />;
    }
  }

  return (
    <View style={styles.stackContainer}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 280,
          contentStyle: { backgroundColor: Colors.surface },
        }}
      >
        <Stack.Screen
          name="setup-pin"
          options={{
            contentStyle: { backgroundColor: Colors.surface },
          }}
        />
        <Stack.Screen
          name="child-profile-wizard"
          options={{
            contentStyle: { backgroundColor: Colors.surface },
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: Colors.surface },
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: Colors.surface },
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  stackContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
});
