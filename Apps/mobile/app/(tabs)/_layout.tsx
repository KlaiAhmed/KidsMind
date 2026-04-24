import { Redirect, Tabs, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavContainer } from '@/components/navigation/BottomNavContainer';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';

export default function TabLayout() {
  const { isLoading, isAuthenticated, childProfileStatus, childProfile } = useAuth();
  const router = useRouter();

  if (isLoading || (isAuthenticated && childProfileStatus === 'unknown')) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/splash" />;
  }

  if (childProfileStatus === 'missing' && !childProfile) {
    return (
      <SafeAreaView style={styles.emptySafeArea} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="account-child-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No child profile yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a child profile to start tracking progress and managing learning preferences.
          </Text>
          <Pressable
            style={styles.emptyCta}
            onPress={() => { router.push('/(auth)/child-profile-wizard?source=parent-dashboard' as never); }}
            accessibilityRole="button"
            accessibilityLabel="Set up child profile"
          >
            <Text style={styles.emptyCtaText}>Set up child profile</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Tabs
      tabBar={(props) => (
        <BottomNavContainer
          {...props}
          mode="parent"
          ageGroup={childProfile?.ageGroup}
        />
      )}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneContainerStyle: {
          backgroundColor: Colors.surface,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'History',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Progress',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Controls',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  emptySafeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.title,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  emptyCta: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radii.lg,
  },
  emptyCtaText: {
    ...Typography.body,
    color: Colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
});
