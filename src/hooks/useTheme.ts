import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';

export type ThemeOption = 'dark' | 'light' | 'system';

const getSystemTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (resolved: 'dark' | 'light') => {
  const html = document.documentElement;
  html.setAttribute('data-theme-transitioning', '');
  html.setAttribute('data-theme', resolved);
  // Remove transition class after animation completes
  setTimeout(() => html.removeAttribute('data-theme-transitioning'), 350);
};

export function useTheme() {
  const theme = useChatStore(state => state.settings.theme);

  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    applyTheme(resolved);

    // Watch system preference changes when theme is 'system'
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  return {
    theme,
    resolvedTheme: theme === 'system' ? getSystemTheme() : theme,
  };
}
