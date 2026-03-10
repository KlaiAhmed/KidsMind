import type { ThemeMode } from '../types';

export const themeTokens: Record<ThemeMode, Record<string, string>> = {
  light: {
    '--bg-primary': '#FFF8F0',
    '--bg-surface': '#FFFFFF',
    '--bg-surface-alt': '#F5F0FF',
    '--bg-surface-hover': '#FFF0E8',
    '--accent-main': '#FF6B35',
    '--accent-main-hover': '#E85520',
    '--accent-learn': '#4ECDC4',
    '--accent-fun': '#FFE66D',
    '--accent-grow': '#95E1A0',
    '--accent-safety': '#6C63FF',
    '--text-primary': '#2D2D2D',
    '--text-secondary': '#5A5A72',
    '--text-muted': '#9A9AB0',
    '--text-on-accent': '#FFFFFF',
  },
  dark: {
    '--bg-primary': '#0F0F1A',
    '--bg-surface': '#1A1A2E',
    '--bg-surface-alt': '#1E1E35',
    '--bg-surface-hover': '#252540',
    '--accent-main': '#FF8C5A',
    '--accent-main-hover': '#FF6B35',
    '--accent-learn': '#5EDDD4',
    '--accent-fun': '#FFD93D',
    '--accent-grow': '#7BD88F',
    '--accent-safety': '#8B85FF',
    '--text-primary': '#F0EBE3',
    '--text-secondary': '#B0AABF',
    '--text-muted': '#706A80',
    '--text-on-accent': '#FFFFFF',
  },
};

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', theme);
}
