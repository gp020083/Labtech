import React, { useState } from 'react';
import { useApp } from '../store';
import { usePrefs, FontScale } from '../prefs';
import { REF_TODAY, getEquipmentCalStatus } from '../utils';
import { PWAInstallButton } from './PwaStatusWidgets';
import { MapPin, Wrench, FileText, Calculator, CalendarDays, RotateCcw, LogOut, Globe, Search, Landmark, AlertTriangle, Menu, X, Cloud, Smartphone, ArrowLeftRight, ShieldCheck, FileSpreadsheet, FolderOpen, Award, ClipboardList, BookCheck } from 'lucide-react';

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
          <img src="/labtech-logo.png" alt="LaBTECH" className="h-7 w-auto" />
          <span className="rounded-full bg-brand-wash px-2 py-0.5 text-[10px] font-extrabold text-brand-deep ring-1 ring-brand/20">HOKLAS 298</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{tx('主工作區 Workspace', 'Main Workspace')}</div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const badge = getBadge(tab.id);
              return (
                <React.Fragment key={tab.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(tab.id)}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-xs font-extrabold transition cursor-pointer ${
                      active ? 'bg-brand text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${active ? 'text-white' : tab.id === 'calendar' ? 'text-violet-600' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                    </span>
                    {badge && (
                      <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${active ? 'bg-white/20 text-white' : tab.id === 'calendar' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                  {tab.id === 'equipment' && (
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
                  {tab.id === 'stp' && (
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
                  {tab.id === 'tools' && (
                    <button
                      type="button"
                      onClick={onOpenGovSpecs}
                      className="ml-4 flex w-[calc(100%-1rem)] items-center gap-2 rounded-xl border border-indigo-200/80 bg-indigo-50/60 px-3 py-2 text-[11px] font-extrabold text-indigo-800 hover:bg-indigo-100/70 cursor-pointer"
                    >
                      <Landmark className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">{tx('CEDD · ASD · Housing · BD Spec', 'HK Dept Test Specs')}</span>
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 space-y-2 text-[11px]">
            <div className="font-extrabold text-slate-700">{tx('⚡ 即時狀態 Live Status', '⚡ Live Status')}</div>
            <button type="button" onClick={() => { onSelect('equipment'); onSelectEquipmentSubTab?.('loans'); }} className="flex w-full items-center justify-between rounded-xl bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:text-brand cursor-pointer">
              <span>{tx('📍 借出中儀器', '📍 On-Site Gear')}</span>
              <span className="font-mono font-extrabold text-brand-deep">{loanedCount}</span>
            </button>
            {calAlertCount > 0 && (
              <button type="button" onClick={() => { onSelect('equipment'); onSelectEquipmentSubTab?.('calibration'); }} className="flex w-full items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1.5 font-bold text-amber-900 cursor-pointer">
                <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-600" /> {tx('校準到期提示', 'Cal Due Alert')}</span>
                <span className="font-mono font-extrabold">{calAlertCount}</span>
              </button>
            )}
            <button type="button" onClick={() => onSelect('calendar')} className="flex w-full items-center justify-between rounded-xl bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:text-violet-700 cursor-pointer">
              <span>{tx('📅 近期排程項目', '📅 Upcoming Events')}</span>
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
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 px-3 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Section Menu"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:border-brand cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <img src="/labtech-logo.png" alt="LaBTECH" className="h-6 w-auto hidden xs:block sm:block" />
          </div>

          <button
            type="button"
            onClick={onOpenSearch}
            className="flex flex-1 max-w-xl items-center justify-between gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-3.5 py-2 text-left text-xs text-slate-500 hover:border-brand/50 hover:bg-white transition cursor-pointer"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-4 w-4 text-brand shrink-0" />
              <span className="truncate">{tx('搜尋 Site ID、器材編號、STP、計算工具、CEDD / ASD / Housing / BD Spec...', 'Search Site ID, Equipment, STP, Calculator, HK Gov Spec...')}</span>
            </span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden sm:inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5" title={tx('字體大小 Font Size', 'Font Size')}>
              {([
                ['md', 'A'],
                ['lg', 'A+'],
                ['xl', 'A++'],
              ] as [FontScale, string][]).map(([scale, lbl]) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => setFontScale(scale)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-extrabold transition cursor-pointer ${
                    fontScale === scale ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <PWAInstallButton />

            <button
              type="button"
              onClick={onOpenDriveSync}
              title={tx('Google Drive 批次上傳及雲端資料庫', 'Google Drive Batch Upload & Database')}
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-extrabold cursor-pointer ${
                driveSyncStatus === 'synced'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-brand hover:text-brand'
              }`}
            >
              <Cloud className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tx('Drive / 批次上傳', 'Drive / Batch Upload')}</span>
            </button>

            <button type="button" onClick={toggleLang} className="inline-flex items-center gap-1 rounded-xl border border-brand/30 bg-brand-wash/70 px-2.5 py-1.5 text-[11px] font-extrabold text-brand-deep hover:bg-brand-wash cursor-pointer">
              <Globe className="h-3.5 w-3.5" />
              <span>{lang === 'zh' ? '中/EN' : 'EN'}</span>
            </button>

            <button type="button" onClick={() => setViewMode('mobile')} title={tx('切換至專屬手機版介面', 'Switch to Mobile App View')} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-slate-700 hover:border-brand hover:text-brand cursor-pointer"><Smartphone className="h-3.5 w-3.5 text-brand" /><span>{tx('手機版', 'Mobile')}</span></button>
            <button type="button" title={tx('重設示範資料', 'Reset Demo Data')} onClick={resetAllDemoData} className="hidden sm:inline-flex rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"><RotateCcw className="h-3.5 w-3.5" /></button>
            <button type="button" title={tx('登出 Logout', 'Logout')} onClick={logout} className="lg:hidden rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><LogOut className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div className="lg:hidden border-t border-slate-100 bg-slate-50/95 px-2.5 py-1.5">
          <div className="grid grid-cols-5 gap-1 sm:flex sm:items-center sm:gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { onSelect(tab.id); setMobileMenuOpen(false); }}
                  className={`inline-flex items-center justify-center gap-1 rounded-xl px-1.5 sm:px-3 py-2 text-[11px] sm:text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                    active ? 'bg-brand text-white shadow-xs' : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{tab.mobileLabel}</span>
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
              return (
                <React.Fragment key={tab.id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(tab.id); setMobileMenuOpen(false); }}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-extrabold cursor-pointer ${
                      active ? 'bg-brand text-white' : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5"><Icon className="h-4 w-4" />{tab.label}</span>
                    {badge && <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>{badge}</span>}
                  </button>
                  {tab.id === 'equipment' && (
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
                </React.Fragment>
              );
            })}
            <button
              type="button"
              onClick={() => { onOpenGovSpecs(); setMobileMenuOpen(false); }}
              className="flex w-full items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-extrabold text-indigo-800 cursor-pointer"
            >
              <Landmark className="h-4 w-4 text-indigo-600" />
              <span>{tx('CEDD · ASD · Housing · BD Spec 要求', 'HK Dept Test Specs')}</span>
            </button>
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
          </div>
        )}
      </header>
    </>
  );
};
