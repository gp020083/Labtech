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

  const navItems: { id: FieldTabId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'jobs', label: tx('工程', 'Sites'), icon: MapPin },
    { id: 'equipment', label: tx('儀器', 'Gear'), icon: Wrench },
    { id: 'stp', label: tx('文件', 'Docs'), icon: FileText },
    { id: 'tools', label: tx('測試計算', 'Calc'), icon: Calculator },
    { id: 'calendar', label: tx('日曆', 'Schedule'), icon: CalendarDays },
  ];

  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-clip bg-slate-100/80 flex flex-col">
      <header className="pt-safe sticky top-0 z-30 w-full max-w-[100vw] border-b border-slate-200/90 bg-white/95 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between gap-2 px-3 py-2">
          <img
            src="/labtech-logo.png"
            alt="LaBTECH"
            className="block h-6 w-[92px] min-w-[92px] shrink-0 object-contain object-left"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label={tx('搜尋', 'Search')}
              className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 cursor-pointer"
            >
              <Search className="h-4 w-4" />
            </button>
            <div className="[&>div>button]:min-h-[44px] [&>div>button]:px-2.5">
              <AccountMenu onOpenDriveSync={onOpenDriveSync} />
            </div>
          </div>
        </div>
      </header>

      <main
        className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden px-3 pt-3"
        style={{ paddingBottom: 'calc(6.25rem + env(safe-area-inset-bottom))' }}
      >
        {activeTab === 'jobs' && <MobileJobsView onNavigateEquipment={() => onSelect('equipment')} />}
        {activeTab === 'equipment' && <MobileEquipmentView />}
        {activeTab === 'stp' && <StpPage onOpenDriveBatch={onOpenDriveSync} onStartCalc={onStartCalc} />}
        {activeTab === 'tools' && (
          <MobileToolsView
            forcedMode={toolJump?.mode || null}
            forcedTool={toolJump?.tool || null}
            onConsumeJump={onConsumeJump}
          />
        )}
        {activeTab === 'calendar' && <MobileCalendarView />}
      </main>

      <nav
        aria-label="Mobile Primary Navigation"
        className="fixed bottom-0 inset-x-0 z-30 w-full max-w-[100vw] border-t border-slate-200/90 bg-white/95 backdrop-blur-md pb-safe"
      >
        <div className="grid grid-cols-5 px-1.5 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl py-1 transition cursor-pointer"
              >
                <span
                  className={`inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    active ? 'bg-brand-wash text-brand' : 'text-slate-500'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span
                  className={`text-[11px] leading-tight whitespace-nowrap ${
                    active ? 'font-extrabold text-brand-deep' : 'font-semibold text-slate-600'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <MobileStpSheet />
    </div>
  );
};
