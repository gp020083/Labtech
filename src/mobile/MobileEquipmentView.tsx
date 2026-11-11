import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePermissions } from '../permissions';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { EquipmentItem } from '../types';
import { getLoanOverdueStatus } from '../utils/limsRules';
import { buildCalibrationForecast } from '../utils/limsProcessTools';
import { Badge } from '../components/Badge';
import { MobileEquipmentSheet } from './MobileEquipmentSheet';
import { LoanDetailModal } from '../components/LoanDetailModal';
import { EquipmentCheckoutModal } from '../components/EquipmentCheckoutModal';
import { EquipmentReturnModal } from '../components/EquipmentReturnModal';
import { NewEquipmentModal } from '../components/NewEquipmentModal';
import { EquipmentQrModal } from '../components/EquipmentQrModal';
import {
  Plus,
  Search,
  Eye,
  QrCode,
  ArrowLeftRight,
  ShieldCheck,
  FileText,
  ChevronRight,
} from 'lucide-react';

const TEST_TAGS = ['ALL', 'KD', 'SO', 'FC', 'BL', 'PO', 'PLT', 'VC'];

type MobileEqMode = 'loans' | 'calibration';
type LoanStatusPill = 'all' | 'available' | 'loaned' | 'cal_alert' | 'overdue' | 'history';
type CalStatusPill = 'all' | 'valid' | 'due_90' | 'overdue' | 'monthly';

function cleanLocationLabel(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/\s*[（(]([^）)]+)[）)]/g, ' · $1').trim();
}

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

