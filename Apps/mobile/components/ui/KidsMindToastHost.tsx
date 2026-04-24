import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KidsMindToastCard } from '@/components/ui/KidsMindToastCard';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ToastHost } from '@/services/toastClient';

interface ToastConfigParams {
  isVisible: boolean;
  text1?: string;
  text2?: string;
  props?: {
    icon?: string | null;
  };
}

function createToastConfig(colorScheme: 'light' | 'dark') {
  const successToast = ({ isVisible, text1, text2, props }: ToastConfigParams) => (
    <KidsMindToastCard
      colorScheme={colorScheme}
      iconName={props?.icon}
      isVisible={isVisible}
      message={text2}
      title={text1 ?? 'Success'}
      variant="success"
    />
  );

  const errorToast = ({ isVisible, text1, text2, props }: ToastConfigParams) => (
    <KidsMindToastCard
      colorScheme={colorScheme}
      iconName={props?.icon}
      isVisible={isVisible}
      message={text2}
      title={text1 ?? 'Something went wrong'}
      variant="error"
    />
  );

  const warningToast = ({ isVisible, text1, text2, props }: ToastConfigParams) => (
    <KidsMindToastCard
      colorScheme={colorScheme}
      iconName={props?.icon}
      isVisible={isVisible}
      message={text2}
      title={text1 ?? 'Heads up'}
      variant="warning"
    />
  );

  const infoToast = ({ isVisible, text1, text2, props }: ToastConfigParams) => (
    <KidsMindToastCard
      colorScheme={colorScheme}
      iconName={props?.icon}
      isVisible={isVisible}
      message={text2}
      title={text1 ?? 'Update'}
      variant="info"
    />
  );

  return {
    success: successToast,
    error: errorToast,
    warning: warningToast,
    info: infoToast,
  };
}

export function KidsMindToastHost() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const config = useMemo(() => createToastConfig(colorScheme), [colorScheme]);

  return (
    <ToastHost
      autoHide
      config={config}
      position="top"
      swipeable
      topOffset={insets.top + Spacing.sm}
      visibilityTime={3200}
    />
  );
}