import React, { useEffect, useRef, useState } from 'react';
import { usePrefs, ThemeMode, FontScale } from '../prefs';
import { Sun, Moon, MonitorCog, SlidersHorizontal, Smartphone, RotateCcw, Check } from 'lucide-react';

/** One-tap light/dark switch for headers. */
export const ThemeQuickToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { resolvedTheme, setTheme, tx } = usePrefs();
  const isDark = resolvedTheme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? tx('切換至淺色模式', 'Switch to Light Mode') : tx('切換至深色模式', 'Switch to Dark Mode')}
      aria-label={isDark ? 'Light mode' : 'Dark mode'}
      className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:border-brand hover:text-brand transition cursor-pointer ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
    </button>
  );
};

/** Three-way Light / Dark / System segmented control. */
export const ThemeSegmented: React.FC = () => {
  const { theme, setTheme, tx } = usePrefs();
  const opts: [ThemeMode, string, React.FC<{ className?: string }>][] = [
    ['light', tx('淺色', 'Light'), Sun],
    ['dark', tx('深色', 'Dark'), Moon],
    ['system', tx('跟隨系統', 'System'), MonitorCog],
  ];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
      {opts.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          onClick={() => setTheme(id)}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-extrabold transition cursor-pointer ${
            theme === id ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
};

export const FontScaleSegmented: React.FC = () => {
  const { fontScale, setFontScale } = usePrefs();
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
      {(['md', 'lg', 'xl'] as FontScale[]).map((s, idx) => (
        <button
          key={s}
          type="button"
          onClick={() => setFontScale(s)}
          className={`rounded-lg py-2 text-[11px] font-extrabold transition cursor-pointer ${
            fontScale === s ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {['A', 'A+', 'A++'][idx]}
        </button>
      ))}
    </div>
  );
};

/** Desktop header popover that groups display preferences, replacing several crowded header buttons. */
export const DisplaySettingsMenu: React.FC<{ onResetDemo?: () => void }> = ({ onResetDemo }) => {
  const { setViewMode, tx } = usePrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={tx('顯示設定', 'Display Settings')}
        aria-expanded={open}
        className={`inline-flex items-center justify-center rounded-xl border p-2 transition cursor-pointer ${
          open ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand'
        }`}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl space-y-3 text-xs">
          <div className="space-y-1.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{tx('外觀主題', 'Appearance')}</div>
            <ThemeSegmented />
          </div>
          <div className="space-y-1.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{tx('字體大小', 'Text Size')}</div>
            <FontScaleSegmented />
          </div>
          <div className="space-y-1 border-t border-slate-100 pt-2.5">
            <button
              type="button"
              onClick={() => { setViewMode('mobile'); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Smartphone className="h-4 w-4 text-brand" /> {tx('切換至手機版介面', 'Switch to Mobile Layout')}
            </button>
            {onResetDemo && (
              <button
                type="button"
                onClick={() => { onResetDemo(); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 text-slate-500" /> {tx('重設示範資料', 'Reset Demo Data')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 text-[10px] font-semibold text-slate-500">
            <Check className="h-3 w-3 text-emerald-600" /> {tx('設定會自動儲存於此裝置', 'Preferences are saved on this device')}
          </div>
        </div>
      )}
    </div>
  );
};
