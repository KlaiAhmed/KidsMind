import { Redirect, Tabs, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { ChildBottomNavContainer } from '@/components/navigation/ChildBottomNavContainer';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function ChildTabLayout() {
  const {
    isLoading,
    isAuthenticated,
    childProfileStatus,
    childProfile,
    selectChild,
  } = useAuth();

  const params = useLocalSearchParams<{ childId?: string }>();
  const routeChildId = typeof params.childId === 'string' ? params.childId.trim() : '';

  useEffect(() => {
    if (!routeChildId) {
      return;
    }

    selectChild(routeChildId);
  }, [routeChildId, selectChild]);

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
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Tabs
      backBehavior="none"
      screenOptions={{
        headerShown: false,
        // SECURITY: Disable iOS swipe-back gesture to prevent navigation out of child space
        gestureEnabled: false,
        gestureDirection: 'horizontal',
        animation: Platform.select({
          ios: 'fade',
          android: 'fade',
        }),
        tabBarHideOnKeyboard: true,
        sceneContainerStyle: {
          backgroundColor: Colors.surface,
        },
      }}
      tabBar={(props) => (
        <ChildBottomNavContainer
          {...props}
          childId={childProfile?.id ?? null}
          ageGroup={childProfile?.ageGroup}
          voiceEnabled={Boolean(childProfile?.rules?.voiceModeEnabled)}
        />
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          // SECURITY: Disable gestures for all child screens
          gestureEnabled: false,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Learn',
          gestureEnabled: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          gestureEnabled: false,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Qubie',
          gestureEnabled: false,
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
});
