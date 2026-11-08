import React, { createContext, useContext, useState, useEffect } from 'react';

export type LangMode = 'zh' | 'en';
export type FontScale = 'md' | 'lg' | 'xl';
export type ViewMode = 'auto' | 'desktop' | 'mobile';

interface PrefsContextType {
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

  const [autoMobile, setAutoMobile] = useState<boolean>(detectMobileViewport);

  useEffect(() => {
    const onResize = () => setAutoMobile(detectMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ lang, fontScale, viewMode })); } catch {}
    const root = document.documentElement;
    root.setAttribute('data-font-scale', fontScale);
    root.lang = lang === 'en' ? 'en' : 'zh-Hant-HK';
  }, [lang, fontScale, viewMode]);

  const toggleLang = () => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'));
  const tx = (zhHkMixed: string, en: string) => (lang === 'en' ? en : zhHkMixed);
  const isMobileApp = viewMode === 'mobile' || (viewMode === 'auto' && autoMobile);

  return (
    <PrefsContext.Provider value={{ lang, setLang, toggleLang, fontScale, setFontScale, viewMode, setViewMode, isMobileApp, tx }}>
      {children}
    </PrefsContext.Provider>
  );
};

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider');
  return ctx;
}
