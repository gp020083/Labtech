import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { usePermissions } from '../permissions';
import { getEquipmentCalStatus } from '../utils';
import { usePWAInstall } from './PwaStatusWidgets';
import { ThemeSegmented, FontScaleSegmented } from './ThemeToggle';
import { MapPin, Wrench, FileText, Calculator, CalendarDays, RotateCcw, LogOut, Globe, Search, Cloud, Smartphone, Download, ChevronDown } from 'lucide-react';

export type FieldTabId = 'jobs' | 'equipment' | 'stp' | 'tools' | 'calendar';
export type EquipmentSubSectionId = 'loans' | 'calibration';
export type DocVaultSubSectionId = 'stp' | 'worksheets' | 'order_forms' | 'daily_records' | 'reports' | 'quality_forms';

const ROLE_LABEL: Record<string, string> = { operator: 'Operator', as: 'AS', quality: 'QM', admin: 'Admin' };

/** Single account menu that replaces the row of header buttons. */
export const AccountMenu: React.FC<{ onOpenDriveSync: () => void }> = ({ onOpenDriveSync }) => {
  const { user, accounts, switchAccount, logout, resetAllDemoData } = useApp();
  const { lang, toggleLang, isMobileApp, setViewMode, tx } = usePrefs();
  const perms = usePermissions();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
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

  const displayName = user ? (lang === 'en' ? user.name.split(',')[1]?.trim() || user.name : user.zh || user.name) : '';
  const initial = (displayName || '?').trim().charAt(0).toUpperCase();
  const itemCls = 'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer';

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={tx('帳戶及設定', 'Account & Settings')}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-2 hover:border-slate-300 cursor-pointer"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-extrabold text-white">{initial}</span>
        <span className="hidden sm:block max-w-28 truncate text-xs font-bold text-slate-800">{displayName}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-extrabold text-white">{initial}</span>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-slate-900">{displayName}</div>
              <div className="text-[11px] font-semibold text-slate-500">{ROLE_LABEL[perms.role] || perms.role}</div>
            </div>
          </div>

          <select
            aria-label="Switch account"
            value={user?.id || ''}
            onChange={(e) => switchAccount(e.target.value)}
            className="w-full truncate rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-brand cursor-pointer"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {lang === 'en' ? acc.name.split(',')[1]?.trim() || acc.name : acc.zh || acc.name} · {ROLE_LABEL[acc.role] || acc.role}
              </option>
            ))}
          </select>

          <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
            <button type="button" onClick={toggleLang} className={itemCls}>
              <Globe className="h-4 w-4 text-slate-500" />
              <span className="flex-1">{tx('語言', 'Language')}</span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-extrabold text-slate-700">{lang === 'zh' ? '中文' : 'English'}</span>
            </button>
            <ThemeSegmented />
            <FontScaleSegmented />
          </div>

          <div className="space-y-0.5 border-t border-slate-100 pt-2">
            {!isInstalled && isInstallable && (
              <button type="button" onClick={() => { install(); setOpen(false); }} className={itemCls}>
                <Download className="h-4 w-4 text-brand" /> {tx('安裝離線 App', 'Install Offline App')}
              </button>
            )}
            {!isInstalled && !isInstallable && isIOS && (
              <div className="px-2.5 py-1.5 text-[11px] text-slate-500">
                {tx('iPhone 安裝方法：Safari 分享 › 加入主畫面', 'iPhone: Safari Share › Add to Home Screen')}
              </div>
            )}
            {perms.canManageDocs && (
              <button type="button" onClick={() => { onOpenDriveSync(); setOpen(false); }} className={itemCls}>
                <Cloud className="h-4 w-4 text-emerald-600" /> {tx('Google Drive 同步及批次上傳', 'Google Drive Sync & Batch Upload')}
              </button>
            )}
            <button type="button" onClick={() => { setViewMode(isMobileApp ? 'desktop' : 'mobile'); setOpen(false); }} className={itemCls}>
              <Smartphone className="h-4 w-4 text-slate-500" />
              {isMobileApp ? tx('切換至電腦版介面', 'Switch to Desktop Layout') : tx('切換至手機版介面', 'Switch to Mobile Layout')}
            </button>
            {perms.canResetDemo && (
              <button type="button" onClick={() => { resetAllDemoData(); setOpen(false); }} className={itemCls}>
                <RotateCcw className="h-4 w-4 text-slate-500" /> {tx('重設示範資料', 'Reset Demo Data')}
              </button>
            )}
            <button type="button" onClick={logout} className={`${itemCls} hover:bg-rose-50 hover:text-rose-600`}>
              <LogOut className="h-4 w-4" /> {tx('登出', 'Sign Out')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
}> = ({ activeTab, onSelect, onSelectEquipmentSubTab, onOpenSearch, onOpenDriveSync }) => {
  const { equipment } = useApp();
  const { tx } = usePrefs();

  const tabs: { id: FieldTabId; label: string; mobileLabel: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'stp', label: tx('文件', 'Documents'), mobileLabel: tx('文件', 'Docs'), icon: FileText },
    { id: 'tools', label: tx('測試計算', 'Calculators'), mobileLabel: tx('計算', 'Calc'), icon: Calculator },
    { id: 'equipment', label: tx('儀器', 'Equipment'), mobileLabel: tx('儀器', 'Gear'), icon: Wrench },
    { id: 'jobs', label: tx('工程及地盤', 'Sites'), mobileLabel: tx('地盤', 'Sites'), icon: MapPin },
    { id: 'calendar', label: tx('排程日曆', 'Schedule'), mobileLabel: tx('日曆', 'Schedule'), icon: CalendarDays },
  ];

  const calAlertCount = equipment
    .filter((e) => e.inUse !== 'N')
    .filter((e) => {
      const c = getEquipmentCalStatus(e);
      return c.kind === 'warn' || c.kind === 'bad' || c.mismatch;
    }).length;

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-56 lg:flex-col border-r border-slate-200/85 bg-white">
        <div className="flex items-center gap-2 px-5 py-4">
          <img src="/labtech-logo.png" alt="LaBTECH" className="h-7 w-[108px] min-w-[108px] shrink-0 object-contain object-left" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const showAlert = tab.id === 'equipment' && calAlertCount > 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelect(tab.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition cursor-pointer ${
                  active ? 'bg-brand-wash text-brand-deep' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-brand' : 'text-slate-400'}`} />
                  {tab.label}
                </span>
                {showAlert && (
                  <span
                    onClick={(e) => { e.stopPropagation(); onSelect('equipment'); onSelectEquipmentSubTab?.('calibration'); }}
                    title={tx(`${calAlertCount} 件儀器校準需要注意`, `${calAlertCount} calibration alerts`)}
                    className="rounded-full bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-amber-800"
                  >
                    {calAlertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-3 text-[10px] font-semibold text-slate-400">HOKLAS 298</div>
      </aside>

      <header className="sticky top-0 z-20 lg:pl-56 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2.5 px-3 py-2 sm:px-6 lg:px-8">
          <img src="/labtech-logo.png" alt="LaBTECH" className="lg:hidden block h-6 w-[88px] min-w-[88px] shrink-0 object-contain object-left" />

          <button
            type="button"
            onClick={onOpenSearch}
            className="flex flex-1 min-w-0 max-w-xl items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-left text-xs text-slate-500 hover:border-brand/50 hover:bg-white transition cursor-pointer"
          >
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="truncate">{tx('搵文件、儀器編號、地盤…', 'Search documents, equipment, sites…')}</span>
          </button>

          <AccountMenu onOpenDriveSync={onOpenDriveSync} />
        </div>

        <div className="lg:hidden border-t border-slate-100 bg-white px-2 py-1.5">
          <div className="grid grid-cols-5 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelect(tab.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                    active ? 'bg-brand-wash text-brand-deep' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="leading-tight">{tab.mobileLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>
    </>
  );
};