export const MobileEquipmentView: React.FC = () => {
  const { equipment, loans, events, openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const perms = usePermissions();
  const [mode, setMode] = useState<MobileEqMode>('loans');
  const [query, setQuery] = useState('');
  const [loanPill, setLoanPill] = useState<LoanStatusPill>('all');
  const [calPill, setCalPill] = useState<CalStatusPill>('all');
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
  const forecastByCode = useMemo(
    () => new Map(calForecast.items.map((it) => [it.equipment.code, it])),
    [calForecast.items]
  );

  const counts = useMemo(() => {
    const loaned = inUseList.filter((e) => !!e.currentLoan).length;
    const available = inUseList.length - loaned;
    const overdueLoan = inUseList.filter((e) => getLoanOverdueStatus(e).isOverdue).length;

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
    return {
      total: inUseList.length,
      available,
      loaned,
      overdueLoan,
      validCal,
      due90Cal,
      overdueCal,
      calAlert: overdueCal + due90Cal,
      monthly,
    };
  }, [inUseList, forecastByCode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inUseList.filter((e) => {
      const ov = getLoanOverdueStatus(e);
      const fc = forecastByCode.get(e.code);
      const daysLeft = fc ? fc.daysLeft : 999;

      if (mode === 'loans') {
        if (loanPill === 'available' && e.currentLoan) return false;
        if (loanPill === 'loaned' && !e.currentLoan) return false;
        if (loanPill === 'cal_alert' && daysLeft > 90) return false;
        if (loanPill === 'overdue' && !ov.isOverdue) return false;
      } else {
        if (calPill === 'valid' && daysLeft <= 90) return false;
        if (calPill === 'due_90' && (daysLeft < 0 || daysLeft > 90)) return false;
        if (calPill === 'overdue' && daysLeft >= 0) return false;
        if (calPill === 'monthly' && !e.monthlyCheck) return false;
      }

      if (tagFilter !== 'ALL') {
        const tags = e.testTags || e.tests.split('+').map((s) => s.trim()).filter(Boolean);
        if (!tags.includes(tagFilter)) return false;
      }
      if (!q) return true;
      return `${e.code} ${e.name} ${e.maker} ${e.model} ${e.serial} ${e.loc} ${e.currentLoan?.borrowerName || ''} ${e.currentLoan?.siteLocation || ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [inUseList, mode, loanPill, calPill, tagFilter, query, forecastByCode]);

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

  const getCalDisplay = (eq: EquipmentItem) => {
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
        dateText: tx('每月核查', 'Monthly'),
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

  const activeDetailItem = detailCode ? equipment.find((e) => e.code === detailCode) || null : null;

  const loanPills: [LoanStatusPill, string, number][] = [
    ['all', tx('全部', 'All'), counts.total],
    ['available', tx('在庫', 'Available'), counts.available],
    ['loaned', tx('借出', 'On Loan'), counts.loaned],
    ['cal_alert', tx('校準預警', 'Cal Alert'), counts.calAlert],
    ...(counts.overdueLoan > 0
      ? ([['overdue', tx('逾期', 'Overdue'), counts.overdueLoan]] as [LoanStatusPill, string, number][])
      : []),
    ['history', tx('借還紀錄', 'Logs'), loans.length],
  ];

  return (
    <div className="space-y-2.5 pb-3 w-full min-w-0">
      {/* 1. Clean 2-Tab Segmented Control */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-200/75 p-1 text-xs font-extrabold">
        <button
          type="button"
          onClick={() => setMode('loans')}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-2 transition cursor-pointer ${
            mode === 'loans' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4 shrink-0 text-brand" />
          <span>{tx('儀器借還', 'Loan & Return')}</span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 tabular-nums">
            {counts.loaned}/{counts.total}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode('calibration')}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-2 transition cursor-pointer ${
            mode === 'calibration' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{tx('校準證書', 'Calibration')}</span>
          {counts.calAlert > 0 && (
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] text-amber-800 tabular-nums">
              {counts.calAlert}
            </span>
          )}
        </button>
      </div>

      {/* 2. Search Input + 44px QR Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tx('搜尋儀器編號、名稱、S/N 或借用人...', 'Search Code, Name, S/N or Borrower...')}
            className="h-11 min-h-[44px] w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-xs font-semibold text-slate-900 outline-none focus:border-brand shadow-xs"
          />
        </div>
        <button
          type="button"
          onClick={() => setQrModal({ mode: 'lookup' })}
          aria-label={tx('QR 掃描及查詢', 'QR Lookup')}
          className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xs active:bg-slate-800 cursor-pointer"
        >
          <QrCode className="h-5 w-5" />
        </button>
      </div>

      {/* 3. Horizontal No-Scrollbar Test Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pr-4">
        {TEST_TAGS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTagFilter(t)}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-3.5 font-mono text-xs font-extrabold shrink-0 transition cursor-pointer ${
              tagFilter === t
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {t}
          </button>
        ))}
        <span aria-hidden="true" className="w-2 shrink-0" />
      </div>

      {/* 4. Clean Status Pills — shrink-0 + right spacer so trailing pill never clips */}
      {mode === 'loans' ? (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pr-4 text-xs font-extrabold">
          {loanPills.map(([k, lbl, cnt]) => (
            <button
              key={k}
              type="button"
              onClick={() => setLoanPill(k)}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 whitespace-nowrap shrink-0 tabular-nums transition cursor-pointer ${
                loanPill === k
                  ? 'bg-brand text-white shadow-2xs'
                  : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              <span>{lbl}</span>
              <span className="font-mono text-[11px] opacity-85">{cnt}</span>
            </button>
          ))}
          {perms.canManageEquipment && (
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-brand" />
              <span>{tx('新增儀器', 'Add')}</span>
            </button>
          )}
          <span aria-hidden="true" className="w-2 shrink-0" />
        </div>
      ) : (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pr-4 text-xs font-extrabold">
          {(
            [
              ['all', tx('全部', 'All'), counts.total],
              ['valid', tx('有效', 'Valid'), counts.validCal],
              ['due_90', tx('90日內到期', 'Due ≤90d'), counts.due90Cal],
              ['overdue', tx('已逾期', 'Overdue'), counts.overdueCal],
              ['monthly', tx('每月內檢', 'Monthly'), counts.monthly],
            ] as const
          ).map(([k, lbl, cnt]) => (
            <button
              key={k}
              type="button"
              onClick={() => setCalPill(k)}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 whitespace-nowrap shrink-0 tabular-nums transition cursor-pointer ${
                calPill === k
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              <span>{lbl}</span>
              <span className="font-mono text-[11px] opacity-85">{cnt}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              openPreviewDoc({
                title: tx('FQS38 年度校準及內檢時間表', 'FQS38 Calibration Schedule'),
                url: '/server-docs/forms/FQS38_Calibration_Verification_Schedule_260520.pdf',
                fileName: 'FQS38_Calibration_Verification_Schedule_260520.pdf',
              })
            }
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>FQS38</span>
          </button>
          <button
            type="button"
            onClick={() =>
              openPreviewDoc({
                title: tx('FCC01 每月內檢紀錄 · 2026', 'FCC01 Monthly Check · 2026'),
                url: '/server-docs/forms/FCC01_Monthly_Check_Record_2026.pdf',
                fileName: 'FCC01_Monthly_Check_Record_2026.pdf',
              })
            }
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>FCC01</span>
          </button>
          <span aria-hidden="true" className="w-2 shrink-0" />
        </div>
      )}

      {/* 5. Content List */}
      {mode === 'loans' && loanPill === 'history' ? (
        <div className="space-y-2.5 text-xs">
          {[...loans]
            .sort((a, b) => b.checkoutAt.localeCompare(a.checkoutAt))
            .map((ln) => {
              const eq = eqMap.get(ln.equipmentCode);
              return (
                <div
                  key={ln.id}
                  onClick={() => setSelectedLoanId(ln.id)}
                  className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5 overflow-hidden cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white shrink-0">
                        {ln.equipmentCode}
                      </span>
                      <span className="font-bold text-slate-900 truncate">{eq?.name || '—'}</span>
                    </div>
                    <div className="shrink-0">
                      <Badge tone={ln.returnedAt ? 'ok' : 'brand'}>
                        {ln.returnedAt ? tx('已歸還', 'Returned') : tx('借出中', 'On Loan')}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 min-w-0">
                    <div className="min-w-0 flex-1 space-y-0.5 text-[11px]">
                      <div className="font-bold text-slate-800 truncate">
                        {cleanLocationLabel(ln.siteLocation)} · {ln.borrowerName}
                      </div>
                      <div className="font-mono text-slate-500 tabular-nums">
                        {ln.returnedAt
                          ? `${tx('歸還', 'In')} ${ln.returnedAt}`
                          : `${tx('預計歸還', 'Due')} ${ln.expectedReturn}`}
                      </div>
                    </div>
                    {!ln.returnedAt && eq ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReturnItem(eq);
                        }}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-4 font-extrabold text-white shrink-0 cursor-pointer"
                      >
                        {tx('歸還', 'Return')}
                      </button>
                    ) : (
                      <span className="inline-flex h-11 w-9 items-center justify-center text-slate-400 shrink-0">
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="space-y-2.5 text-xs">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center font-semibold text-slate-400">
              {tx('沒有符合篩選條件的儀器', 'No matching instruments found')}
            </div>
          ) : (
            filtered.map((eq) => {
              const ov = getLoanOverdueStatus(eq, undefined, lang);
              const calDisplay = getCalDisplay(eq);
              const tags = eq.testTags || eq.tests.split('+').map((s) => s.trim()).filter(Boolean);
              const hasCert = !!(eq.certUrl || eq.calCerts?.some((c) => c.dataUrl));
              const shortBorrower = eq.currentLoan?.borrowerName
                ? eq.currentLoan.borrowerName.split(',')[1]?.trim() || eq.currentLoan.borrowerName
                : '';

              const topPill =
                mode === 'loans'
                  ? eq.currentLoan
                    ? ov.isOverdue
                      ? {
                          text: cleanLocationLabel(ov.label),
                          cls: 'border-rose-200 bg-rose-50 text-rose-700',
                        }
                      : {
                          text: `${tx('借出', 'Out')} · ${cleanLocationLabel(eq.currentLoan.siteLocation)}`,
                          cls: 'border-blue-200 bg-blue-50 text-blue-700',
                        }
                    : {
                        text: `${tx('在庫', 'In Lab')} · ${cleanLocationLabel(eq.loc || eq.store || 'Office')}`,
                        cls: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                      }
                  : {
                      text: calDisplay.badgeText,
                      cls: calDisplay.badgeCls,
                    };

              return (
                <div
                  key={eq.code}
                  onClick={() => setDetailCode(eq.code)}
                  className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5 overflow-hidden active:bg-slate-50/80 transition cursor-pointer"
                >
                  {/* Top Row: Code + Single Truncated Status Pill (max-w-[175px] block truncate) */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white shrink-0">
                      {eq.code}
                    </span>
                    <span
                      title={topPill.text}
                      className={`block max-w-[175px] min-w-0 truncate rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums ${topPill.cls}`}
                    >
                      {topPill.text}
                    </span>
                  </div>

                  {/* Middle Row: Clean Name + Compact Test Tags */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="text-sm font-extrabold text-slate-900 leading-snug break-words">{eq.name}</div>
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

                  {/* Bottom Row: Cal Due / Borrower + 1-Tap 44px Action Button */}
                  <div className="flex items-center justify-between gap-2.5 border-t border-slate-100 pt-2.5 min-w-0">
                    <div className="min-w-0 flex-1">
                      {mode === 'loans' && eq.currentLoan ? (
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-slate-800 truncate">{shortBorrower}</div>
                          <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                            {tx('還期', 'Due')} {eq.currentLoan.expectedReturn}
                          </div>
                        </div>
                      ) : (
                        <div className="font-mono text-xs font-bold text-slate-600 tabular-nums truncate">
                          Cal Due · {calDisplay.dateText}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {mode === 'loans' ? (
                        eq.currentLoan ? (
                          <button
                            type="button"
                            onClick={() => setReturnItem(eq)}
                            className="inline-flex min-h-[44px] min-w-[84px] items-center justify-center rounded-xl bg-emerald-600 px-4 font-extrabold text-white active:bg-emerald-700 cursor-pointer"
                          >
                            {tx('歸還', 'Return')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCheckoutItem(eq)}
                            className="inline-flex min-h-[44px] min-w-[84px] items-center justify-center rounded-xl bg-brand px-4 font-extrabold text-white active:bg-brand-deep cursor-pointer"
                          >
                            {tx('借出', 'Checkout')}
                          </button>
                        )
                      ) : hasCert ? (
                        <button
                          type="button"
                          onClick={() => openCertPreview(eq)}
                          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 font-extrabold text-emerald-800 active:bg-emerald-100 cursor-pointer"
                        >
                          <Eye className="h-4 w-4 shrink-0" />
                          <span>{tx('預覽證書', 'Preview Cert')}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDetailCode(eq.code)}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 font-bold text-slate-700 cursor-pointer"
                        >
                          {tx('詳情', 'Details')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <MobileEquipmentSheet
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
      {(() => {
        const selectedLoan = selectedLoanId ? loans.find((l) => l.id === selectedLoanId) || null : null;
        if (!selectedLoan || typeof document === 'undefined') return null;
        const selectedEq = eqMap.get(selectedLoan.equipmentCode) || null;
        return createPortal(
          <div className="fixed inset-0 z-[76] pointer-events-none [&>*]:pointer-events-auto">
            <LoanDetailModal
              loan={selectedLoan}
              equipment={selectedEq}
              onClose={() => setSelectedLoanId(null)}
              onOpenReturn={
                !selectedLoan.returnedAt && selectedEq
                  ? () => setReturnItem(selectedEq)
                  : undefined
              }
              onOpenEquipment={() => {
                setDetailCode(selectedLoan.equipmentCode);
                setSelectedLoanId(null);
              }}
            />
          </div>,
          document.body
        );
      })()}
      <EquipmentCheckoutModal item={checkoutItem} onClose={() => setCheckoutItem(null)} />
      <EquipmentReturnModal item={returnItem} onClose={() => setReturnItem(null)} />
      {newOpen && <NewEquipmentModal onClose={() => setNewOpen(false)} />}
      {qrModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[90] pointer-events-none [&>*]:pointer-events-auto">
            <EquipmentQrModal
              initialMode={qrModal.mode}
              initialCode={qrModal.code}
              onClose={() => setQrModal(null)}
              onOpenCheckout={(eq) => setCheckoutItem(eq)}
              onOpenReturn={(eq) => setReturnItem(eq)}
              onOpenDetail={(code) => setDetailCode(code)}
            />
          </div>,
          document.body
        )}
    </div>
  );
};
