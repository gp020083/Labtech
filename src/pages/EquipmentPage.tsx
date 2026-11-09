import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { EquipmentItem } from '../types';
import { getEquipmentCalStatus } from '../utils';
import { getLoanOverdueStatus } from '../utils/limsRules';
import { buildCalibrationForecast } from '../utils/limsProcessTools';
import { navigateToEquipmentCertPage, buildEquipmentCertStatusPath } from '../utils/equipmentQr';
import { Badge } from '../components/Badge';
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
  Wrench,
  Plus,
  Search,
  FileCheck2,
  UploadCloud,
  History,
  ClipboardList,
  Eye,
  CheckSquare,
  QrCode,
  CalendarClock,
  ArrowLeftRight,
  ShieldCheck,
} from 'lucide-react';

const TEST_TAGS = ['ALL', 'KD', 'SO', 'FC', 'BL', 'PO', 'PLT', 'VC'];

export const EquipmentPage: React.FC<{
  subSection?: EquipmentSubSectionId;
  onChangeSubSection?: (sub: EquipmentSubSectionId) => void;
  onOpenDriveBatch?: () => void;
}> = ({ subSection = 'loans', onChangeSubSection, onOpenDriveBatch }) => {
  const { equipment, loans, events, uploadEquipmentCalCert, openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const [activeSub, setActiveSub] = useState<EquipmentSubSectionId>(subSection);
  const [loanView, setLoanView] = useState<'list' | 'history'>('list');
  const [calView, setCalView] = useState<'registry' | 'forecast'>('registry');
  const [historyEqCode, setHistoryEqCode] = useState<string | null>(null);
  const [loanFilter, setLoanFilter] = useState<'all' | 'available' | 'loaned' | 'overdue'>('all');
  const [calFilter, setCalFilter] = useState<'all' | 'valid' | 'alert' | 'monthly'>('all');
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
  const counts = useMemo(() => {
    const loaned = inUseList.filter((e) => !!e.currentLoan).length;
    const overdue = inUseList.filter((e) => getLoanOverdueStatus(e).isOverdue).length;
    const available = inUseList.length - loaned;
    const alert = inUseList.filter((e) => {
      const c = getEquipmentCalStatus(e);
      return c.kind === 'warn' || c.kind === 'bad' || c.mismatch;
    }).length;
    const validCal = inUseList.length - alert;
    const monthly = inUseList.filter((e) => !!e.monthlyCheck).length;
    return { total: inUseList.length, available, loaned, overdue, validCal, alert, monthly };
  }, [inUseList]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inUseList.filter((e) => {
      const cal = getEquipmentCalStatus(e);
      const ov = getLoanOverdueStatus(e);
      if (activeSub === 'loans') {
        if (loanFilter === 'available' && e.currentLoan) return false;
        if (loanFilter === 'loaned' && !e.currentLoan) return false;
        if (loanFilter === 'overdue' && !ov.isOverdue) return false;
      } else {
        const isAlert = cal.kind === 'warn' || cal.kind === 'bad' || cal.mismatch;
        if (calFilter === 'valid' && isAlert) return false;
        if (calFilter === 'alert' && !isAlert) return false;
        if (calFilter === 'monthly' && !e.monthlyCheck) return false;
      }
      const tags = e.testTags || e.tests.split('+').map((s) => s.trim()).filter(Boolean);
      if (tagFilter !== 'ALL' && !tags.includes(tagFilter)) return false;
      if (!q) return true;
      const hay = `${e.code} ${e.name} ${e.maker} ${e.model} ${e.serial} ${e.loc} ${e.currentLoan?.siteLocation || ''} ${e.currentLoan?.borrowerName || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [inUseList, activeSub, loanFilter, calFilter, tagFilter, query]);

  const equipmentMap = useMemo(() => new Map(equipment.map((e) => [e.code, e])), [equipment]);
  const loanCountMap = useMemo(() => {
    const m = new Map<string, number>();
    loans.forEach((l) => m.set(l.equipmentCode, (m.get(l.equipmentCode) || 0) + 1));
    return m;
  }, [loans]);
  const activeDetailItem = detailCode ? equipmentMap.get(detailCode) || null : null;

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
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-3 py-1 text-[11px] font-extrabold text-brand-deep">
            <Wrench className="h-3.5 w-3.5" /> EQUIPMENT MANAGEMENT · LOAN &amp; CALIBRATION
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            {activeSub === 'loans'
              ? tx('儀器管理 · 1. 儀器借還管理 (Loan & Checkout)', 'Equipment · 1. Loan & Checkout Management')
              : tx('儀器管理 · 2. 校準及證書管理 (Calibration & Certs)', 'Equipment · 2. Calibration & Certificate Registry')}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {activeSub === 'loans'
              ? tx(
                  '集中處理在用儀器之借出登記 (Checkout)、交還驗收 (Return)、QR 標籤掃描及查閱借還歷史紀錄。',
                  'Manage active testing instruments, record Checkout / Return logs, scan QR labels, and review loan history.'
                )
              : tx(
                  '集中查閱各受控儀器之校準狀態 (Calibration Status)、校準到期預警 (30/60/90日)、FCC01 月檢及上傳最新校準證書 PDF。',
                  'Monitor instrument calibration status, 30/60/90-day due forecast, FCC01 monthly checks, and upload Calibration Certificates.'
                )}
          </p>
        </div>

        <div className="inline-flex flex-wrap rounded-2xl bg-slate-100 p-1.5 ring-1 ring-slate-200/80 shrink-0 gap-1">
          <button
            type="button"
            onClick={() => handleSelectSub('loans')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
              activeSub === 'loans'
                ? 'bg-brand text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>{tx(`1. 儀器借還管理 (${counts.loaned}/${counts.total})`, `1. Loan & Checkout (${counts.loaned}/${counts.total})`)}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSub('calibration')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
              activeSub === 'calibration'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{tx(`2. 校準及證書管理 (${counts.alert > 0 ? `預警 ${counts.alert}` : counts.total})`, `2. Calibration & Certs (${counts.total})`)}</span>
          </button>
        </div>
      </div>

      {activeSub === 'loans' ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {([
              ['all', tx('全部在用儀器', 'All In-Use'), counts.total, 'text-slate-900'],
              ['available', tx('在庫可借用', 'Available in Lab'), counts.available, 'text-emerald-700'],
              ['loaned', tx('借出中儀器', 'On Site (Loaned)'), counts.loaned, 'text-brand-deep'],
              ['overdue', tx('逾期未還儀器', 'Overdue Loans'), counts.overdue, 'text-rose-600'],
            ] as const).map(([k, label, num, color]) => (
              <button
                key={k}
                type="button"
                onClick={() => { setLoanView('list'); setLoanFilter(k); }}
                className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                  loanView === 'list' && loanFilter === k ? 'border-brand bg-brand-wash/60 ring-2 ring-brand/20' : 'border-slate-200/85 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-[11px] font-bold text-slate-500 leading-snug">{label}</div>
                <div className={`mt-1 font-mono text-2xl font-extrabold ${color}`}>{num}</div>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => { setLoanView('list'); setHistoryEqCode(null); }}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
                loanView === 'list' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              {tx(`儀器借還清單 (${counts.total})`, `Loan & Checkout List (${counts.total})`)}
            </button>
            <button
              type="button"
              onClick={() => setLoanView('history')}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
                loanView === 'history' ? 'bg-brand text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <History className="h-4 w-4" />
              {tx(`借出／交還歷史紀錄 (${loans.length})`, `Checkout / Return History (${loans.length})`)}
            </button>
            <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => openPreviewDoc({ title: tx('FQS50 儀器借出及交還登記表範本', 'FQS50 Record of Loan of Equipment Template'), url: '/server-docs/forms/FQS50_Loan_of_Equipment_template.doc', fileName: 'FQS50_Loan_of_Equipment_template.doc' })}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:border-brand hover:text-brand cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span>{tx('FQS50 借還登記表範本', 'FQS50 Loan Form')}</span>
              </button>
              <button
                type="button"
                onClick={() => setQrModal({ mode: 'lookup' })}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 font-extrabold text-white hover:bg-slate-800 cursor-pointer"
              >
                <QrCode className="h-3.5 w-3.5" />
                {tx('QR 掃描借還／列印標籤', 'QR Scan & Labels')}
              </button>
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 font-extrabold text-white hover:bg-brand-deep cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                {tx('新增儀器', 'Add Equipment')}
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
                    placeholder={tx('搜尋儀器編號 (Code)、名稱、序號 (S/N)、借用人或工程地點...', 'Search Equipment Code, Name, S/N, Borrower or Site...')}
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand shadow-xs"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {TEST_TAGS.map((t) => (
                    <button key={t} type="button" onClick={() => setTagFilter(t)} className={`rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 font-mono text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${tagFilter === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
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
                onOpenHistory={(code) => { setHistoryEqCode(code); setLoanView('history'); }}
                onPreviewCert={(eq) => openPreviewDoc({ title: `${eq.code} — ${eq.certFile || 'Cal Cert'}`, url: eq.certUrl!, fileName: eq.certFile, subtitle: `${eq.name} (S/N: ${eq.serial}) · Due: ${eq.certDue || eq.due}` })}
                onQuickUpload={handleQuickCalUpload}
              />

              <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/85 bg-white shadow-xs">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
                    <tr className="whitespace-nowrap">
                      <th className="px-4 py-3">Code</th>
                      <th className="px-3 py-3">{tx('儀器名稱、型號及 S/N', 'Instrument, Model & S/N')}</th>
                      <th className="px-3 py-3">{tx('適用測試', 'Test Tags')}</th>
                      <th className="px-3 py-3">{tx('目前狀態及存放／借出位置', 'Current Status & Location')}</th>
                      <th className="px-3 py-3">{tx('借用人及預計歸還日期', 'Borrower & Expected Return')}</th>
                      <th className="px-4 py-3 text-right">{tx('借出／交還操作', 'Loan Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((eq) => {
                      const ov = getLoanOverdueStatus(eq, undefined, lang);
                      const tags = eq.testTags || eq.tests.split('+').map((s) => s.trim()).filter(Boolean);
                      const shortBorrower = eq.currentLoan?.borrowerName
                        ? (eq.currentLoan.borrowerName.split(',')[1]?.trim() || eq.currentLoan.borrowerName)
                        : '';
                      return (
                        <tr
                          key={eq.code}
                          onClick={() => setDetailCode(eq.code)}
                          className="hover:bg-brand-wash/35 transition cursor-pointer"
                        >
                          <td className="px-4 py-3 font-mono font-extrabold text-slate-900 whitespace-nowrap">
                            <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-extrabold text-white">
                              {eq.code}
                            </span>
                          </td>
                          <td className="px-3 py-3 min-w-[220px]">
                            <div className="font-extrabold text-slate-900 hover:text-brand">{eq.name}</div>
                            <div className="font-mono text-[11px] text-slate-500">{eq.maker} · {eq.model} ｜ S/N {eq.serial}</div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              {tags.map((tg) => <span key={tg} className="rounded bg-brand-wash px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-brand-deep whitespace-nowrap">{tg}</span>)}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {eq.currentLoan ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-brand-deep">{eq.currentLoan.siteLocation}</span>
                                {ov.isOverdue && (
                                  <span className="rounded-md bg-rose-100 border border-rose-300 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-rose-700">
                                    {ov.label}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="font-semibold text-emerald-700 whitespace-nowrap">{tx('在庫：', 'In Lab: ')}{eq.loc || eq.store || 'Lab'}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {eq.currentLoan ? (
                              <div className="text-[11px] text-slate-700 font-semibold">
                                {shortBorrower} · <span className="font-mono text-slate-500">{tx('預計歸還', 'Due')} {eq.currentLoan.expectedReturn}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">{tx('可隨時借出 (Available)', 'Available for Checkout')}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-grid grid-cols-[88px_114px_34px] items-center justify-end gap-1.5">
                              {eq.currentLoan ? (
                                <button type="button" onClick={() => setReturnItem(eq)} className="inline-flex h-8 w-[88px] items-center justify-center rounded-xl bg-emerald-600 font-extrabold text-white hover:bg-emerald-700 cursor-pointer">{tx('交還登記', 'Return')}</button>
                              ) : (
                                <button type="button" onClick={() => setCheckoutItem(eq)} className="inline-flex h-8 w-[88px] items-center justify-center rounded-xl bg-brand font-extrabold text-white hover:bg-brand-deep cursor-pointer">{tx('借出登記', 'Checkout')}</button>
                              )}
                              <button
                                type="button"
                                onClick={() => { setHistoryEqCode(eq.code); setLoanView('history'); }}
                                className="inline-flex h-8 w-[114px] items-center justify-center gap-1 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 tabular-nums cursor-pointer"
                              >
                                <History className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                <span>{tx('借還紀錄', 'Logs')}{loanCountMap.get(eq.code) ? ` (${loanCountMap.get(eq.code)})` : ''}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setQrModal({ mode: 'labels', code: eq.code })}
                                title={tx(`檢視／列印 ${eq.code} QR 標籤`, `View / Print ${eq.code} QR Label`)}
                                className="inline-flex h-8 w-[34px] items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-brand cursor-pointer"
                              >
                                <QrCode className="h-3.5 w-3.5" />
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
              {([
                ['all', tx('校準及證書總表', 'Cert Registry (All)'), counts.total, 'text-slate-900', false],
                ['valid', tx('校準有效儀器', 'Valid Calibrated'), counts.validCal, 'text-emerald-700', false],
                ['monthly', tx('FCC01 每月內檢', 'FCC01 Monthly'), counts.monthly, 'text-indigo-700', false],
                ['forecast', tx('📅 30/60/90日外校預警', '📅 30/60/90d Forecast'), calForecast.counts.totalWithin90, 'text-amber-700', true],
              ] as const).map(([k, label, num, color, isForecast]) => {
                const active = isForecast ? calView === 'forecast' : calView === 'registry' && calFilter === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (isForecast) {
                        setCalView('forecast');
                      } else {
                        setCalView('registry');
                        setCalFilter(k);
                      }
                    }}
                    className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition cursor-pointer ${
                      active
                        ? 'border-brand bg-brand-wash/70 ring-2 ring-brand/20 shadow-2xs'
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
              <button type="button" onClick={() => openPreviewDoc({ title: tx('FQS38 年度校準及內檢時間表', 'FQS38 Calibration & Verification Schedule'), url: '/server-docs/forms/FQS38_Calibration_Verification_Schedule_260520.pdf', fileName: 'FQS38_Calibration_Verification_Schedule_260520.pdf' })} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:border-brand hover:text-brand cursor-pointer">
                <Eye className="h-3.5 w-3.5 shrink-0" /> <span>{tx('FQS38 時間表', 'FQS38')}</span>
              </button>
              <button type="button" onClick={() => openPreviewDoc({ title: tx('FCC01 (2026) 每月內檢紀錄', 'FCC01 (2026) Monthly Verification Check Record'), url: '/server-docs/forms/FCC01_Monthly_Check_Record_2026.pdf', fileName: 'FCC01_Monthly_Check_Record_2026.pdf' })} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:border-brand hover:text-brand cursor-pointer">
                <Eye className="h-3.5 w-3.5 shrink-0" /> <span>{tx('FCC01 內檢紀錄', 'FCC01')}</span>
              </button>
              {onOpenDriveBatch && (
                <button
                  type="button"
                  onClick={onOpenDriveBatch}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 font-extrabold text-emerald-900 hover:bg-emerald-100 cursor-pointer"
                >
                  <UploadCloud className="h-3.5 w-3.5" /> {tx('批次上傳證書', 'Batch Upload')}
                </button>
              )}
            </div>
          </div>
          {calView === 'forecast' ? (
            <CalibrationForecastPanel
              onOpenDetail={(code) => setDetailCode(code)}
              onPreviewCert={(eq) =>
                eq.certUrl &&
                openPreviewDoc({
                  title: `${eq.code} — ${eq.certFile || 'Cal Cert'}`,
                  url: eq.certUrl,
                  fileName: eq.certFile,
                  subtitle: `${eq.name} (S/N: ${eq.serial}) · Due: ${eq.certDue || eq.due}`,
                })
              }
            />
          ) : (
            <>
              <CalibrationForecastPanel
                compact
                onExpandFullPlanner={() => setCalView('forecast')}
                onOpenDetail={(code) => setDetailCode(code)}
                onPreviewCert={(eq) =>
                  eq.certUrl &&
                  openPreviewDoc({
                    title: `${eq.code} — ${eq.certFile || 'Cal Cert'}`,
                    url: eq.certUrl,
                    fileName: eq.certFile,
                    subtitle: `${eq.name} (S/N: ${eq.serial}) · Due: ${eq.certDue || eq.due}`,
                  })
                }
              />

              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={tx('搜尋儀器編號 (Code)、名稱、序號 (S/N) 或校準證書...', 'Search Equipment Code, Name, S/N or Cal Cert...')}
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand shadow-xs"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {TEST_TAGS.map((t) => (
                    <button key={t} type="button" onClick={() => setTagFilter(t)} className={`rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 font-mono text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${tagFilter === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {t === 'ALL' ? tx('ALL 全部', 'ALL') : t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-200/85 bg-white shadow-xs">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
                    <tr className="whitespace-nowrap">
                      <th className="px-4 py-3">Code</th>
                      <th className="px-3 py-3">{tx('儀器名稱、型號及 S/N', 'Instrument, Model & S/N')}</th>
                      <th className="px-3 py-3">{tx('校準狀態 (Calibration Status)', 'Calibration Status')}</th>
                      <th className="px-3 py-3">{tx('校準到期日 (Cal Due Date)', 'Cal Due Date')}</th>
                      <th className="px-3 py-3">{tx('內檢及驗證要求', 'Verification / Check')}</th>
                      <th className="px-3 py-3">{tx('最新校準證書檔案', 'Latest Cal Cert PDF')}</th>
                      <th className="px-4 py-3 text-right">{tx('證書及校準操作', 'Calibration Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((eq) => {
                      const cal = getEquipmentCalStatus(eq, undefined, lang);
                      const tags = eq.testTags || eq.tests.split('+').map((s) => s.trim()).filter(Boolean);
                      return (
                        <tr
                          key={eq.code}
                          onClick={() => setDetailCode(eq.code)}
                          className="hover:bg-brand-wash/35 transition cursor-pointer"
                        >
                          <td className="px-4 py-3 font-mono font-extrabold text-slate-900 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => navigateToEquipmentCertPage(eq.code)}
                              title={tx(`開啟專屬校準認證狀態頁 (${buildEquipmentCertStatusPath(eq.code)})`, `Open Cert Status Page (${buildEquipmentCertStatusPath(eq.code)})`)}
                              className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-extrabold text-white hover:bg-brand transition cursor-pointer"
                            >
                              {eq.code}
                            </button>
                          </td>
                          <td className="px-3 py-3 min-w-[220px]">
                            <div className="font-extrabold text-slate-900 hover:text-brand">{eq.name}</div>
                            <div className="font-mono text-[11px] text-slate-500">{eq.maker} · {eq.model} ｜ S/N {eq.serial}</div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <Badge tone={cal.kind}>{cal.label}</Badge>
                          </td>
                          <td className="px-3 py-3 font-mono font-extrabold text-slate-800 whitespace-nowrap">
                            {eq.certDue || eq.due || '—'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {tags.map((tg) => <span key={tg} className="rounded bg-brand-wash px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-brand-deep">{tg}</span>)}
                              {eq.monthlyCheck && (
                                <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
                                  {tx('FCC01 每月內檢', 'FCC01 Monthly')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px] text-slate-600 truncate max-w-[200px]">
                            {eq.certFile || (eq.certUrl ? 'Calibration_Cert.pdf' : tx('尚未上傳證書', 'No Cert Uploaded'))}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-grid grid-cols-[92px_90px_78px] items-center justify-end gap-1.5">
                              {eq.certUrl ? (
                                <button
                                  type="button"
                                  onClick={() => openPreviewDoc({ title: `${eq.code} — ${eq.certFile || 'Cal Cert'}`, url: eq.certUrl!, fileName: eq.certFile, subtitle: `${eq.name} (S/N: ${eq.serial}) · Due: ${eq.certDue || eq.due}` })}
                                  className="inline-flex h-8 w-[92px] items-center justify-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 font-extrabold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 shrink-0" /> {tx('預覽證書', 'Preview')}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex h-8 w-[92px] items-center justify-center gap-1 rounded-xl border border-slate-100 bg-slate-50 font-semibold text-slate-300 cursor-not-allowed"
                                >
                                  <Eye className="h-3.5 w-3.5 shrink-0" /> {tx('無證書', 'No Cert')}
                                </button>
                              )}
                              <label title={tx('上傳新校準證書 PDF (支援多選)', 'Upload Calibration Cert PDF')} className="inline-flex h-8 w-[90px] items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:border-brand hover:text-brand cursor-pointer">
                                <UploadCloud className="h-3.5 w-3.5 shrink-0" />
                                <span>{tx('上傳證書', 'Upload')}</span>
                                <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={(ev) => handleQuickCalUpload(eq, ev)} className="hidden" />
                              </label>
                              <button
                                type="button"
                                onClick={() => navigateToEquipmentCertPage(eq.code)}
                                className="inline-flex h-8 w-[78px] items-center justify-center gap-1 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {tx('認證頁', 'Status')}
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
      )}

      <EquipmentDetailDrawer item={activeDetailItem} onClose={() => setDetailCode(null)} onOpenCheckout={() => { if (activeDetailItem) { setCheckoutItem(activeDetailItem); setDetailCode(null); } }} onOpenReturn={() => { if (activeDetailItem) { setReturnItem(activeDetailItem); setDetailCode(null); } }} />
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
