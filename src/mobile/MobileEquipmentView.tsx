import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { EquipmentItem } from '../types';
import { getEquipmentCalStatus } from '../utils';
import { getLoanOverdueStatus } from '../utils/limsRules';
import { buildCalibrationForecast } from '../utils/limsProcessTools';
import { navigateToEquipmentCertPage } from '../utils/equipmentQr';
import { Badge } from '../components/Badge';
import { MobileEquipmentSheet } from './MobileEquipmentSheet';
import { LoanDetailModal } from '../components/LoanDetailModal';
import { EquipmentCheckoutModal } from '../components/EquipmentCheckoutModal';
import { EquipmentReturnModal } from '../components/EquipmentReturnModal';
import { NewEquipmentModal } from '../components/NewEquipmentModal';
import { EquipmentQrModal } from '../components/EquipmentQrModal';
import { CalibrationForecastPanel } from '../components/CalibrationForecastPanel';
import { Plus, Search, Eye, FileCheck2, UploadCloud, History, ChevronRight, QrCode, CalendarClock } from 'lucide-react';

const TEST_TAGS = ['ALL', 'KD', 'SO', 'FC', 'BL', 'PO', 'PLT', 'VC'];

export const MobileEquipmentView: React.FC = () => {
  const { equipment, loans, events, uploadEquipmentCalCert, openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const [subTab, setSubTab] = useState<'list' | 'history' | 'forecast'>('list');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'loaned' | 'overdue' | 'alert' | 'monthly'>('all');
  const [tagFilter, setTagFilter] = useState<string>('ALL');
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<EquipmentItem | null>(null);
  const [returnItem, setReturnItem] = useState<EquipmentItem | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [qrModal, setQrModal] = useState<{ mode: 'lookup' | 'labels'; code?: string | null } | null>(null);

  const inUseList = useMemo(() => equipment.filter((e) => e.inUse !== 'N'), [equipment]);
  const eqMap = useMemo(() => new Map(equipment.map((e) => [e.code, e])), [equipment]);
  const calForecast = useMemo(() => buildCalibrationForecast(equipment, events), [equipment, events]);

  const counts = useMemo(() => {
    const loaned = inUseList.filter((e) => !!e.currentLoan).length;
    const overdue = inUseList.filter((e) => getLoanOverdueStatus(e).isOverdue).length;
    const alert = inUseList.filter((e) => {
      const c = getEquipmentCalStatus(e);
      return c.kind === 'warn' || c.kind === 'bad' || c.mismatch;
    }).length;
    const monthly = inUseList.filter((e) => e.monthlyCheck).length;
    return { total: inUseList.length, loaned, overdue, alert, monthly };
  }, [inUseList]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inUseList.filter((e) => {
      if (statusFilter === 'loaned' && !e.currentLoan) return false;
      if (statusFilter === 'overdue' && !getLoanOverdueStatus(e).isOverdue) return false;
      if (statusFilter === 'monthly' && !e.monthlyCheck) return false;
      if (statusFilter === 'alert') {
        const c = getEquipmentCalStatus(e);
        if (c.kind !== 'warn' && c.kind !== 'bad' && !c.mismatch) return false;
      }
      if (tagFilter !== 'ALL') {
        const tags = e.testTags || e.tests.split('+').map((s) => s.trim());
        if (!tags.includes(tagFilter)) return false;
      }
      if (!q) return true;
      return `${e.code} ${e.name} ${e.maker} ${e.model} ${e.serial} ${e.loc} ${e.currentLoan?.borrowerName || ''} ${e.currentLoan?.siteLocation || ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [inUseList, query, statusFilter, tagFilter]);

  const handleQuickCalUpload = (eq: EquipmentItem, ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      uploadEquipmentCalCert({
        code: eq.code,
        fileName: f.name,
        fileSize: `${Math.max(1, Math.round(f.size / 1024))} KB`,
        dueDate: eq.certDue || eq.due,
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
      ev.target.value = '';
    };
    reader.readAsDataURL(f);
  };

  const activeDetailItem = detailCode ? equipment.find((e) => e.code === detailCode) || null : null;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-extrabold text-slate-900">{tx('🔧 儀器管理系統 (借還及校準)', '🔧 Equipment (Loan & Calibration)')}</h1>
            <p className="text-[11px] text-slate-500">{tx(`借出 ${counts.loaned} 件 · 逾期 ${counts.overdue} 件 · 校準預警 ${counts.alert} 件`, `${counts.loaned} Out · ${counts.overdue} Overdue · ${counts.alert} Cal Alerts`)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setQrModal({ mode: 'lookup' })} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-2.5 py-2 text-xs font-extrabold text-white cursor-pointer">
              <QrCode className="h-4 w-4" /> QR
            </button>
            <button type="button" onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-white cursor-pointer">
              <Plus className="h-4 w-4" /> {tx('新增', 'Add')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1 text-xs font-extrabold">
          <button type="button" onClick={() => setSubTab('list')} className={`rounded-lg py-2 cursor-pointer ${subTab === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>
            {tx(`1. 儀器借還 (${counts.total})`, `1. Loan List (${counts.total})`)}
          </button>
          <button type="button" onClick={() => setSubTab('history')} className={`inline-flex items-center justify-center gap-1 rounded-lg py-2 cursor-pointer ${subTab === 'history' ? 'bg-brand text-white shadow-xs' : 'text-slate-600'}`}>
            <History className="h-3.5 w-3.5" /> {tx(`借還紀錄 (${loans.length})`, `History (${loans.length})`)}
          </button>
          <button type="button" onClick={() => setSubTab('forecast')} className={`inline-flex items-center justify-center gap-1 rounded-lg py-2 cursor-pointer ${subTab === 'forecast' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800'}`}>
            <CalendarClock className="h-3.5 w-3.5" /> {tx(`2. 校準管理 (${calForecast.counts.totalWithin90})`, `2. Calibration (${calForecast.counts.totalWithin90})`)}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          <button type="button" onClick={() => openPreviewDoc({ title: tx('FQS38 年度校準及內檢時間表', 'FQS38 Calibration Schedule'), url: '/server-docs/forms/FQS38_Calibration_Verification_Schedule_260520.pdf', fileName: 'FQS38_Calibration_Verification_Schedule_260520.pdf' })} className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 font-bold text-slate-700 cursor-pointer">FQS38 {tx('時間表', 'Sched')}</button>
          <button type="button" onClick={() => openPreviewDoc({ title: tx('FCC01 (2026) 每月內檢紀錄', 'FCC01 (2026) Monthly Check'), url: '/server-docs/forms/FCC01_Monthly_Check_Record_2026.pdf', fileName: 'FCC01_Monthly_Check_Record_2026.pdf' })} className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 font-bold text-slate-700 cursor-pointer">FCC01 {tx('月檢', 'Check')}</button>
          <button type="button" onClick={() => openPreviewDoc({ title: tx('FQS50 儀器借還登記表範本', 'FQS50 Loan Template'), url: '/server-docs/forms/FQS50_Loan_of_Equipment_template.doc', fileName: 'FQS50_Loan_of_Equipment_template.doc' })} className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 font-bold text-slate-700 cursor-pointer">FQS50 {tx('借還表', 'Form')}</button>
        </div>
      </div>

      {subTab === 'forecast' ? (
        <CalibrationForecastPanel
          onOpenDetail={(code) => setDetailCode(code)}
          onPreviewCert={(eq) =>
            eq.certUrl &&
            openPreviewDoc({
              title: `${eq.code} — ${eq.certFile || 'Cal Cert'}`,
              url: eq.certUrl,
              fileName: eq.certFile,
              subtitle: `${eq.name} · Due: ${eq.certDue || eq.due}`,
            })
          }
        />
      ) : subTab === 'history' ? (
        <div className="space-y-2.5 text-xs">
          {[...loans].sort((a, b) => b.checkoutAt.localeCompare(a.checkoutAt)).map((ln) => {
            const eq = eqMap.get(ln.equipmentCode);
            return (
              <div
                key={ln.id}
                onClick={() => setSelectedLoanId(ln.id)}
                className="rounded-2xl border border-slate-200/90 bg-white hover:border-brand/40 active:bg-brand-wash/30 p-3.5 shadow-xs space-y-2 cursor-pointer transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white shrink-0">{ln.equipmentCode}</span>
                    <span className="font-extrabold text-slate-900 truncate">{eq?.name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge tone={ln.returnedAt ? 'ok' : 'brand'}>{ln.returnedAt ? tx('已交還', 'Returned') : tx('借出中', 'On Loan')}</Badge>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 space-y-1 text-[11px]">
                  <div className="font-bold text-brand-deep truncate">📍 {ln.siteLocation} {ln.jobNo ? `(${ln.jobNo})` : ''}</div>
                  <div className="truncate">{tx('借用人：', 'Borrower: ')}<span className="font-semibold">{ln.borrowerName}</span> · {ln.checkoutAt}</div>
                  {ln.returnedAt && <div className="text-emerald-700 font-semibold truncate">{tx('交還：', 'Returned: ')}{ln.returnedAt} · {ln.returnStore || 'Office'}</div>}
                  {(ln.remark || ln.returnRemark) && <div className="text-slate-500 truncate">📝 {ln.remark || ln.returnRemark}</div>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-brand">{tx('點擊查看完整紀錄 ›', 'Tap for full details ›')}</span>
                  {!ln.returnedAt && eq ? (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setReturnItem(eq); }} className="rounded-xl bg-emerald-600 px-4 py-1.5 font-extrabold text-white cursor-pointer">{tx('登記交還', 'Return')}</button>
                  ) : (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedLoanId(ln.id); }} className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold text-slate-700 cursor-pointer">{tx('紀錄詳情', 'Details')}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tx('搜尋器材編號、名稱、S/N、借用人...', 'Search Code, Name, S/N, Borrower...')} className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-brand" />
          </div>

          <div className="grid grid-cols-5 gap-1 text-[11px] font-extrabold">
            <button type="button" onClick={() => setStatusFilter('all')} className={`rounded-xl py-1.5 cursor-pointer ${statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{tx(`全部 (${counts.total})`, `All (${counts.total})`)}</button>
            <button type="button" onClick={() => setStatusFilter('loaned')} className={`rounded-xl py-1.5 cursor-pointer ${statusFilter === 'loaned' ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-brand-deep'}`}>{tx(`借出 (${counts.loaned})`, `Out (${counts.loaned})`)}</button>
            <button type="button" onClick={() => setStatusFilter('overdue')} className={`rounded-xl py-1.5 cursor-pointer ${statusFilter === 'overdue' ? 'bg-rose-600 text-white' : 'bg-white border border-rose-200 text-rose-700'}`}>{tx(`逾期 (${counts.overdue})`, `Late (${counts.overdue})`)}</button>
            <button type="button" onClick={() => setStatusFilter('alert')} className={`rounded-xl py-1.5 cursor-pointer ${statusFilter === 'alert' ? 'bg-amber-600 text-white' : 'bg-white border border-amber-200 text-amber-800'}`}>{tx(`提示 (${counts.alert})`, `Due (${counts.alert})`)}</button>
            <button type="button" onClick={() => setStatusFilter('monthly')} className={`rounded-xl py-1.5 cursor-pointer ${statusFilter === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white border border-indigo-200 text-indigo-800'}`}>{tx(`月檢 (${counts.monthly})`, `FCC01 (${counts.monthly})`)}</button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {TEST_TAGS.map((t) => (
              <button key={t} type="button" onClick={() => setTagFilter(t)} className={`rounded-xl px-3 py-1.5 font-mono text-xs font-extrabold shrink-0 cursor-pointer ${tagFilter === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                {t === 'ALL' ? tx('全部測試', 'ALL') : t}
              </button>
            ))}
          </div>

          <div className="space-y-2.5 text-xs">
            {filtered.map((eq) => {
              const cal = getEquipmentCalStatus(eq, undefined, lang);
              const ov = getLoanOverdueStatus(eq, undefined, lang);
              const tags = eq.testTags || eq.tests.split('+').map((s) => s.trim()).filter(Boolean);
              return (
                <div key={eq.code} className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigateToEquipmentCertPage(eq.code)}
                        className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white hover:bg-brand cursor-pointer"
                      >
                        {eq.code}
                      </button>
                      {tags.map((tg) => <span key={tg} className="rounded bg-brand-wash px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-brand-deep">{tg}</span>)}
                    </div>
                    <Badge tone={cal.kind}>{cal.label}</Badge>
                  </div>
                  <div onClick={() => setDetailCode(eq.code)} className="cursor-pointer">
                    <div className="text-sm font-extrabold text-slate-900">{eq.name}</div>
                    <div className="font-mono text-[11px] text-slate-500">{eq.maker} · {eq.model} ｜ S/N {eq.serial}</div>
                    <div className="font-mono text-[11px] text-slate-500 mt-0.5">Cal Due: <span className="font-bold text-slate-700">{eq.certDue || eq.due}</span></div>
                  </div>
                  <div className={`rounded-xl px-3 py-2 text-[11px] ${eq.currentLoan ? 'bg-brand-wash/60 text-brand-deep' : 'bg-emerald-50/70 text-emerald-800'}`}>
                    {eq.currentLoan ? (
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-bold">📍 {eq.currentLoan.siteLocation} · {eq.currentLoan.borrowerName} ({tx('還', 'Due')} {eq.currentLoan.expectedReturn})</span>
                        {ov.isOverdue && (
                          <span className="rounded bg-rose-100 border border-rose-300 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-rose-700">
                            🚨 {ov.label}
                          </span>
                        )}
                      </div>
                    ) : <span className="font-bold">🏠 {tx('在庫：', 'In Store: ')}{eq.loc || eq.store || 'Lab'}</span>}
                  </div>
                  <div className="grid grid-cols-12 gap-1.5">
                    {eq.currentLoan ? (
                      <button type="button" onClick={() => setReturnItem(eq)} className="col-span-4 rounded-xl bg-emerald-600 py-2 font-extrabold text-white cursor-pointer">{tx('交還', 'Return')}</button>
                    ) : (
                      <button type="button" onClick={() => setCheckoutItem(eq)} className="col-span-4 rounded-xl bg-brand py-2 font-extrabold text-white cursor-pointer">{tx('借出', 'Checkout')}</button>
                    )}
                    <button type="button" disabled={!eq.certUrl} onClick={() => eq.certUrl && openPreviewDoc({ title: `${eq.code} — ${eq.certFile || 'Cal Cert'}`, url: eq.certUrl, fileName: eq.certFile, subtitle: `${eq.name} · Due: ${eq.certDue || eq.due}` })} className={`col-span-4 inline-flex items-center justify-center gap-1 rounded-xl border py-2 font-extrabold ${eq.certUrl ? 'border-emerald-300 bg-emerald-50 text-emerald-800 cursor-pointer' : 'border-slate-100 bg-slate-50 text-slate-300'}`}>
                      <Eye className="h-3.5 w-3.5" /> {eq.certUrl ? 'Cert' : tx('無 Cert', 'No Cert')}
                    </button>
                    <button type="button" onClick={() => setDetailCode(eq.code)} className="col-span-3 inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 font-bold text-slate-700 cursor-pointer">
                      <FileCheck2 className="h-3.5 w-3.5 text-brand" /> {tx('詳情', 'Info')}
                    </button>
                    <label className="col-span-1 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 cursor-pointer" title="Upload">
                      <UploadCloud className="h-3.5 w-3.5" />
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(ev) => handleQuickCalUpload(eq, ev)} className="hidden" />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <MobileEquipmentSheet item={activeDetailItem} onClose={() => setDetailCode(null)} onOpenCheckout={() => { if (activeDetailItem) { setCheckoutItem(activeDetailItem); setDetailCode(null); } }} onOpenReturn={() => { if (activeDetailItem) { setReturnItem(activeDetailItem); setDetailCode(null); } }} />
      {(() => {
        const selectedLoan = selectedLoanId ? loans.find((l) => l.id === selectedLoanId) || null : null;
        const selectedEq = selectedLoan ? eqMap.get(selectedLoan.equipmentCode) || null : null;
        return (
          <LoanDetailModal
            loan={selectedLoan}
            equipment={selectedEq}
            onClose={() => setSelectedLoanId(null)}
            onOpenReturn={selectedLoan && !selectedLoan.returnedAt && selectedEq ? () => setReturnItem(selectedEq) : undefined}
            onOpenEquipment={selectedLoan ? () => { setDetailCode(selectedLoan.equipmentCode); setSelectedLoanId(null); } : undefined}
          />
        );
      })()}
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
