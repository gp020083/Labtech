import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { EquipmentItem } from '../types';
import { buildCalibrationForecast, buildCalibrationRenewalCsv } from '../utils/limsProcessTools';
import { navigateToEquipmentCertPage } from '../utils/equipmentQr';
import {
  CalendarClock,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Eye,
  ExternalLink,
  Send,
  Filter,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type BucketFilterKey = 'all_90' | 'overdue' | 'due_30' | 'due_60' | 'due_90' | 'ok' | 'conflicts';

export const CalibrationForecastPanel: React.FC<{
  compact?: boolean;
  onExpandFullPlanner?: () => void;
  onOpenDetail: (code: string) => void;
  onPreviewCert?: (eq: EquipmentItem) => void;
}> = ({ compact = false, onExpandFullPlanner, onOpenDetail, onPreviewCert }) => {
  const { equipment, events, pushToast } = useApp();
  const { tx } = usePrefs();
  const [bucketFilter, setBucketFilter] = useState<BucketFilterKey>('all_90');
  const [onlyExternalCal, setOnlyExternalCal] = useState<boolean>(true);
  const [selectedClusterDate, setSelectedClusterDate] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const forecast = useMemo(() => buildCalibrationForecast(equipment, events), [equipment, events]);

  const scopedItems = useMemo(() => {
    return onlyExternalCal ? forecast.items.filter((i) => i.isExternalCal) : forecast.items;
  }, [forecast.items, onlyExternalCal]);

  const scopedCounts = useMemo(() => {
    const overdue = scopedItems.filter((i) => i.bucket === 'overdue').length;
    const due30 = scopedItems.filter((i) => i.bucket === 'due_30').length;
    const due60 = scopedItems.filter((i) => i.bucket === 'due_60').length;
    const due90 = scopedItems.filter((i) => i.bucket === 'due_90').length;
    const validBeyond90 = scopedItems.filter((i) => i.bucket === 'ok' && i.daysLeft < 900).length;
    const totalWithin90 = overdue + due30 + due60 + due90;
    const withConflicts = scopedItems.filter((i) => i.bucket !== 'ok' && i.conflicts.length > 0).length;
    return { overdue, due30, due60, due90, validBeyond90, totalWithin90, withConflicts };
  }, [scopedItems]);

  const filteredItems = useMemo(() => {
    return scopedItems.filter((it) => {
      if (selectedClusterDate && it.dueDate !== selectedClusterDate) return false;
      if (bucketFilter === 'all_90') return it.bucket !== 'ok';
      if (bucketFilter === 'ok') return it.bucket === 'ok' && it.daysLeft < 900;
      if (bucketFilter === 'conflicts') return it.bucket !== 'ok' && it.conflicts.length > 0;
      return it.bucket === bucketFilter;
    });
  }, [scopedItems, bucketFilter, selectedClusterDate]);

  const handleExportRenewalCsv = () => {
    const targetList = filteredItems.length > 0 ? filteredItems : scopedItems.filter((i) => i.bucket !== 'ok');
    const csv = buildCalibrationRenewalCsv(targetList);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Labtech_Calibration_Renewal_Plan_${forecast.refToday}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    pushToast(
      tx('已匯出待送外校儀器清單 CSV', 'Calibration Renewal Plan CSV Exported'),
      tx(`共 ${targetList.length} 件儀器 (${forecast.refToday})`, `${targetList.length} instruments (${forecast.refToday})`)
    );
  };

  const totalBarDenominator = Math.max(1, scopedCounts.totalWithin90 + scopedCounts.validBeyond90);
  const displayList = compact && bucketFilter === 'all_90' && !selectedClusterDate ? filteredItems.slice(0, 6) : filteredItems;

  return (
    <section
      aria-label="Calibration Forecast & Renewal Planner"
      className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3.5 text-xs"
    >
      {/* Header Banner */}
      <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 ${collapsed ? '' : 'border-b border-slate-100 pb-3'}`}>
        <div onClick={() => setCollapsed(!collapsed)} className="space-y-0.5 cursor-pointer select-none">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
              <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
              30 / 60 / 90-DAY PLANNER
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              {tx('30 / 60 / 90 日外校到期時間軸與排程預警', '30 / 60 / 90-Day Calibration Renewal & Conflict Planner')}
            </h2>
          </div>
          {!collapsed && (
            <p className="text-[11px] text-slate-500">
              {tx(
                `基準日：${forecast.refToday}（建議於到期前 14 日送外校）｜ 點擊下方區間卡片或時間軸色帶即可篩選明細`,
                `Ref: ${forecast.refToday} (Send out 14d prior to Cal Due) ｜ Click any bucket card or timeline segment below to filter`
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!collapsed && (
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-extrabold">
              <button
                type="button"
                onClick={() => setOnlyExternalCal(true)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition cursor-pointer whitespace-nowrap ${
                  onlyExternalCal ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Filter className="h-3 w-3" />
                {tx('僅外校儀器 (E)', 'External Cal (E)')}
              </button>
              <button
                type="button"
                onClick={() => setOnlyExternalCal(false)}
                className={`rounded-lg px-2.5 py-1.5 transition cursor-pointer whitespace-nowrap ${
                  !onlyExternalCal ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tx('全部儀器', 'All Active')}
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={handleExportRenewalCsv}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-brand-deep cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            {tx('匯出 CSV', 'Export CSV')}
          </button>

          {compact && onExpandFullPlanner && !collapsed && (
            <button
              type="button"
              onClick={onExpandFullPlanner}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
            >
              {tx('完整看板', 'Full View')}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <span>{collapsed ? tx(`展開 (${scopedCounts.totalWithin90})`, `Expand (${scopedCounts.totalWithin90})`) : tx('收摺', 'Collapse')}</span>
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Unified Filter Cards + Proportional Timeline Bar (Single Source of Truth) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {([
                ['all_90', tx('≤90日需跟進', 'Total ≤90d'), scopedCounts.totalWithin90, 'text-slate-900', 'bg-slate-500'],
                ['overdue', tx('已過期', 'Overdue'), scopedCounts.overdue, 'text-rose-600', 'bg-rose-600'],
                ['due_30', tx('0–30日內', '0–30 Days'), scopedCounts.due30, 'text-orange-600', 'bg-orange-500'],
                ['due_60', tx('31–60日內', '31–60 Days'), scopedCounts.due60, 'text-amber-700', 'bg-amber-500'],
                ['due_90', tx('61–90日內', '61–90 Days'), scopedCounts.due90, 'text-sky-700', 'bg-sky-500'],
                ['ok', tx('>90日有效', '>90d Valid'), scopedCounts.validBeyond90, 'text-emerald-700', 'bg-emerald-500'],
                ['conflicts', tx('排程撞期', 'Conflicts'), scopedCounts.withConflicts, 'text-violet-700', 'bg-violet-600'],
              ] as const).map(([key, label, count, numColor, dotColor]) => {
                const active = bucketFilter === key && !selectedClusterDate;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedClusterDate(null);
                      setBucketFilter(key);
                    }}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                      active
                        ? 'border-brand bg-white ring-2 ring-brand/25 shadow-2xs'
                        : 'border-slate-200/90 bg-white/80 hover:bg-white'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 truncate">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
                      <span className="truncate">{label}</span>
                    </span>
                    <span className={`font-mono text-base font-extrabold tabular-nums ${numColor}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Proportional 90-Day Segmented Bar */}
            <div className="space-y-1">
              <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-200 p-0.5 gap-0.5">
                {scopedCounts.overdue > 0 && (
                  <button
                    type="button"
                    onClick={() => { setSelectedClusterDate(null); setBucketFilter(bucketFilter === 'overdue' ? 'all_90' : 'overdue'); }}
                    style={{ width: `${Math.max(5, (scopedCounts.overdue / totalBarDenominator) * 100)}%` }}
                    className={`h-full rounded-l-full bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer ${bucketFilter === 'overdue' ? 'ring-2 ring-slate-900 z-10' : ''}`}
                    title={tx(`已過期 (${scopedCounts.overdue})`, `Overdue (${scopedCounts.overdue})`)}
                  />
                )}
                {scopedCounts.due30 > 0 && (
                  <button
                    type="button"
                    onClick={() => { setSelectedClusterDate(null); setBucketFilter(bucketFilter === 'due_30' ? 'all_90' : 'due_30'); }}
                    style={{ width: `${Math.max(5, (scopedCounts.due30 / totalBarDenominator) * 100)}%` }}
                    className={`h-full bg-orange-500 hover:bg-orange-400 transition-all cursor-pointer ${bucketFilter === 'due_30' ? 'ring-2 ring-slate-900 z-10' : ''}`}
                    title={tx(`0–30日內 (${scopedCounts.due30})`, `0–30d (${scopedCounts.due30})`)}
                  />
                )}
                {scopedCounts.due60 > 0 && (
                  <button
                    type="button"
                    onClick={() => { setSelectedClusterDate(null); setBucketFilter(bucketFilter === 'due_60' ? 'all_90' : 'due_60'); }}
                    style={{ width: `${Math.max(5, (scopedCounts.due60 / totalBarDenominator) * 100)}%` }}
                    className={`h-full bg-amber-500 hover:bg-amber-400 transition-all cursor-pointer ${bucketFilter === 'due_60' ? 'ring-2 ring-slate-900 z-10' : ''}`}
                    title={tx(`31–60日內 (${scopedCounts.due60})`, `31–60d (${scopedCounts.due60})`)}
                  />
                )}
                {scopedCounts.due90 > 0 && (
                  <button
                    type="button"
                    onClick={() => { setSelectedClusterDate(null); setBucketFilter(bucketFilter === 'due_90' ? 'all_90' : 'due_90'); }}
                    style={{ width: `${Math.max(5, (scopedCounts.due90 / totalBarDenominator) * 100)}%` }}
                    className={`h-full bg-sky-500 hover:bg-sky-400 transition-all cursor-pointer ${bucketFilter === 'due_90' ? 'ring-2 ring-slate-900 z-10' : ''}`}
                    title={tx(`61–90日內 (${scopedCounts.due90})`, `61–90d (${scopedCounts.due90})`)}
                  />
                )}
                {scopedCounts.validBeyond90 > 0 && (
                  <button
                    type="button"
                    onClick={() => { setSelectedClusterDate(null); setBucketFilter(bucketFilter === 'ok' ? 'all_90' : 'ok'); }}
                    style={{ width: `${Math.max(8, (scopedCounts.validBeyond90 / totalBarDenominator) * 100)}%` }}
                    className={`h-full rounded-r-full bg-emerald-500 hover:bg-emerald-400 transition-all cursor-pointer ${bucketFilter === 'ok' ? 'ring-2 ring-slate-900 z-10' : ''}`}
                    title={tx(`>90日有效 (${scopedCounts.validBeyond90})`, `>90d Valid (${scopedCounts.validBeyond90})`)}
                  />
                )}
              </div>
              <div className="grid grid-cols-4 font-mono text-[10px] font-bold text-slate-500">
                <span>{tx(`今日 (${forecast.refToday})`, `Today (${forecast.refToday})`)}</span>
                <span className="text-center">+30d ({forecast.horizon30Date})</span>
                <span className="text-center">+60d ({forecast.horizon60Date})</span>
                <span className="text-right">+90d ({forecast.horizon90Date})</span>
              </div>
            </div>

            {/* Compact Clickable Due-Date Batch Chips */}
            {forecast.timelineClusters.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 mr-1">
                  {tx('到期批次篩選：', 'Due Batches:')}
                </span>
                {forecast.timelineClusters.map((cl) => {
                  const active = selectedClusterDate === cl.dueDate;
                  const tone =
                    cl.bucket === 'overdue'
                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : cl.bucket === 'due_30'
                      ? 'border-orange-300 bg-orange-50 text-orange-900'
                      : cl.bucket === 'due_60'
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : 'border-sky-300 bg-sky-50 text-sky-900';
                  return (
                    <button
                      key={cl.dueDate}
                      type="button"
                      onClick={() => setSelectedClusterDate(active ? null : cl.dueDate)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                        active ? 'ring-2 ring-brand border-brand bg-brand-wash text-brand-deep' : `${tone} hover:opacity-90`
                      }`}
                    >
                      <span className="font-mono font-extrabold tabular-nums">{cl.dueDate}</span>
                      <span className="rounded bg-slate-900/10 px-1.5 py-0.2 font-mono text-[10px] font-extrabold">
                        {cl.count}{tx('件', '')}
                      </span>
                      <span className="font-mono text-[10px] opacity-80">
                        ({cl.daysLeft < 0 ? tx(`逾${Math.abs(cl.daysLeft)}日`, `-${Math.abs(cl.daysLeft)}d`) : `${cl.daysLeft}d`})
                      </span>
                    </button>
                  );
                })}
                {selectedClusterDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedClusterDate(null)}
                    className="ml-auto text-[11px] font-extrabold text-brand hover:underline cursor-pointer"
                  >
                    {tx('清除批次篩選', 'Clear Batch')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Streamlined Single Instrument Table / List */}
          <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50/90 px-4 py-2.5 border-b border-slate-100">
              <span className="font-extrabold text-slate-800">
                {tx(
                  `待送外校及排程預警明細 (${filteredItems.length} 件)`,
                  `Calibration Renewal & Conflict Schedule (${filteredItems.length})`
                )}
              </span>
              {selectedClusterDate && (
                <span className="font-mono text-[11px] font-bold text-brand-deep">
                  {tx(`篩選到期日：${selectedClusterDate}`, `Filtered Due Date: ${selectedClusterDate}`)}
                </span>
              )}
            </div>

            {displayList.length === 0 ? (
              <div className="p-6 text-center space-y-1">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
                <div className="text-sm font-extrabold text-slate-900">
                  {tx('此區間內暫無即將到期或撞期之儀器', 'No instruments expiring or conflicting in this bucket')}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayList.map((it) => {
                  const eq = it.equipment;
                  const badgeCls =
                    it.bucket === 'overdue'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : it.bucket === 'due_30'
                      ? 'bg-orange-50 text-orange-800 border-orange-200'
                      : it.bucket === 'due_60'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : it.bucket === 'due_90'
                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200';

                  const dayLabel =
                    it.daysLeft < 0
                      ? tx(`已逾期 ${Math.abs(it.daysLeft)}日`, `Overdue ${Math.abs(it.daysLeft)}d`)
                      : tx(`${it.daysLeft}日後到期`, `In ${it.daysLeft}d`);

                  return (
                    <div
                      key={eq.code}
                      onClick={() => onOpenDetail(eq.code)}
                      className="px-4 py-3 hover:bg-brand-wash/30 transition flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigateToEquipmentCertPage(eq.code); }}
                            className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-xs font-extrabold text-white hover:bg-brand cursor-pointer"
                          >
                            {eq.code}
                          </button>
                          {it.tags.map((tg) => (
                            <span key={tg} className="rounded bg-brand-wash px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-brand-deep">
                              {tg}
                            </span>
                          ))}
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                            {eq.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            ({eq.model} · S/N {eq.serial})
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className={`rounded-md border px-2 py-0.5 font-mono font-extrabold tabular-nums ${badgeCls}`}>
                            {dayLabel} · Cal Due: {it.dueDate}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 tabular-nums">
                            <Send className="h-2.5 w-2.5 text-brand" />
                            {tx(`建議送檢：${it.recommendedSendDate}`, `Send Out: ${it.recommendedSendDate}`)}
                          </span>
                          {it.conflicts.map((c) => (
                            <span
                              key={c.eventId}
                              className="inline-flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200 px-2 py-0.5 font-mono text-[10px] font-extrabold text-violet-900"
                            >
                              <AlertTriangle className="h-3 w-3 text-violet-700 shrink-0" />
                              {c.eventDate} · {c.eventTitle} ({c.stpCodes.join('+')})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {eq.currentLoan ? (
                          <span className="rounded-xl bg-brand-wash px-2.5 py-1 text-[11px] font-bold text-brand-deep">
                            {eq.currentLoan.siteLocation} ({eq.currentLoan.borrowerName.split(',')[0]})
                          </span>
                        ) : (
                          <span className="rounded-xl bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                            {eq.loc || eq.store || 'Office'}
                          </span>
                        )}
                        <div className="inline-grid grid-cols-[72px_68px_68px] items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigateToEquipmentCertPage(eq.code)}
                            className="inline-flex h-7 w-[72px] items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 font-bold text-brand-deep hover:bg-brand-wash cursor-pointer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {tx('狀態頁', 'Status')}
                          </button>
                          {eq.certUrl && onPreviewCert ? (
                            <button
                              type="button"
                              onClick={() => onPreviewCert(eq)}
                              className="inline-flex h-7 w-[68px] items-center justify-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 font-extrabold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                            >
                              <Eye className="h-3 w-3" /> Cert
                            </button>
                          ) : (
                            <span className="inline-flex h-7 w-[68px] items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-[10px] text-slate-300">
                              —
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenDetail(eq.code)}
                            className="inline-flex h-7 w-[68px] items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <FileCheck2 className="h-3 w-3 text-brand" /> {tx('詳情', 'Info')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {compact && filteredItems.length > displayList.length && (
                  <div className="bg-slate-50 px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={onExpandFullPlanner}
                      className="inline-flex items-center gap-1 font-extrabold text-brand hover:underline cursor-pointer"
                    >
                      {tx(`檢視全部 ${filteredItems.length} 件待送外校儀器 ›`, `View all ${filteredItems.length} instruments due for calibration ›`)}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};
