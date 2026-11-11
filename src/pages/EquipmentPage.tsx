import React, { useState, useMemo, useEffect } from 'react';
import { usePermissions } from '../permissions';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { EquipmentItem } from '../types';
import { getLoanOverdueStatus } from '../utils/limsRules';
import { buildCalibrationForecast } from '../utils/limsProcessTools';
import { EquipmentSubSectionId } from '../components/FieldNavShell';
import { EquipmentCheckoutModal } from '../components/EquipmentCheckoutModal';
import { EquipmentReturnModal } from '../components/EquipmentReturnModal';
import { EquipmentDetailDrawer } from '../components/EquipmentDetailDrawer';
import { NewEquipmentModal } from '../components/NewEquipmentModal';
import { EquipmentHistoryTable } from '../components/EquipmentHistoryTable';
import { EquipmentMobileList } from '../components/EquipmentMobileList';
import { EquipmentQrModal } from '../components/EquipmentQrModal';
import { CalibrationForecastPanel } from '../components/CalibrationForecastPanel';
import {
  Plus,
  Search,
  UploadCloud,
  History,
  Eye,
  QrCode,
  ArrowLeftRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';

const TEST_TAGS = ['ALL', 'KD', 'SO', 'FC', 'BL', 'PO', 'PLT', 'VC'];

type CalFilterMode =
  | 'all'
  | 'valid'
  | 'due_90'
  | 'overdue'
  | 'monthly'
  | 'all_ext'
  | 'due_30'
  | 'due_31_90'
  | 'valid_90';

function getTestChipClass(tag: string): string {
  switch (tag) {
    case 'KD':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'SO':
      return 'border-indigo-200 bg-indigo-50 text-indigo-800';
    case 'FC':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'BL':
      return 'border-teal-200 bg-teal-50 text-teal-800';
    case 'PO':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    case 'PLT':
      return 'border-orange-200 bg-orange-50 text-orange-800';
    case 'VC':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
}

export const EquipmentPage: React.FC<{
  subSection?: EquipmentSubSectionId;
  onChangeSubSection?: (sub: EquipmentSubSectionId) => void;
  onOpenDriveBatch?: () => void;
}> = ({ subSection = 'loans', onChangeSubSection, onOpenDriveBatch }) => {
  const { equipment, loans, events, uploadEquipmentCalCert, openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const perms = usePermissions();
  const [activeSub, setActiveSub] = useState<EquipmentSubSectionId>(subSection);
  const [loanView, setLoanView] = useState<'list' | 'history'>('list');
  const [historyEqCode, setHistoryEqCode] = useState<string | null>(null);
  const [loanFilter, setLoanFilter] = useState<'all' | 'available' | 'loaned' | 'overdue'>('all');
  const [calFilter, setCalFilter] = useState<CalFilterMode>('all');
  const [selectedBatchDate, setSelectedBatchDate] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<EquipmentItem | null>(null);
  const [returnItem, setReturnItem] = useState<EquipmentItem | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [qrModal, setQrModal] = useState<{ mode: 'lookup' | 'labels'; code?: string | null } | null>(null);

  useEffect(() => {
    setActiveSub(subSection);
  }, [subSection]);

  const handleSelectSub = (next: EquipmentSubSectionId) => {
    setActiveSub(next);
    onChangeSubSection?.(next);
  };

  const inUseList = useMemo(() => equipment.filter((e) => e.inUse !== 'N'), [equipment]);
  const calForecast = useMemo(() => buildCalibrationForecast(equipment, events), [equipment, events]);
  const forecastByCode = useMemo(
    () => new Map(calForecast.items.map((it) => [it.equipment.code, it])),
    [calForecast.items]
  );

  const counts = useMemo(() => {
    const loaned = inUseList.filter((e) => !!e.currentLoan).length;
    const overdueLoan = inUseList.filter((e) => getLoanOverdueStatus(e).isOverdue).length;
    const available = inUseList.length - loaned;

    let overdueCal = 0;
    let due90Cal = 0;
    let validCal = 0;
    for (const eq of inUseList) {
      const fc = forecastByCode.get(eq.code);
      const d = fc ? fc.daysLeft : 999;
      if (d < 0) overdueCal += 1;
      else if (d <= 90) due90Cal += 1;
      else validCal += 1;
    }
    const monthly = inUseList.filter((e) => !!e.monthlyCheck).length;
    const alert = overdueCal + due90Cal;

    return {
      total: inUseList.length,
      available,
      loaned,
      overdueLoan,
      validCal,
      due90Cal,
      overdueCal,
      monthly,
      alert,
    };
  }, [inUseList, forecastByCode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inUseList.filter((e) => {
      const ov = getLoanOverdueStatus(e);
      const fc = forecastByCode.get(e.code);
      const daysLeft = fc ? fc.daysLeft : 999;
      const isExt = fc ? fc.isExternalCal && fc.daysLeft < 900 : false;
      const dueIso = fc ? fc.dueDate : '';

      if (activeSub === 'loans') {
        if (loanFilter === 'available' && e.currentLoan) return false;
        if (loanFilter === 'loaned' && !e.currentLoan) return false;
        if (loanFilter === 'overdue' && !ov.isOverdue) return false;
      } else {
        if (selectedBatchDate) {
          if (!isExt || dueIso !== selectedBatchDate) return false;
        } else {
          if (calFilter === 'valid' && daysLeft <= 90) return false;
          if (calFilter === 'due_90' && (daysLeft < 0 || daysLeft > 90)) return false;
          if (calFilter === 'overdue' && daysLeft >= 0) return false;
          if (calFilter === 'monthly' && !e.monthlyCheck) return false;
          if (calFilter === 'all_ext' && !isExt) return false;
          if (calFilter === 'due_30' && (!isExt || daysLeft < 0 || daysLeft > 30)) return false;
          if (calFilter === 'due_31_90' && (!isExt || daysLeft < 31 || daysLeft > 90)) return false;
          if (calFilter === 'valid_90' && (!isExt || daysLeft <= 90)) return false;
        }
      }

      const tags = e.testTags || e.tests.split('+').map((s) => s.trim()).filter(Boolean);
      if (tagFilter !== 'ALL' && !tags.includes(tagFilter)) return false;
      if (!q) return true;
      const hay = `${e.code} ${e.name} ${e.maker} ${e.model} ${e.serial} ${e.loc} ${e.certFile || ''} ${e.currentLoan?.siteLocation || ''} ${e.currentLoan?.borrowerName || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [inUseList, activeSub, loanFilter, calFilter, selectedBatchDate, tagFilter, query, forecastByCode]);

  const equipmentMap = useMemo(() => new Map(equipment.map((e) => [e.code, e])), [equipment]);
  const loanCountMap = useMemo(() => {
    const m = new Map<string, number>();
    loans.forEach((l) => m.set(l.equipmentCode, (m.get(l.equipmentCode) || 0) + 1));
    return m;
  }, [loans]);
  const activeDetailItem = detailCode ? equipmentMap.get(detailCode) || null : null;

  const openCertPreview = (eq: EquipmentItem) => {
    const certUrl = eq.certUrl || eq.calCerts?.find((c) => c.dataUrl)?.dataUrl;
    if (!certUrl) return;
    const certFile = eq.certFile || eq.calCerts?.[0]?.fileName || `${eq.code}_CalCert.pdf`;
    openPreviewDoc({
      title: `${eq.code} — ${certFile}`,
      url: certUrl,
      fileName: certFile,
      subtitle: `${eq.name} · S/N ${eq.serial} · Cal Due ${eq.certDue || eq.due}`,
    });
  };

  const getCalRowDisplay = (eq: EquipmentItem) => {
    const fc = forecastByCode.get(eq.code);
    const rawDue = (eq.certDue || eq.due || '').trim();
    const validIso = /^\d{4}-\d{2}-\d{2}/.test(rawDue) ? rawDue.slice(0, 10) : '';
    const daysLeft = fc ? fc.daysLeft : 999;

    if (validIso) {
      if (daysLeft < 0) {
        return {
          dateText: validIso,
          badgeText: tx(`已逾期 ${Math.abs(daysLeft)}日`, `Overdue ${Math.abs(daysLeft)}d`),
          badgeCls: 'border-rose-200 bg-rose-50 text-rose-700',
        };
      }
      if (daysLeft <= 90) {
        return {
          dateText: validIso,
          badgeText: tx(`${daysLeft}日後到期`, `Due in ${daysLeft}d`),
          badgeCls: 'border-amber-200 bg-amber-50 text-amber-800',
        };
      }
      return {
        dateText: validIso,
        badgeText: tx('有效', 'Valid'),
        badgeCls: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    }

    if (eq.monthlyCheck || eq.req === 'Internal Check') {
      return {
        dateText: '—',
        badgeText: tx('每月內檢', 'Monthly Check'),
        badgeCls: 'border-sky-200 bg-sky-50 text-sky-700',
      };
    }

    return {
      dateText: '—',
      badgeText: tx('免外校', 'Exempt'),
      badgeCls: 'border-slate-200 bg-slate-100 text-slate-600',
    };
  };

  const handleQuickCalUpload = async (eq: EquipmentItem, ev: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = ev.target.files ? (Array.from(ev.target.files) as File[]) : [];
    if (fileList.length === 0) return;
    const readFile = (f: File) =>
      new Promise<{ fileName: string; fileSize: string; dataUrl?: string }>((resolve) => {
        const sizeKb = `${Math.max(1, Math.round(f.size / 1024))} KB`;
        const reader = new FileReader();
        reader.onload = () =>
          resolve({
            fileName: f.name,
            fileSize: sizeKb,
            dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
          });
        reader.onerror = () => resolve({ fileName: f.name, fileSize: sizeKb });
        reader.readAsDataURL(f);
      });
    const results = await Promise.all(fileList.map(readFile));
    results.forEach((res) => {
      uploadEquipmentCalCert({
        code: eq.code,
        fileName: res.fileName,
        fileSize: res.fileSize,
        dueDate: eq.certDue || eq.due,
        dataUrl: res.dataUrl,
      });
    });
    ev.target.value = '';
  };

  const activeOverviewBucket =
    calFilter === 'all_ext' ||
    calFilter === 'overdue' ||
    calFilter === 'due_30' ||
    calFilter === 'due_31_90' ||
    calFilter === 'valid_90'
      ? calFilter
      : null;

  return (
    <div className="space-y-4">
      {/* Page Header & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 sm:px-5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
            {activeSub === 'loans'
              ? tx('儀器借還管理', 'Equipment Loan & Checkout')
              : tx('儀器校準及證書', 'Calibration & Certificates')}
          </h1>
          <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-extrabold text-slate-600 tabular-nums">
            {filtered.length}
          </span>
        </div>

        <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/80 shrink-0 gap-1">
          <button
            type="button"
            onClick={() => handleSelectSub('loans')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition cursor-pointer ${
              activeSub === 'loans'
                ? 'bg-brand text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>{tx('儀器借還', 'Loan & Checkout')}</span>
            <span className="ml-0.5 font-mono tabular-nums opacity-85">
              {counts.loaned}/{counts.total}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSub('calibration')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition cursor-pointer ${
              activeSub === 'calibration'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{tx('校準及證書', 'Calibration & Certs')}</span>
            {counts.alert > 0 && (
              <span className="ml-0.5 font-mono tabular-nums opacity-90">{counts.alert}</span>
            )}
          </button>
        </div>
      </div>

      {activeSub === 'loans' ? (
        <>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
              {(
                [
                  ['all', tx('全部儀器', 'All Active'), counts.total, 'text-slate-900'],
                  ['available', tx('在庫可借', 'Available'), counts.available, 'text-emerald-700'],
                  ['loaned', tx('借出中', 'On Site'), counts.loaned, 'text-brand-deep'],
                  ['overdue', tx('逾期未還', 'Overdue'), counts.overdueLoan, 'text-rose-600'],
                ] as const
              ).map(([k, label, num, color]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setLoanView('list');
                    setLoanFilter(k);
                  }}
                  className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition cursor-pointer ${
                    loanView === 'list' && loanFilter === k
                      ? 'border-brand bg-brand-wash/60 ring-2 ring-brand/20'
                      : 'border-slate-200/85 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-extrabold text-slate-700 truncate">{label}</span>
                  <span className={`font-mono text-lg font-extrabold tabular-nums ${color}`}>{num}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setLoanView(loanView === 'history' ? 'list' : 'history')}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-extrabold tabular-nums transition cursor-pointer ${
                  loanView === 'history'
                    ? 'border-brand bg-brand text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                {tx(`借還紀錄 · ${loans.length}`, `History · ${loans.length}`)}
              </button>
              <button
                type="button"
                onClick={() =>
                  openPreviewDoc({
                    title: tx('FQS50 儀器借出及交還登記表範本', 'FQS50 Record of Loan of Equipment Template'),
                    url: '/server-docs/forms/FQS50_Loan_of_Equipment_template.pdf',
                    fileName: 'FQS50_Loan_of_Equipment_template.pdf',
                  })
                }
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:border-brand hover:text-brand cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span>{tx('FQS50 借還表', 'FQS50')}</span>
              </button>
              <button
                type="button"
                onClick={() => setQrModal({ mode: 'lookup' })}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 font-extrabold text-white hover:bg-slate-800 cursor-pointer"
              >
                <QrCode className="h-3.5 w-3.5" />
                {tx('QR 掃描及標籤', 'QR & Labels')}
              </button>
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                hidden={!perms.canManageEquipment}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 font-extrabold text-white hover:bg-brand-deep cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                {tx('新增儀器', 'Add')}
              </button>
            </div>
          </div>

          {loanView === 'history' ? (
            <EquipmentHistoryTable
              loans={loans}
              equipmentMap={equipmentMap}
              filterCode={historyEqCode}
              onClearFilterCode={() => setHistoryEqCode(null)}
              onOpenDetail={(code) => setDetailCode(code)}
              onOpenReturn={(eq) => setReturnItem(eq)}
            />
          ) : (
            <>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={tx(
                      '搜尋儀器編號、名稱、S/N、借用人或工程地點...',
                      'Search Equipment Code, Name, S/N, Borrower or Site...'
                    )}
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand shadow-xs"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {TEST_TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTagFilter(t)}
                      className={`rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 font-mono text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                        tagFilter === t
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t === 'ALL' ? tx('ALL 全部', 'ALL') : t}
                    </button>
                  ))}
                </div>
              </div>

              <EquipmentMobileList
                items={filtered}
                loanCountMap={loanCountMap}
                onOpenDetail={(code) => setDetailCode(code)}
                onOpenCheckout={(eq) => setCheckoutItem(eq)}
                onOpenReturn={(eq) => setReturnItem(eq)}
                onOpenHistory={(code) => {
                  setHistoryEqCode(code);
                  setLoanView('history');
                }}
                onPreviewCert={openCertPreview}
                onQuickUpload={handleQuickCalUpload}
              />

              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
                <table className="hidden md:table w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
                    <tr className="whitespace-nowrap">
                      <th className="px-4 py-3">{tx('儀器編號', 'Code')}</th>
                      <th className="px-4 py-3">{tx('儀器名稱', 'Instrument')}</th>
                      <th className="px-4 py-3">{tx('適用測試', 'Tests')}</th>
                      <th className="px-4 py-3">{tx('目前位置及狀態', 'Location & Status')}</th>
                      <th className="px-4 py-3">{tx('借用人及預計歸還', 'Borrower & Due')}</th>
                      <th className="px-4 py-3 text-right">{tx('借還操作', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((eq) => {
                      const ov = getLoanOverdueStatus(eq, undefined, lang);
                      const tags = eq.testTags || eq.tests.split('+').map((s) => s.trim()).filter(Boolean);
                      const shortBorrower = eq.currentLoan?.borrowerName
                        ? eq.currentLoan.borrowerName.split(',')[1]?.trim() || eq.currentLoan.borrowerName
                        : '';
                      const logCount = loanCountMap.get(eq.code) || 0;
                      return (
                        <tr
                          key={eq.code}
                          onClick={() => setDetailCode(eq.code)}
                          className="hover:bg-slate-50/90 transition cursor-pointer"
                        >
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white">
                              {eq.code}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900 max-w-[260px] truncate">
                            {eq.name}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex flex-wrap items-center gap-1">
                              {tags.map((tg) => (
                                <span
                                  key={tg}
                                  className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-extrabold whitespace-nowrap ${getTestChipClass(tg)}`}
                                >
                                  {tg}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {eq.currentLoan ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-brand-deep">{eq.currentLoan.siteLocation}</span>
                                {ov.isOverdue && (
                                  <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-[10px] font-extrabold text-rose-700">
                                    {ov.label}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 whitespace-nowrap">
                                {tx('在庫 · ', 'In Lab · ')}
                                {eq.loc || eq.store || 'Office'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {eq.currentLoan ? (
                              <div className="text-[11px] font-semibold text-slate-700 tabular-nums">
                                {shortBorrower} ·{' '}
                                <span className="font-mono text-slate-500">
                                  {tx('還期', 'Due')} {eq.currentLoan.expectedReturn}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                {tx('可隨時借出', 'Ready for checkout')}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {eq.currentLoan ? (
                                <button
                                  type="button"
                                  onClick={() => setReturnItem(eq)}
                                  className="inline-flex h-8 min-w-[84px] items-center justify-center rounded-xl bg-emerald-600 px-3 font-extrabold text-white hover:bg-emerald-700 cursor-pointer"
                                >
                                  {tx('交還登記', 'Return')}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setCheckoutItem(eq)}
                                  className="inline-flex h-8 min-w-[84px] items-center justify-center rounded-xl bg-brand px-3 font-extrabold text-white hover:bg-brand-deep cursor-pointer"
                                >
                                  {tx('借出登記', 'Checkout')}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setHistoryEqCode(eq.code);
                                  setLoanView('history');
                                }}
                                className="inline-flex h-8 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 font-bold text-slate-700 hover:bg-slate-50 tabular-nums cursor-pointer"
                              >
                                <History className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>{logCount > 0 ? `${tx('紀錄', 'Logs')} · ${logCount}` : tx('紀錄', 'Logs')}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* Top KPI Filter Strip + Subtle PDF Quick-Preview Buttons */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-1">
              {(
                [
                  ['all', tx('全部儀器', 'All Instruments'), counts.total, 'text-slate-900'],
                  ['valid', tx('校準有效', 'Cal Valid'), counts.validCal, 'text-emerald-700'],
                  ['due_90', tx('90日內到期', 'Due ≤90d'), counts.due90Cal, 'text-amber-700'],
                  ['overdue', tx('已逾期', 'Overdue'), counts.overdueCal, 'text-rose-600'],
                  ['monthly', tx('FCC01 每月內檢', 'FCC01 Monthly'), counts.monthly, 'text-sky-700'],
                ] as const
              ).map(([k, label, num, color]) => {
                const active = !selectedBatchDate && calFilter === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setSelectedBatchDate(null);
                      setCalFilter(k);
                    }}
                    className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition cursor-pointer ${
                      active
                        ? 'border-brand bg-brand-wash/60 ring-2 ring-brand/20 shadow-2xs'
                        : 'border-slate-200/85 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-slate-700 truncate">{label}</span>
                    <span className={`font-mono text-lg font-extrabold tabular-nums ${color}`}>{num}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs shrink-0">
              <button
                type="button"
                onClick={() =>
                  openPreviewDoc({
                    title: tx('FQS38 年度校準及內檢時間表', 'FQS38 Calibration & Verification Schedule'),
                    url: '/server-docs/forms/FQS38_Calibration_Verification_Schedule_260520.pdf',
                    fileName: 'FQS38_Calibration_Verification_Schedule_260520.pdf',
                  })
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:border-brand hover:text-brand transition cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{tx('FQS38 校準時間表', 'FQS38 Schedule')}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  openPreviewDoc({
                    title: tx('FCC01 每月內檢紀錄 · 2026', 'FCC01 Monthly Verification Check Record · 2026'),
                    url: '/server-docs/forms/FCC01_Monthly_Check_Record_2026.pdf',
                    fileName: 'FCC01_Monthly_Check_Record_2026.pdf',
                  })
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:border-brand hover:text-brand transition cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{tx('FCC01 內檢紀錄', 'FCC01 Record')}</span>
              </button>
              {perms.canManageDocs && onOpenDriveBatch && (
                <button
                  type="button"
                  onClick={onOpenDriveBatch}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-extrabold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                >
                  <UploadCloud className="h-3.5 w-3.5 shrink-0" />
                  <span>{tx('批次上傳證書', 'Batch Upload')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Compact Visual Status Bar */}
          <CalibrationForecastPanel
            activeBucket={activeOverviewBucket}
            onSelectBucket={(b) => {
              setSelectedBatchDate(null);
              setCalFilter(b as CalFilterMode);
            }}
            selectedBatchDate={selectedBatchDate}
            onSelectBatchDate={(dt) => setSelectedBatchDate(dt)}
            onOpenDetail={(code) => setDetailCode(code)}
            onPreviewCert={openCertPreview}
          />

          {/* Search Bar + Test Filter Pills */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tx(
                  '搜尋儀器編號、名稱、S/N 或校準證書...',
                  'Search Equipment Code, Name, S/N or Cal Cert...'
                )}
                className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand shadow-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {TEST_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTagFilter(t)}
                  className={`rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 font-mono text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                    tagFilter === t
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t === 'ALL' ? tx('ALL 全部', 'ALL') : t}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Cards (< md) */}
          <div className="md:hidden space-y-2.5 text-xs">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center font-semibold text-slate-400">
                {tx('沒有符合篩選條件的儀器', 'No matching instruments found')}
              </div>
            ) : (
              filtered.map((eq) => {
                const tags = eq.testTags || eq.tests.split('+').map((s) => s.trim()).filter(Boolean);
                const status = getCalRowDisplay(eq);
                const hasCert = !!(eq.certUrl || eq.calCerts?.some((c) => c.dataUrl));
                return (
                  <div
                    key={eq.code}
                    onClick={() => setDetailCode(eq.code)}
                    className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white">
                        {eq.code}
                      </span>
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${status.badgeCls}`}>
                        {status.badgeText}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-sm font-bold text-slate-900 truncate">{eq.name}</div>
                      <div className="flex flex-wrap items-center gap-1">
                        {tags.map((tg) => (
                          <span
                            key={tg}
                            className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-extrabold whitespace-nowrap ${getTestChipClass(tg)}`}
                          >
                            {tg}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                      <div className="font-mono text-xs font-bold text-slate-700 tabular-nums">
                        Cal Due · {status.dateText}
                      </div>
                      {hasCert && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCertPreview(eq);
                          }}
                          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 font-extrabold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                        >
                          <Eye className="h-4 w-4 shrink-0" />
                          {tx('預覽證書', 'Preview Cert')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Clean 5-Column Desktop Table (hidden md:table) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            <table className="hidden md:table w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
                <tr className="whitespace-nowrap">
                  <th className="px-4 py-3.5 w-[130px]">{tx('儀器編號', 'Code')}</th>
                  <th className="px-4 py-3.5">{tx('儀器名稱', 'Instrument Name')}</th>
                  <th className="px-4 py-3.5 w-[200px]">{tx('適用測試', 'Applicable Tests')}</th>
                  <th className="px-4 py-3.5 w-[240px]">{tx('校準到期日及狀態', 'Cal Due & Status')}</th>
                  <th className="px-4 py-3.5 w-[140px] text-right">{tx('證書操作', 'Certificate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center font-semibold text-slate-400">
                      {tx('沒有符合篩選條件的儀器', 'No matching instruments found')}
                    </td>
                  </tr>
                ) : (
                  filtered.map((eq) => {
                    const tags = eq.testTags || eq.tests.split('+').map((s) => s.trim()).filter(Boolean);
                    const status = getCalRowDisplay(eq);
                    const hasCert = !!(eq.certUrl || eq.calCerts?.some((c) => c.dataUrl));
                    return (
                      <tr
                        key={eq.code}
                        onClick={() => setDetailCode(eq.code)}
                        className="hover:bg-slate-50/90 transition cursor-pointer"
                      >
                        {/* 1. 儀器編號 */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white">
                            {eq.code}
                          </span>
                        </td>

                        {/* 2. 儀器名稱 (Clean single-line; Maker / Model / S/N shown in Detail Drawer) */}
                        <td className="px-4 py-3.5 max-w-[320px]">
                          <div className="font-bold text-slate-900 truncate">{eq.name}</div>
                        </td>

                        {/* 3. 適用測試 */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex flex-wrap items-center gap-1">
                            {tags.map((tg) => (
                              <span
                                key={tg}
                                className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-extrabold whitespace-nowrap ${getTestChipClass(tg)}`}
                              >
                                {tg}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 4. 校準到期日及狀態 */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800 tabular-nums w-[82px]">
                              {status.dateText}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums whitespace-nowrap ${status.badgeCls}`}
                            >
                              {status.badgeText}
                            </span>
                          </div>
                        </td>

                        {/* 5. 證書操作 */}
                        <td
                          className="px-4 py-3.5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hasCert ? (
                            <button
                              type="button"
                              onClick={() => openCertPreview(eq)}
                              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 font-extrabold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 shrink-0" />
                              <span>{tx('預覽證書', 'Preview Cert')}</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 px-2">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <EquipmentDetailDrawer
        item={activeDetailItem}
        onClose={() => setDetailCode(null)}
        onOpenCheckout={() => {
          if (activeDetailItem) {
            setCheckoutItem(activeDetailItem);
            setDetailCode(null);
          }
        }}
        onOpenReturn={() => {
          if (activeDetailItem) {
            setReturnItem(activeDetailItem);
            setDetailCode(null);
          }
        }}
      />
      <EquipmentCheckoutModal item={checkoutItem} onClose={() => setCheckoutItem(null)} />
      <EquipmentReturnModal item={returnItem} onClose={() => setReturnItem(null)} />
      {newOpen && <NewEquipmentModal onClose={() => setNewOpen(false)} />}
      {qrModal && (
        <EquipmentQrModal
          initialMode={qrModal.mode}
          initialCode={qrModal.code}
          onClose={() => setQrModal(null)}
          onOpenCheckout={(eq) => setCheckoutItem(eq)}
          onOpenReturn={(eq) => setReturnItem(eq)}
          onOpenDetail={(code) => setDetailCode(code)}
        />
      )}
    </div>
  );
};
