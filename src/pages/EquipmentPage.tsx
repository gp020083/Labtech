import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { EquipmentItem } from '../types';
import { getEquipmentCalStatus } from '../utils';
import { getLoanOverdueStatus } from '../utils/limsRules';
import { buildCalibrationForecast } from '../utils/limsProcessTools';
import { navigateToEquipmentCertPage, buildEquipmentCertStatusPath } from '../utils/equipmentQr';
import { Badge } from '../components/Badge';
import { EquipmentCheckoutModal } from '../components/EquipmentCheckoutModal';
import { EquipmentReturnModal } from '../components/EquipmentReturnModal';
import { EquipmentDetailDrawer } from '../components/EquipmentDetailDrawer';
import { NewEquipmentModal } from '../components/NewEquipmentModal';
import { EquipmentHistoryTable } from '../components/EquipmentHistoryTable';
import { EquipmentMobileList } from '../components/EquipmentMobileList';
import { EquipmentQrModal } from '../components/EquipmentQrModal';
import { CalibrationForecastPanel } from '../components/CalibrationForecastPanel';
import { Wrench, Plus, Search, FileCheck2, UploadCloud, History, ClipboardList, Eye, CheckSquare, QrCode, CalendarClock } from 'lucide-react';

const TEST_TAGS = ['ALL', 'KD', 'SO', 'FC', 'BL', 'PO', 'PLT', 'VC'];

