import React, { useState } from 'react';
import { useApp } from '../store';
import { usePrefs, FontScale } from '../prefs';
import { REF_TODAY, getEquipmentCalStatus } from '../utils';
import { PWAInstallButton } from './PwaStatusWidgets';
import { ThemeQuickToggle, DisplaySettingsMenu, ThemeSegmented } from './ThemeToggle';
import { MapPin, Wrench, FileText, Calculator, CalendarDays, RotateCcw, LogOut, Globe, Search, Landmark, AlertTriangle, Menu, X, Cloud, ArrowLeftRight, ShieldCheck, FileSpreadsheet, FolderOpen, Award, ClipboardList, BookCheck, Activity, Smartphone, ChevronDown } from 'lucide-react';

export type FieldTabId = 'jobs' | 'equipment' | 'stp' | 'tools' | 'calendar';
export type EquipmentSubSectionId = 'loans' | 'calibration';
export type DocVaultSubSectionId = 'stp' | 'worksheets' | 'order_forms' | 'daily_records' | 'reports' | 'quality_forms';

export const FieldNavShell: React.FC<{
  activeTab: FieldTabId;
  onSelect: (id: FieldTabId) => void;
  equipmentSubTab?: EquipmentSubSectionId;
  onSelectEquipmentSubTab?: (sub: EquipmentSubSectionId) => void;
  docVaultSubTab?: DocVaultSubSectionId;
  onSelectDocVaultSubTab?: (sub: DocVaultSubSectionId) => void;
  onOpenSearch: () => void;
  onOpenGovSpecs: () => void;
  onOpenDriveSync: () => void;
}> = ({
  activeTab,
  onSelect,
  equipmentSubTab = 'loans',
  onSelectEquipmentSubTab,
  docVaultSubTab = 'stp',
  onSelectDocVaultSubTab,
  onOpenSearch,
  onOpenGovSpecs,
  onOpenDriveSync,
}) => {
  const { user, accounts, switchAccount, logout, resetAllDemoData, jobs, equipment, tests, events, driveSyncStatus } = useApp();
  const { lang, toggleLang, fontScale, setFontScale, setViewMode, tx } = usePrefs();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const hasSubMenu = (id: FieldTabId) => id === 'equipment' || id === 'stp' || id === 'tools';
  const handleMainTabClick = (id: FieldTabId) => {
    if (hasSubMenu(id)) {
      setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
    }
    onSelect(id);
  };

  const tabs: { id: FieldTabId; label: string; mobileLabel: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'jobs', label: tx('工程項目管理 (Projects)', 'Projects & Sites'), mobileLabel: tx('工程', 'Sites'), icon: MapPin },
    { id: 'equipment', label: tx('儀器管理 (Equipment)', 'Equipment'), mobileLabel: tx('儀器', 'Gear'), icon: Wrench },
    { id: 'stp', label: tx('受控工作文件庫 (Controlled Docs)', 'Controlled Docs'), mobileLabel: tx('工作文件', 'Docs'), icon: FileText },
    { id: 'tools', label: tx('測試計算及報告 (Test & Report)', 'Test & Worksheet'), mobileLabel: tx('測試報告', 'Test/Report'), icon: Calculator },
    { id: 'calendar', label: tx('測試排程日曆 (Schedule)', 'Schedule'), mobileLabel: tx('日曆', 'Cal'), icon: CalendarDays },
  ];

  const activeJobsCount = jobs.filter((j) => j.status === 'active').length;
  const inUseEq = equipment.filter((e) => e.inUse !== 'N');
  const loanedCount = inUseEq.filter((e) => !!e.currentLoan).length;
  const calAlertCount = inUseEq.filter((e) => {
    const c = getEquipmentCalStatus(e);
    return c.kind === 'warn' || c.kind === 'bad' || c.mismatch;
  }).length;
  const upcomingEventsCount = events.filter((e) => e.date >= REF_TODAY && e.status !== 'cancelled').length;

  const getBadge = (id: FieldTabId) => {
    if (id === 'jobs') return `${activeJobsCount}`;
    if (id === 'equipment') return loanedCount > 0 ? tx(`借出 ${loanedCount}`, `${loanedCount} Out`) : `${inUseEq.length}`;
    if (id === 'stp') return `${tests.length}`;
    if (id === 'tools') return '6+8';
    return upcomingEventsCount > 0 ? `${upcomingEventsCount}` : undefined;
  };

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col border-r border-slate-200/85 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
          <img src="/labtech-logo.png" alt="LaBTECH" className="h-7 w-[108px] min-w-[108px] shrink-0 object-contain object-left" />
          <span className="rounded-full bg-brand-wash px-2 py-0.5 text-[10px] font-extrabold text-brand-deep ring-1 ring-brand/20 shrink-0 whitespace-nowrap">HOKLAS 298</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{tx('主工作區 Workspace', 'Main Workspace')}</div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const badge = getBadge(tab.id);
              const expandable = hasSubMenu(tab.id);
              const isOpen = !!expandedMap[tab.id];
              return (
                <React.Fragment key={tab.id}>
                  <button
                    type="button"
                    onClick={() => handleMainTabClick(tab.id)}
                    className={`flex w-full items-center justify-between gap-1.5 rounded-2xl px-3 py-2.5 text-left text-xs font-extrabold transition cursor-pointer ${
                      active ? 'bg-brand text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : tab.id === 'calendar' ? 'text-violet-600' : 'text-slate-400'}`} />
                      <span className="leading-snug">{tab.label}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      {badge && (
                        <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold whitespace-nowrap ${active ? 'bg-white/20 text-white' : tab.id === 'calendar' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                          {badge}
                        </span>
                      )}
                      {expandable && (
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${active ? 'text-white/90' : 'text-slate-400'}`} />
                      )}
                    </span>
                  </button>
                  {tab.id === 'equipment' && isOpen && (
                    <div className="ml-4 pl-2.5 border-l-2 border-slate-200 space-y-1 py-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelect('equipment');
                          onSelectEquipmentSubTab?.('loans');
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[11px] font-extrabold transition cursor-pointer ${
                          activeTab === 'equipment' && equipmentSubTab === 'loans'
                            ? 'bg-brand-wash text-brand-deep ring-1 ring-brand/30'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <ArrowLeftRight className="h-3.5 w-3.5 text-brand shrink-0" />
                          <span className="truncate">{tx('1. 儀器借還管理', '1. Loan & Checkout')}</span>
                        </span>
                        <span className="rounded-full bg-white px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-brand-deep border border-slate-200">
                          {loanedCount}/{inUseEq.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect('equipment');
                          onSelectEquipmentSubTab?.('calibration');
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[11px] font-extrabold transition cursor-pointer ${
                          activeTab === 'equipment' && equipmentSubTab === 'calibration'
                            ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{tx('2. 校準及證書管理', '2. Calibration & Certs')}</span>
                        </span>
                        {calAlertCount > 0 && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-amber-800">
                            {calAlertCount}
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                  {tab.id === 'stp' && isOpen && (
                    <div className="ml-4 pl-2.5 border-l-2 border-slate-200 space-y-1 py-0.5">
                      {([
                        ['stp', tx('1. STP 標準測試程序', '1. STP Procedures'), FileText, 'text-slate-700'],
                        ['worksheets', tx('2. 測試工作紙範本', '2. Worksheet Templates'), FileSpreadsheet, 'text-brand'],
                        ['order_forms', tx('3. 測試委託單範本', '3. Order Forms (FQS08)'), FolderOpen, 'text-emerald-600'],
                        ['daily_records', tx('4. 每日測試紀錄表', '4. Daily Records (FQS09)'), ClipboardList, 'text-indigo-600'],
                        ['reports', tx('5. 正式報告範本', '5. Formal Report Templates'), Award, 'text-amber-600'],
                        ['quality_forms', tx('6. 品質體系及校準表格', '6. Quality & Cal Forms'), BookCheck, 'text-teal-600'],
                      ] as const).map(([subId, subLabel, SubIcon, iconCls]) => (
                        <button
                          key={subId}
                          type="button"
                          onClick={() => {
                            onSelect('stp');
                            onSelectDocVaultSubTab?.(subId);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold transition cursor-pointer ${
                            activeTab === 'stp' && docVaultSubTab === subId
                              ? 'bg-brand-wash text-brand-deep ring-1 ring-brand/30'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <SubIcon className={`h-3.5 w-3.5 shrink-0 ${iconCls}`} />
                            <span className="truncate">{subLabel}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {tab.id === 'tools' && isOpen && (
                    <div className="ml-4 pl-2.5 border-l-2 border-slate-200 space-y-1 py-0.5">
                      <button
                        type="button"
                        onClick={() => onSelect('tools')}
                        className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-extrabold transition cursor-pointer ${
                          activeTab === 'tools'
                            ? 'bg-brand-wash text-brand-deep ring-1 ring-brand/30'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Calculator className="h-3.5 w-3.5 text-brand shrink-0" />
                        <span className="truncate">{tx('1. 測試計算及工作紙 (6)', '1. Calculators & Worksheets (6)')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={onOpenGovSpecs}
                        className="flex w-full items-center gap-2 rounded-xl border border-indigo-200/80 bg-indigo-50/60 px-2.5 py-2 text-[11px] font-extrabold text-indigo-800 hover:bg-indigo-100/70 cursor-pointer"
                      >
                        <Landmark className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">{tx('2. CEDD · ASD · Housing · BD Spec', '2. HK Dept Test Specs')}</span>
                      </button>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 space-y-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-extrabold text-slate-700"><Activity className="h-3.5 w-3.5 text-emerald-600" /> {tx('即時狀態', 'Live Status')}</div>
            <button type="button" onClick={() => { setExpandedMap((p) => ({ ...p, equipment: true })); onSelect('equipment'); onSelectEquipmentSubTab?.('loans'); }} className="flex w-full items-center justify-between rounded-xl bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:text-brand cursor-pointer">
              <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-brand" /> {tx('借出中儀器', 'On-Site Gear')}</span>
              <span className="font-mono font-extrabold text-brand-deep">{loanedCount}</span>
            </button>
            {calAlertCount > 0 && (
              <button type="button" onClick={() => { setExpandedMap((p) => ({ ...p, equipment: true })); onSelect('equipment'); onSelectEquipmentSubTab?.('calibration'); }} className="flex w-full items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1.5 font-bold text-amber-900 cursor-pointer">
                <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-600" /> {tx('校準到期提示', 'Cal Due Alert')}</span>
                <span className="font-mono font-extrabold">{calAlertCount}</span>
              </button>
            )}
            <button type="button" onClick={() => onSelect('calendar')} className="flex w-full items-center justify-between rounded-xl bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:text-violet-700 cursor-pointer">
              <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3 text-violet-600" /> {tx('近期排程項目', 'Upcoming Events')}</span>
              <span className="font-mono font-extrabold text-violet-700">{upcomingEventsCount}</span>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 p-3 space-y-2 bg-slate-50/50">
          <select aria-label="Switch Staff Account" value={user?.id || ''} onChange={(e) => switchAccount(e.target.value)} className="w-full truncate rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-brand cursor-pointer">
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{lang === 'en' ? acc.name.split(',')[1]?.trim() || acc.name : acc.zh || acc.name} · {acc.role.toUpperCase()}</option>
            ))}
          </select>
          <button type="button" onClick={logout} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer">
            <LogOut className="h-3.5 w-3.5" /> {tx('鎖定並登出系統', 'Lock & Sign Out')}
          </button>
        </div>
      </aside>
      <header className="sticky top-0 z-20 lg:pl-64 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 px-2.5 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 shrink-0 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Section Menu"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:border-brand cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <img src="/labtech-logo.png" alt="LaBTECH" className="block h-6 sm:h-7 w-[92px] sm:w-[108px] min-w-[92px] shrink-0 object-contain object-left" />
          </div>

          <button
            type="button"
            onClick={onOpenSearch}
            className="flex flex-1 min-w-0 max-w-xl overflow-hidden items-center justify-between gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-2.5 sm:px-3.5 py-2 text-left text-xs text-slate-500 hover:border-brand/50 hover:bg-white transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5 min-w-0 w-full">
              <Search className="h-4 w-4 text-brand shrink-0" />
              <span className="truncate">{tx('搜尋 Site ID、器材編號、STP、計算工具、部門標準...', 'Search Site ID, Equipment, STP, Calculator, Spec...')}</span>
            </span>
          </button>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="hidden md:block">
              <PWAInstallButton />
            </div>

            <button
              type="button"
              onClick={onOpenDriveSync}
              title={tx('Google Drive 批次上傳及雲端資料庫', 'Google Drive Batch Upload & Database')}
              className={`inline-flex items-center gap-1 rounded-xl border px-2 sm:px-2.5 py-1.5 text-[11px] font-extrabold cursor-pointer ${
                driveSyncStatus === 'synced'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-brand hover:text-brand'
              }`}
            >
              <Cloud className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xl:inline">{tx('Drive / 批次上傳', 'Drive / Batch Upload')}</span>
            </button>

            <button type="button" onClick={toggleLang} className="inline-flex items-center gap-1 rounded-xl border border-brand/30 bg-brand-wash/70 px-2 sm:px-2.5 py-1.5 text-[11px] font-extrabold text-brand-deep hover:bg-brand-wash cursor-pointer">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span>{lang === 'zh' ? 'EN' : '中'}</span>
            </button>

            <ThemeQuickToggle />
            <DisplaySettingsMenu onResetDemo={resetAllDemoData} />
          </div>
        </div>
        <div className="lg:hidden border-t border-slate-100 bg-slate-50/95 px-2 py-1.5">
          <div className="grid grid-cols-5 gap-1 sm:flex sm:items-center sm:gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { onSelect(tab.id); setMobileMenuOpen(false); }}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-xl px-1 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                    active ? 'bg-brand text-white shadow-xs' : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="leading-tight">{tab.mobileLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 shadow-lg space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const badge = getBadge(tab.id);
              const expandable = hasSubMenu(tab.id);
              const isOpen = !!expandedMap[tab.id];
              return (
                <React.Fragment key={tab.id}>
                  <button
                    type="button"
                    onClick={() => {
                      handleMainTabClick(tab.id);
                      if (!expandable) setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-extrabold cursor-pointer ${
                      active ? 'bg-brand text-white' : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5"><Icon className="h-4 w-4 shrink-0" />{tab.label}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {badge && <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>{badge}</span>}
                      {expandable && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                    </span>
                  </button>
                  {tab.id === 'equipment' && isOpen && (
                    <div className="ml-4 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => { onSelect('equipment'); onSelectEquipmentSubTab?.('loans'); setMobileMenuOpen(false); }}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-extrabold cursor-pointer ${
                          activeTab === 'equipment' && equipmentSubTab === 'loans'
                            ? 'border-brand bg-brand-wash text-brand-deep'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 text-brand" />
                        <span>{tx('1. 儀器借還管理', '1. Loan & Checkout')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { onSelect('equipment'); onSelectEquipmentSubTab?.('calibration'); setMobileMenuOpen(false); }}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-extrabold cursor-pointer ${
                          activeTab === 'equipment' && equipmentSubTab === 'calibration'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{tx('2. 校準及證書管理', '2. Calibration & Certs')}</span>
                      </button>
                    </div>
                  )}
                  {tab.id === 'stp' && isOpen && (
                    <div className="ml-4 grid grid-cols-2 gap-1.5">
                      {([
                        ['stp', tx('1. STP 程序', '1. STP'), FileText],
                        ['worksheets', tx('2. 工作紙範本', '2. Worksheets'), FileSpreadsheet],
                        ['order_forms', tx('3. 測試委託單', '3. Orders'), FolderOpen],
                        ['daily_records', tx('4. 每日紀錄表', '4. Daily Log'), ClipboardList],
                        ['reports', tx('5. 正式報告範本', '5. Reports'), Award],
                        ['quality_forms', tx('6. 品質及校準表', '6. Quality'), BookCheck],
                      ] as const).map(([subId, subLabel, SubIcon]) => (
                        <button
                          key={subId}
                          type="button"
                          onClick={() => { onSelect('stp'); onSelectDocVaultSubTab?.(subId); setMobileMenuOpen(false); }}
                          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-extrabold cursor-pointer ${
                            activeTab === 'stp' && docVaultSubTab === subId
                              ? 'border-brand bg-brand-wash text-brand-deep'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          <SubIcon className="h-3.5 w-3.5 text-brand shrink-0" />
                          <span className="truncate">{subLabel}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {tab.id === 'tools' && isOpen && (
                    <div className="ml-4 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => { onSelect('tools'); setMobileMenuOpen(false); }}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-extrabold text-slate-700 cursor-pointer"
                      >
                        <Calculator className="h-3.5 w-3.5 text-brand shrink-0" />
                        <span>{tx('1. 計算及工作紙', '1. Calculators')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { onOpenGovSpecs(); setMobileMenuOpen(false); }}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-[11px] font-extrabold text-indigo-800 cursor-pointer"
                      >
                        <Landmark className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span>{tx('2. 部門 Spec 標準', '2. Dept Specs')}</span>
                      </button>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
              <select aria-label="Switch Staff Account" value={user?.id || ''} onChange={(e) => switchAccount(e.target.value)} className="flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-800 outline-none">
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{lang === 'en' ? acc.name.split(',')[1]?.trim() || acc.name : acc.zh || acc.name}</option>
                ))}
              </select>
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                {(['md', 'lg', 'xl'] as FontScale[]).map((s, idx) => (
                  <button key={s} type="button" onClick={() => setFontScale(s)} className={`rounded-lg px-2 py-1 text-[11px] font-extrabold cursor-pointer ${fontScale === s ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
                    {['A', 'A+', 'A++'][idx]}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { resetAllDemoData(); setMobileMenuOpen(false); }} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 cursor-pointer" title={tx('重設示範資料', 'Reset')}>
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
            <ThemeSegmented />
            <button type="button" onClick={() => { setViewMode('mobile'); setMobileMenuOpen(false); }} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 cursor-pointer">
              <Smartphone className="h-3.5 w-3.5 text-brand" /> {tx('切換至手機版介面', 'Switch to Mobile Layout')}
            </button>
          </div>
        )}
      </header>
    </>
  );
};
