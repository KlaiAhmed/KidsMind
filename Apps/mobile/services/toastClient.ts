import type { ComponentType } from 'react';

type ToastPosition = 'top' | 'bottom';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastViewProps {
  icon?: string | null;
}

interface ToastPayload {
  type: ToastVariant;
  text1: string;
  text2?: string;
  visibilityTime?: number;
  autoHide?: boolean;
  position?: ToastPosition;
  icon?: string | null;
}

interface ToastShowPayload {
  type: ToastVariant;
  text1: string;
  text2?: string;
  visibilityTime?: number;
  autoHide?: boolean;
  position?: ToastPosition;
  props?: ToastViewProps;
}

interface ToastHostProps {
  config?: unknown;
  position?: ToastPosition;
  topOffset?: number;
  visibilityTime?: number;
  autoHide?: boolean;
  swipeable?: boolean;
}

type ToastModuleType = ComponentType<ToastHostProps> & {
  show: (payload: ToastShowPayload) => void;
  hide: () => void;
};

const ToastModule = require('react-native-toast-message').default as ToastModuleType;

export const ToastHost = ToastModule as ComponentType<ToastHostProps>;

export function showToast(payload: ToastPayload): void {
  ToastModule.show({
    type: payload.type,
    text1: payload.text1,
    text2: payload.text2,
    visibilityTime: payload.visibilityTime,
    autoHide: payload.autoHide,
    position: payload.position,
    props: {
      icon: payload.icon,
    },
  });
}

export function hideToast(): void {
  ToastModule.hide();
}