export const EquipmentPage: React.FC<{ onOpenDriveBatch?: () => void }> = ({ onOpenDriveBatch }) => {
  const { equipment, loans, events, uploadEquipmentCalCert, openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const [activeTab, setActiveTab] = useState<'list' | 'history' | 'forecast'>('list');
  const [historyEqCode, setHistoryEqCode] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'loaned' | 'overdue' | 'alert' | 'monthly'>('all');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<EquipmentItem | null>(null);
  const [returnItem, setReturnItem] = useState<EquipmentItem | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [qrModal, setQrModal] = useState<{ mode: 'lookup' | 'labels'; code?: string | null } | null>(null);

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
    const monthly = inUseList.filter((e) => !!e.monthlyCheck).length;
    return { total: inUseList.length, available, loaned, overdue, alert, monthly };
  }, [inUseList]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inUseList.filter((e) => {
      const cal = getEquipmentCalStatus(e);
      const ov = getLoanOverdueStatus(e);
      if (statusFilter === 'available' && e.currentLoan) return false;
      if (statusFilter === 'loaned' && !e.currentLoan) return false;
      if (statusFilter === 'overdue' && !ov.isOverdue) return false;
      if (statusFilter === 'alert' && cal.kind !== 'warn' && cal.kind !== 'bad' && !cal.mismatch) return false;
      if (statusFilter === 'monthly' && !e.monthlyCheck) return false;
      const tags = e.testTags || e.tests.split('+').map((s) => s.trim()).filter(Boolean);
      if (tagFilter !== 'ALL' && !tags.includes(tagFilter)) return false;
      if (!q) return true;
      const hay = `${e.code} ${e.name} ${e.maker} ${e.model} ${e.serial} ${e.loc} ${e.currentLoan?.siteLocation || ''} ${e.currentLoan?.borrowerName || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [inUseList, statusFilter, tagFilter, query]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-3 py-1 text-[11px] font-extrabold text-brand-deep">
            <Wrench className="h-3.5 w-3.5" /> FIELD EQUIPMENT &amp; CALIBRATION
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            {tx('Equipment 器材借還及 Cal Cert 清單', 'Equipment Loan & Calibration Registry')}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {tx('集中管理在用測試器材、登記 Checkout / Return 借還紀錄，以及查閱與上傳最新 Cal Cert 到期日。', 'Manage active testing instruments, record Checkout / Return logs, and verify or upload latest Cal Certs.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setQrModal({ mode: 'lookup' })}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-300 bg-slate-900 px-3.5 py-3 text-xs font-extrabold text-white hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <QrCode className="h-4 w-4" /> {tx('📷 QR 掃描借還／列印貼紙', '📷 QR Scan & Labels')}
          </button>
          {onOpenDriveBatch && (
            <button
              type="button"
              onClick={onOpenDriveBatch}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-brand/30 bg-brand-wash px-3.5 py-3 text-xs font-extrabold text-brand-deep hover:bg-brand-wash/80 cursor-pointer whitespace-nowrap"
            >
              <UploadCloud className="h-4 w-4" /> {tx('批次上傳多份 Cal Cert 至 Drive', 'Batch Upload to Drive')}
            </button>
          )}
          <button type="button" onClick={() => setNewOpen(true)} className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-brand-deep cursor-pointer whitespace-nowrap">
            <Plus className="h-4 w-4" /> {tx('新增 Equipment', 'Add Equipment')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {([
          ['all', tx('全部在用器材', 'All In-Use'), counts.total, 'text-slate-900'],
          ['available', tx('🏠 在庫可借用', '🏠 Available in Lab'), counts.available, 'text-emerald-700'],
          ['loaned', tx('📍 借出中器材', '📍 On Site (Loaned)'), counts.loaned, 'text-brand-deep'],
          ['overdue', tx('🚨 逾期未還器材', '🚨 Overdue Loans'), counts.overdue, 'text-rose-600'],
          ['alert', tx('⚠️ 校準到期提示', '⚠️ Cal Due / Alert'), counts.alert, 'text-amber-700'],
        ] as const).map(([k, label, num, color]) => (
          <button
            key={k}
            type="button"
            onClick={() => { setActiveTab('list'); setStatusFilter(k); }}
            className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
              activeTab === 'list' && statusFilter === k ? 'border-brand bg-brand-wash/60 ring-2 ring-brand/20' : 'border-slate-200/85 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="text-[11px] font-bold text-slate-500 truncate whitespace-nowrap">{label}</div>
            <div className={`mt-1 font-mono text-2xl font-extrabold ${color}`}>{num}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => { setActiveTab('list'); setHistoryEqCode(null); }}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'list' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          {tx(`器材清單 Equipment List (${counts.total})`, `Equipment List (${counts.total})`)}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'history' ? 'bg-brand text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <History className="h-4 w-4" />
          {tx(`借出／交還紀錄 History (${loans.length})`, `Checkout / Return History (${loans.length})`)}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('forecast')}
          className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'forecast' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
          }`}
        >
          <CalendarClock className="h-4 w-4" />
          {tx(`📅 校準到期預警 (30/60/90日 · ${calForecast.counts.totalWithin90})`, `📅 Cal Forecast (30/60/90d · ${calForecast.counts.totalWithin90})`)}
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('list'); setStatusFilter(statusFilter === 'monthly' ? 'all' : 'monthly'); }}
          className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'list' && statusFilter === 'monthly' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          {tx(`FCC01 每月內檢清單 (${counts.monthly})`, `FCC01 Monthly Check (${counts.monthly})`)}
        </button>
        <div className="w-full sm:w-auto sm:ml-auto grid grid-cols-3 sm:flex items-center gap-1.5 text-[11px]">
          <button type="button" onClick={() => openPreviewDoc({ title: tx('FQS38 年度校準及內檢時間表', 'FQS38 Calibration & Verification Schedule'), url: '/server-docs/forms/FQS38_Calibration_Verification_Schedule_260520.pdf', fileName: 'FQS38_Calibration_Verification_Schedule_260520.pdf' })} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 font-bold text-slate-700 hover:border-brand hover:text-brand cursor-pointer">
            <Eye className="h-3 w-3 shrink-0" /> <span className="truncate">{tx('FQS38 時間表', 'FQS38')}</span>
          </button>
          <button type="button" onClick={() => openPreviewDoc({ title: tx('FCC01 (2026) 每月內檢紀錄', 'FCC01 (2026) Monthly Verification Check Record'), url: '/server-docs/forms/FCC01_Monthly_Check_Record_2026.pdf', fileName: 'FCC01_Monthly_Check_Record_2026.pdf' })} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 font-bold text-slate-700 hover:border-brand hover:text-brand cursor-pointer">
            <Eye className="h-3 w-3 shrink-0" /> <span className="truncate">{tx('FCC01 月檢', 'FCC01')}</span>
          </button>
          <button type="button" onClick={() => openPreviewDoc({ title: tx('FQS50 儀器借出及交還登記表範本', 'FQS50 Record of Loan of Equipment Template'), url: '/server-docs/forms/FQS50_Loan_of_Equipment_template.doc', fileName: 'FQS50_Loan_of_Equipment_template.doc' })} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 font-bold text-slate-700 hover:border-brand hover:text-brand cursor-pointer">
            <Eye className="h-3 w-3 shrink-0" /> <span className="truncate">{tx('FQS50 借還表', 'FQS50')}</span>
          </button>
        </div>
      </div>

      {activeTab === 'forecast' ? (
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
      ) : activeTab === 'history' ? (
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
          <CalibrationForecastPanel
            compact
            onExpandFullPlanner={() => setActiveTab('forecast')}
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
            placeholder={tx('Search Equipment Code / Name / S/N / Operator / Site...', 'Search Code / Name / S/N / Borrower / Site...')}
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
        onOpenHistory={(code) => { setHistoryEqCode(code); setActiveTab('history'); }}
        onPreviewCert={(eq) => openPreviewDoc({ title: `${eq.code} — ${eq.certFile || 'Cal Cert'}`, url: eq.certUrl!, fileName: eq.certFile, subtitle: `${eq.name} (S/N: ${eq.serial}) · Due: ${eq.certDue || eq.due}` })}
        onQuickUpload={handleQuickCalUpload}
      />

      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/85 bg-white shadow-xs">
        <table className="w-full min-w-[960px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
            <tr className="whitespace-nowrap">
              <th className="px-4 py-3">Code</th>
              <th className="px-3 py-3">{tx('器材名稱、型號及 S/N', 'Instrument, Model & S/N')}</th>
              <th className="px-3 py-3">{tx('適用測試', 'Test Tags')}</th>
              <th className="px-3 py-3">{tx('Cal 狀態及到期日', 'Cal Status & Due')}</th>
              <th className="px-3 py-3">{tx('現存位置／借用人', 'Location / Borrower')}</th>
              <th className="px-4 py-3 text-right">{tx('借還及證書操作', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((eq) => {
              const cal = getEquipmentCalStatus(eq, undefined, lang);
              const ov = getLoanOverdueStatus(eq, undefined, lang);
              const tags = eq.testTags || eq.tests.split('+').map((s) => s.trim()).filter(Boolean);
              const shortBorrower = eq.currentLoan?.borrowerName
                ? (eq.currentLoan.borrowerName.split(',')[1]?.trim() || eq.currentLoan.borrowerName)
                : '';
              return (
                <tr key={eq.code} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-mono font-extrabold text-slate-900 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => navigateToEquipmentCertPage(eq.code)}
                      title={tx(`開啟專屬校準認證狀態頁 (${buildEquipmentCertStatusPath(eq.code)})`, `Open Cert Status Page (${buildEquipmentCertStatusPath(eq.code)})`)}
                      className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-extrabold text-white hover:bg-brand transition cursor-pointer"
                    >
                      {eq.code}
                    </button>
                  </td>
                  <td className="px-3 py-3 min-w-[220px] cursor-pointer" onClick={() => setDetailCode(eq.code)}>
                    <div className="font-extrabold text-slate-900 hover:text-brand">{eq.name}</div>
                    <div className="font-mono text-[11px] text-slate-500">{eq.maker} · {eq.model} ｜ S/N {eq.serial}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      {tags.map((tg) => <span key={tg} className="rounded bg-brand-wash px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-brand-deep whitespace-nowrap">{tg}</span>)}
                      {eq.monthlyCheck && <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700 whitespace-nowrap">{tx('FCC01月檢', 'FCC01 Monthly')}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Badge tone={cal.kind}>{cal.label}</Badge>
                      {(eq.certUrl || (eq.calCerts?.length || 0) > 0) && <span className="font-mono text-[10px] font-bold text-emerald-700 whitespace-nowrap">✓Cert</span>}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">{eq.certDue || eq.due}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {eq.currentLoan ? (
                      <div className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-brand-deep">📍 {eq.currentLoan.siteLocation}</span>
                          {ov.isOverdue && (
                            <span className="rounded-md bg-rose-100 border border-rose-300 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-rose-700">
                              🚨 {ov.label}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{shortBorrower} · {tx('預計歸還', 'Due')} {eq.currentLoan.expectedReturn}</div>
                      </div>
                    ) : (
                      <span className="font-semibold text-emerald-700 whitespace-nowrap">🏠 {eq.loc || eq.store || 'Lab'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-grid grid-cols-[5.25rem_5.75rem_6rem_4.75rem_2rem_2rem] items-center gap-1.5 whitespace-nowrap">
                      {eq.currentLoan ? (
                        <button type="button" onClick={() => setReturnItem(eq)} className="inline-flex h-8 w-full items-center justify-center rounded-xl bg-emerald-600 px-2 font-extrabold text-white hover:bg-emerald-700 whitespace-nowrap cursor-pointer">{tx('交還', 'Return')}</button>
                      ) : (
                        <button type="button" onClick={() => setCheckoutItem(eq)} className="inline-flex h-8 w-full items-center justify-center rounded-xl bg-brand px-2 font-extrabold text-white hover:bg-brand-deep whitespace-nowrap cursor-pointer">{tx('借出', 'Checkout')}</button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setHistoryEqCode(eq.code); setActiveTab('history'); }}
                        className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 font-bold text-slate-700 hover:bg-slate-50 whitespace-nowrap tabular-nums cursor-pointer"
                      >
                        <History className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>{tx('紀錄', 'Log')}{loanCountMap.get(eq.code) ? ` (${loanCountMap.get(eq.code)})` : ''}</span>
                      </button>
                      {eq.certUrl ? (
                        <button
                          type="button"
                          onClick={() => openPreviewDoc({ title: `${eq.code} — ${eq.certFile || 'Cal Cert'}`, url: eq.certUrl!, fileName: eq.certFile, subtitle: `${eq.name} (S/N: ${eq.serial}) · Due: ${eq.certDue || eq.due}` })}
                          title={tx('預覽最新 Cal Cert PDF', 'Preview Latest Cal Cert PDF')}
                          className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2 font-extrabold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 shrink-0" /> {tx('預覽 Cert', 'Preview')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-xl border border-slate-100 bg-slate-50 px-2 font-semibold text-slate-300 whitespace-nowrap cursor-not-allowed"
                        >
                          <Eye className="h-3.5 w-3.5 shrink-0" /> {tx('無 Cert', 'No Cert')}
                        </button>
                      )}
                      <button type="button" onClick={() => setDetailCode(eq.code)} className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 font-bold text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer">
                        <FileCheck2 className="h-3.5 w-3.5 text-brand shrink-0" /> {tx('詳情', 'Details')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrModal({ mode: 'labels', code: eq.code })}
                        title={tx(`檢視／列印 ${eq.code} QR 標籤`, `View / Print ${eq.code} QR Label`)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-brand cursor-pointer"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                      </button>
                      <label title={tx('上傳 Cal Cert (支援多選)', 'Upload Cal Cert (Multi-file)')} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-brand cursor-pointer">
                        <UploadCloud className="h-3.5 w-3.5" />
                        <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={(ev) => handleQuickCalUpload(eq, ev)} className="hidden" />
                      </label>
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
