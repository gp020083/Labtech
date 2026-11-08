import React, { useState } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { ThemeQuickToggle, ThemeSegmented, FontScaleSegmented } from '../components/ThemeToggle';
import { FieldTabId } from '../components/FieldNavShell';
import { CalcToolId } from '../pages/ToolsPage';
import { REF_TODAY } from '../utils';
import { MobileJobsView } from './MobileJobsView';
import { MobileEquipmentView } from './MobileEquipmentView';
import { MobileStpView } from './MobileStpView';
import { MobileToolsView } from './MobileToolsView';
import { MobileCalendarView } from './MobileCalendarView';
import { MobileStpSheet } from './MobileStpSheet';
import { PWAInstallButton } from '../components/PwaStatusWidgets';
import { MapPin, Wrench, FileText, Calculator, CalendarDays, Search, Cloud, Globe, Settings, Monitor, LogOut, RotateCcw, X } from 'lucide-react';

export const MobileAppShell: React.FC<{
  activeTab: FieldTabId;
  onSelect: (t: FieldTabId) => void;
  onOpenSearch: () => void;
  onOpenDriveSync: () => void;
  toolJump: { mode?: 'calc' | 'specs'; tool?: CalcToolId } | null;
  onConsumeJump: () => void;
}> = ({ activeTab, onSelect, onOpenSearch, onOpenDriveSync, toolJump, onConsumeJump }) => {
  const { user, accounts, switchAccount, logout, resetAllDemoData, jobs, equipment, tests, events, driveSyncStatus, syncNowWithDrive } = useApp();
  const { lang, toggleLang, setViewMode, tx } = usePrefs();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeJobs = jobs.filter((j) => j.status === 'active').length;
  const loanedCount = equipment.filter((e) => e.inUse !== 'N' && !!e.currentLoan).length;
  const upcomingCount = events.filter((e) => e.date >= REF_TODAY && e.status !== 'cancelled').length;

  const navItems: { id: FieldTabId; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'jobs', label: tx('地盤', 'Sites'), icon: MapPin, badge: `${activeJobs}` },
    { id: 'equipment', label: tx('器材', 'Gear'), icon: Wrench, badge: loanedCount > 0 ? `${loanedCount}` : undefined },
    { id: 'stp', label: 'STP', icon: FileText, badge: `${tests.length}` },
    { id: 'tools', label: tx('計算機', 'Tools'), icon: Calculator },
    { id: 'calendar', label: tx('月曆', 'Cal'), icon: CalendarDays, badge: upcomingCount > 0 ? `${upcomingCount}` : undefined },
  ];

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-slate-100/80 flex flex-col">
      <header className="pt-safe sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-1.5 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/labtech-logo.png" alt="LaBTECH" className="h-6 w-auto shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <PWAInstallButton compact />
            <button type="button" onClick={onOpenSearch} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 cursor-pointer" aria-label="Search"><Search className="h-4 w-4 text-brand" /></button>
            <button type="button" onClick={() => syncNowWithDrive()} className={`rounded-xl border p-2 cursor-pointer ${driveSyncStatus === 'synced' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : driveSyncStatus === 'syncing' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`} title={tx('同步雲端資料', 'Sync Cloud')} aria-label="Sync"><Cloud className={`h-4 w-4 ${driveSyncStatus === 'syncing' ? 'animate-pulse' : ''}`} /></button>
            <button type="button" onClick={toggleLang} className="inline-flex items-center gap-1 rounded-xl border border-brand/30 bg-brand-wash/70 px-2 py-2 text-[11px] font-extrabold leading-4 text-brand-deep cursor-pointer"><Globe className="h-3.5 w-3.5" />{lang === 'zh' ? 'EN' : '中'}</button>
            <ThemeQuickToggle className="bg-slate-50" />
            <button type="button" onClick={() => setSettingsOpen(!settingsOpen)} className={`rounded-xl border p-2 cursor-pointer ${settingsOpen ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`} aria-label="Settings">{settingsOpen ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}</button>
          </div>
        </div>

        {settingsOpen && (
          <div className="max-h-[70dvh] overflow-y-auto border-t border-slate-200 bg-white px-3.5 py-3 shadow-lg space-y-3 text-xs">
            <div className="space-y-1">
              <div className="text-[11px] font-extrabold text-slate-500">{tx('當值同事身份', 'Active Operator')}</div>
              <select value={user?.id || ''} onChange={(e) => switchAccount(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-900">
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{lang === 'en' ? acc.name : acc.zh || acc.name} · {acc.role.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-extrabold text-slate-500">{tx('外觀主題', 'Appearance')}</div>
              <ThemeSegmented />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-extrabold text-slate-500">{tx('字體大小', 'Text Size')}</div>
              <FontScaleSegmented />
            </div>
            <button type="button" onClick={() => { setViewMode('desktop'); setSettingsOpen(false); }} className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 font-extrabold text-slate-800 cursor-pointer">
              <Monitor className="h-3.5 w-3.5 text-brand" /> {tx('切換至 PC 網頁版', 'Switch to PC Web')}
            </button>
            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
              <button type="button" onClick={() => { onOpenDriveSync(); setSettingsOpen(false); }} className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50/70 py-2 font-bold text-emerald-800 cursor-pointer"><Cloud className="h-3.5 w-3.5" /> Drive</button>
              <button type="button" onClick={() => { resetAllDemoData(); setSettingsOpen(false); }} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 font-bold text-slate-600 cursor-pointer"><RotateCcw className="h-3.5 w-3.5" /> {tx('重設資料', 'Reset')}</button>
              <button type="button" onClick={logout} className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-50 border border-rose-200 py-2 font-extrabold text-rose-700 cursor-pointer"><LogOut className="h-3.5 w-3.5" /> {tx('登出', 'Logout')}</button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-full px-3 pt-3" style={{ paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}>
        {activeTab === 'jobs' && <MobileJobsView onNavigateEquipment={() => onSelect('equipment')} />}
        {activeTab === 'equipment' && <MobileEquipmentView />}
        {activeTab === 'stp' && <MobileStpView />}
        {activeTab === 'tools' && <MobileToolsView forcedMode={toolJump?.mode || null} forcedTool={toolJump?.tool || null} onConsumeJump={onConsumeJump} />}
        {activeTab === 'calendar' && <MobileCalendarView />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200/90 bg-white/95 backdrop-blur-md pb-safe">
        <div className="grid grid-cols-5 px-1 pt-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button key={item.id} type="button" onClick={() => { onSelect(item.id); setSettingsOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition cursor-pointer ${active ? 'text-brand' : 'text-slate-500'}`}>
                <div className={`relative rounded-xl px-3 py-1 ${active ? 'bg-brand-wash' : ''}`}>
                  <Icon className="h-5 w-5" />
                  {item.badge && <span className={`absolute -right-1 -top-1 rounded-full px-1 text-[9px] font-extrabold leading-tight ${active ? 'bg-brand text-white' : 'bg-slate-200 text-slate-700'}`}>{item.badge}</span>}
                </div>
                <span className={`text-[11px] font-extrabold ${active ? 'text-brand-deep' : 'text-slate-600'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <MobileStpSheet />
    </div>
  );
};
