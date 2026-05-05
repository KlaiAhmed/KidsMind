import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppRefreshControl } from '@/src/components/AppRefreshControl';
import {
  AuditLogRow,
  getAuditLogDescription,
  getAuditLogKey,
  type AuditLogEntry,
} from '@/src/components/parent/AuditLogRow';
import {
  ErrorCard,
  ParentDashboardEmptyState,
  ParentDashboardErrorState,
  SkeletonBlock,
} from '@/src/components/parent/ParentDashboardStates';
import { ParentChildSwitcher } from '@/src/components/parent/ParentChildSwitcher';
import { useParentDashboardChild } from '@/src/hooks/useParentDashboardChild';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { getControlAudit } from '@/services/parentDashboardService';

function AuditLogsSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: 5 }).map((_, index) => (
        <SkeletonBlock key={index} style={styles.skeletonRow} />
      ))}
    </View>
  );
}

export default function AuditLogsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ childId?: string }>();
  const { user, childDataLoading, childProfileStatus } = useAuth();
  const { children, activeChild, selectedChildId, selectChild, getChildAvatarSource } = useParentDashboardChild(
    typeof params.childId === 'string' ? params.childId : undefined,
  );

  const [searchValue, setSearchValue] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const isChildDataResolving = childProfileStatus === 'unknown' || (childDataLoading && children.length === 0);

  const auditQuery = useQuery({
    queryKey: ['parent-dashboard', 'audit-log', user?.id, activeChild?.id],
    queryFn: async () => getControlAudit(user!.id, { childId: activeChild!.id }),
    enabled: Boolean(user?.id && activeChild?.id),
    staleTime: 5 * 60 * 1000,
  });

  const auditEntries = useMemo(() => auditQuery.data ?? [], [auditQuery.data]);
  const actionOptions = useMemo(
    () => Array.from(new Set(auditEntries.map((entry) => entry.action))).sort((left, right) => left.localeCompare(right)),
    [auditEntries],
  );
  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return auditEntries.filter((entry) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        getAuditLogDescription(entry).toLowerCase().includes(normalizedSearch) ||
        entry.action.toLowerCase().includes(normalizedSearch);
      const matchesAction = selectedActions.length === 0 || selectedActions.includes(entry.action);

      return matchesSearch && matchesAction;
    });
  }, [auditEntries, searchValue, selectedActions]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['parent-dashboard', 'audit-log', user?.id, activeChild?.id],
    });
  }, [queryClient, user?.id, activeChild?.id]);

  function handleAddChild() {
    void router.push('/(auth)/child-profile-wizard?source=parent-dashboard' as never);
  }

  function handleChildSelect(childId: string) {
    setSearchValue('');
    setSelectedActions([]);
    selectChild(childId);
  }

  function toggleAction(action: string) {
    setSelectedActions((current) =>
      current.includes(action) ? current.filter((entry) => entry !== action) : [...current, action],
    );
  }

  if (isChildDataResolving) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.contentContainer}>
          <SkeletonBlock style={styles.headerSkeleton} />
          <SkeletonBlock style={styles.switcherSkeleton} />
          <SkeletonBlock style={styles.searchSkeleton} />
          <AuditLogsSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (!children.length) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <ParentDashboardEmptyState
          actionLabel="Add Child"
          iconName="account-child-circle"
          onAction={handleAddChild}
          subtitle="Add your first child to get started."
          title="Your parent dashboard is ready."
        />
      </SafeAreaView>
    );
  }

  if (!activeChild) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <ParentDashboardErrorState
          message="Try switching to another profile or refresh the activity log."
          onRetry={handleRefresh}
          title="We couldn't load this child"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.contentContainer}
        data={auditQuery.isPending ? [] : filteredEntries}
        keyExtractor={(entry: AuditLogEntry, index) => getAuditLogKey(entry, index)}
        ListEmptyComponent={
          auditQuery.isPending ? (
            <AuditLogsSkeleton />
          ) : auditQuery.isError ? (
            <ErrorCard
              error={auditQuery.error}
              onRetry={() => {
                void auditQuery.refetch();
              }}
              title="Activity log unavailable"
            />
          ) : (
            <Text style={styles.emptyText}>No activity logs found.</Text>
          )
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.screenHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
              >
                <MaterialCommunityIcons color={Colors.text} name="arrow-left" size={22} />
              </Pressable>
              <View style={styles.headerCopy}>
                <Text style={styles.screenTitle}>Activity Log</Text>
                <Text style={styles.screenSubtitle}>{activeChild.nickname ?? activeChild.name}</Text>
              </View>
            </View>

            <ParentChildSwitcher
              activeChildId={selectedChildId}
              profiles={children}
              getAvatarSource={getChildAvatarSource}
              onAddChild={children.length < 5 ? handleAddChild : undefined}
              onSelectChild={handleChildSelect}
            />

            <View style={styles.searchFilterRow}>
              <View style={styles.searchShell}>
                <MaterialCommunityIcons color={Colors.placeholder} name="magnify" size={20} />
                <TextInput
                  accessibilityLabel="Search activity logs"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setSearchValue}
                  placeholder="Search activity..."
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="search"
                  style={styles.searchInput}
                  value={searchValue}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter activity by action"
                onPress={() => setFilterModalVisible(true)}
                style={({ pressed }) => [
                  styles.filterButton,
                  selectedActions.length > 0 ? styles.filterButtonActive : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <MaterialCommunityIcons
                  color={selectedActions.length > 0 ? Colors.primary : Colors.textSecondary}
                  name="filter-variant"
                  size={22}
                />
              </Pressable>
            </View>
          </View>
        }
        refreshControl={<AppRefreshControl onRefresh={handleRefresh} refreshing={auditQuery.isRefetching} />}
        renderItem={({ item }) => <AuditLogRow entry={item} />}
        ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
        transparent
        visible={filterModalVisible}
      >
        <Pressable style={styles.modalScrim} onPress={() => setFilterModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by action</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close action filters"
                onPress={() => setFilterModalVisible(false)}
                style={({ pressed }) => [styles.modalCloseButton, pressed ? styles.pressed : null]}
              >
                <MaterialCommunityIcons color={Colors.textSecondary} name="close" size={20} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalList}>
              {actionOptions.length === 0 ? (
                <Text style={styles.modalEmptyText}>No actions available.</Text>
              ) : (
                actionOptions.map((action) => {
                  const selected = selectedActions.includes(action);

                  return (
                    <Pressable
                      key={action}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`Filter ${action}`}
                      onPress={() => toggleAction(action)}
                      style={({ pressed }) => [styles.actionOption, pressed ? styles.pressed : null]}
                    >
                      <MaterialCommunityIcons
                        color={selected ? Colors.primary : Colors.textSecondary}
                        name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                      />
                      <Text style={styles.actionOptionText}>{action}</Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear action filters"
                onPress={() => setSelectedActions([])}
                style={({ pressed }) => [styles.clearButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Apply action filters"
                onPress={() => setFilterModalVisible(false)}
                style={({ pressed }) => [styles.doneButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl + Spacing.xxl,
  },
  headerContent: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  screenTitle: {
    ...Typography.headline,
    color: Colors.text,
  },
  screenSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchShell: {
    flex: 1,
    minHeight: 52,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    paddingVertical: 0,
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  rowSeparator: {
    height: Spacing.xs,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  skeletonList: {
    gap: Spacing.xs,
  },
  skeletonRow: {
    height: 52,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  headerSkeleton: {
    height: 64,
    borderRadius: Radii.xl,
    backgroundColor: Colors.surfaceContainerHigh,
    marginBottom: Spacing.md,
  },
  switcherSkeleton: {
    height: 82,
    borderRadius: Radii.xl,
    backgroundColor: Colors.surfaceContainerHigh,
    marginBottom: Spacing.md,
  },
  searchSkeleton: {
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerHigh,
    marginBottom: Spacing.md,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.32)',
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  modalCard: {
    maxHeight: '74%',
    borderRadius: Radii.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  modalTitle: {
    ...Typography.title,
    color: Colors.text,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalList: {
    gap: Spacing.xs,
  },
  modalEmptyText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  actionOption: {
    minHeight: 48,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionOptionText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  clearButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  clearButtonText: {
    ...Typography.bodySemiBold,
    color: Colors.textSecondary,
  },
  doneButton: {
    minHeight: 44,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  doneButtonText: {
    ...Typography.bodySemiBold,
    color: Colors.white,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});
