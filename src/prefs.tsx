import React, { createContext, useContext, useState, useEffect } from 'react';

export type LangMode = 'zh' | 'en';
export type FontScale = 'md' | 'lg' | 'xl';
export type ViewMode = 'auto' | 'desktop' | 'mobile';
export type ThemeMode = 'light' | 'dark' | 'system';

interface PrefsContextType {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  resolvedTheme: 'light' | 'dark';
  lang: LangMode;
  setLang: (l: LangMode) => void;
  toggleLang: () => void;
  fontScale: FontScale;
  setFontScale: (f: FontScale) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  isMobileApp: boolean;
  tx: (zhHkMixed: string, en: string) => string;
}

const PREFS_KEY = 'labtech_ui_prefs_v1';
const PrefsContext = createContext<PrefsContextType | null>(null);

function detectMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.innerWidth < 768) return true;
  return /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent) && window.innerWidth < 960;
}

export const PrefsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<LangMode>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (p.lang === 'en' || p.lang === 'zh') return p.lang;
    } catch {}
    return 'zh';
  });

  const [fontScale, setFontScale] = useState<FontScale>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (p.fontScale === 'md' || p.fontScale === 'lg' || p.fontScale === 'xl') return p.fontScale;
    } catch {}
    return 'md';
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (p.viewMode === 'desktop' || p.viewMode === 'mobile' || p.viewMode === 'auto') return p.viewMode;
    } catch {}
    return 'auto';
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (p.theme === 'light' || p.theme === 'dark' || p.theme === 'system') return p.theme;
    } catch {}
    return 'light';
  });

  const [systemDark, setSystemDark] = useState<boolean>(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );

  const [autoMobile, setAutoMobile] = useState<boolean>(detectMobileViewport);

  useEffect(() => {
    const onResize = () => setAutoMobile(detectMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  const setTheme = (t: ThemeMode) => {
    // Briefly enable colour transitions so the theme switch feels smooth instead of flashing
    const root = document.documentElement;
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 320);
    setThemeState(t);
  };

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ lang, fontScale, viewMode, theme })); } catch {}
    const root = document.documentElement;
    root.setAttribute('data-font-scale', fontScale);
    root.lang = lang === 'en' ? 'en' : 'zh-Hant-HK';
  }, [lang, fontScale, viewMode, theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.colorScheme = resolvedTheme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolvedTheme === 'dark' ? '#0a0e16' : '#ffffff');
  }, [resolvedTheme]);

  const toggleLang = () => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'));
  const tx = (zhHkMixed: string, en: string) => (lang === 'en' ? en : zhHkMixed);
  const isMobileApp = viewMode === 'mobile' || (viewMode === 'auto' && autoMobile);

  useEffect(() => {
    document.documentElement.setAttribute('data-shell', isMobileApp ? 'mobile' : 'desktop');
  }, [isMobileApp]);

  return (
    <PrefsContext.Provider value={{ theme, setTheme, resolvedTheme, lang, setLang, toggleLang, fontScale, setFontScale, viewMode, setViewMode, isMobileApp, tx }}>
      {children}
    </PrefsContext.Provider>
  );
};

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider');
  return ctx;
}
