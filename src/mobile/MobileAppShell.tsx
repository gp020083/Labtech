import React from 'react';
import { usePrefs } from '../prefs';
import { FieldTabId, AccountMenu } from '../components/FieldNavShell';
import { CalcToolId } from '../pages/ToolsPage';
import { MobileJobsView } from './MobileJobsView';
import { MobileEquipmentView } from './MobileEquipmentView';
import { StpPage } from '../pages/StpPage';
import { MobileToolsView } from './MobileToolsView';
import { MobileCalendarView } from './MobileCalendarView';
import { MobileStpSheet } from './MobileStpSheet';
import { MapPin, Wrench, FileText, Calculator, CalendarDays, Search } from 'lucide-react';

export const MobileAppShell: React.FC<{
  activeTab: FieldTabId;
  onSelect: (t: FieldTabId) => void;
  onOpenSearch: () => void;
  onOpenDriveSync: () => void;
  toolJump: { mode?: 'calc' | 'specs'; tool?: CalcToolId } | null;
  onConsumeJump: () => void;
  onStartCalc?: (tool: CalcToolId) => void;
}> = ({ activeTab, onSelect, onOpenSearch, onOpenDriveSync, toolJump, onConsumeJump, onStartCalc }) => {
  const { tx } = usePrefs();

  // Same order and names as the desktop sidebar: documents and calculators first.
  const navItems: { id: FieldTabId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'stp', label: tx('文件', 'Docs'), icon: FileText },
    { id: 'tools', label: tx('計算', 'Calc'), icon: Calculator },
    { id: 'equipment', label: tx('儀器', 'Gear'), icon: Wrench },
    { id: 'jobs', label: tx('地盤', 'Sites'), icon: MapPin },
    { id: 'calendar', label: tx('日曆', 'Schedule'), icon: CalendarDays },
  ];

  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-clip bg-slate-100/80 flex flex-col">
      <header className="pt-safe sticky top-0 z-30 w-full max-w-[100vw] border-b border-slate-200/90 bg-white/95 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between gap-2 px-3 py-2">
          <img src="/labtech-logo.png" alt="LaBTECH" className="block h-[22px] w-[88px] min-w-[88px] shrink-0 object-contain object-left" />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label={tx('搜尋', 'Search')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 cursor-pointer"
            >
              <Search className="h-4 w-4" />
            </button>
            <AccountMenu onOpenDriveSync={onOpenDriveSync} />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden px-3 pt-3" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        {activeTab === 'jobs' && <MobileJobsView onNavigateEquipment={() => onSelect('equipment')} />}
        {activeTab === 'equipment' && <MobileEquipmentView />}
        {activeTab === 'stp' && <StpPage onOpenDriveBatch={onOpenDriveSync} onStartCalc={onStartCalc} />}
        {activeTab === 'tools' && <MobileToolsView forcedMode={toolJump?.mode || null} forcedTool={toolJump?.tool || null} onConsumeJump={onConsumeJump} />}
        {activeTab === 'calendar' && <MobileCalendarView />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 w-full max-w-[100vw] border-t border-slate-200/90 bg-white/95 backdrop-blur-md pb-safe">
        <div className="grid grid-cols-5 px-1 pt-1.5 pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition cursor-pointer ${active ? 'text-brand' : 'text-slate-500'}`}
              >
                <div className={`rounded-xl px-3 py-1 ${active ? 'bg-brand-wash' : ''}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-[11px] font-bold leading-tight whitespace-nowrap ${active ? 'text-brand-deep' : 'text-slate-600'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <MobileStpSheet />
    </div>
  );
};
