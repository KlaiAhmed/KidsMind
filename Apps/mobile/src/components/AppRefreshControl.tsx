import { RefreshControl, type RefreshControlProps } from 'react-native';

import { Colors } from '@/constants/theme';

interface AppRefreshControlProps extends Omit<RefreshControlProps, 'colors' | 'tintColor'> {
  refreshing: boolean;
  onRefresh: () => void;
  progressViewOffset?: number;
}

const DEFAULT_PROGRESS_VIEW_OFFSET = 50;

export function AppRefreshControl({
  refreshing,
  onRefresh,
  progressViewOffset = DEFAULT_PROGRESS_VIEW_OFFSET,
  ...rest
}: AppRefreshControlProps) {
  return (
    <RefreshControl
      {...rest}
      colors={[Colors.primary]}
      onRefresh={onRefresh}
      progressViewOffset={progressViewOffset}
      refreshing={refreshing}
      tintColor={Colors.primary}
    />
  );
}
