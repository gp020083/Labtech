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

export const CalibrationForecastPanel: React.FC<{
  compact?: boolean;
  onExpandFullPlanner?: () => void;
  onOpenDetail: (code: string) => void;
  onPreviewCert?: (eq: EquipmentItem) => void;
}> = ({ compact = false, onExpandFullPlanner, onOpenDetail, onPreviewCert }) => {
  const { equipment, events, pushToast } = useApp();
  const { lang, tx } = usePrefs();
  const [bucketFilter, setBucketFilter] = useState<'all_90' | 'overdue' | 'due_30' | 'due_60' | 'due_90' | 'ok' | 'conflicts'>('all_90');
  const [selectedBarBucket, setSelectedBarBucket] = useState<'overdue' | 'due_30' | 'due_60' | 'due_90' | 'ok' | null>(null);
  const [onlyExternalCal, setOnlyExternalCal] = useState<boolean>(true);
  const [selectedClusterDate, setSelectedClusterDate] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [listCollapsed, setListCollapsed] = useState<boolean>(false);

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

  const handleSelectBarSegment = (bucket: 'overdue' | 'due_30' | 'due_60' | 'due_90' | 'ok') => {
    setSelectedClusterDate(null);
    if (selectedBarBucket === bucket) {
      setSelectedBarBucket(null);
      setBucketFilter('all_90');
    } else {
      setSelectedBarBucket(bucket);
      setBucketFilter(bucket);
      setListCollapsed(false);
    }
  };

  const barSegmentItems = useMemo(() => {
    if (!selectedBarBucket) return [];
    return scopedItems.filter((it) =>
      selectedBarBucket === 'ok' ? it.bucket === 'ok' && it.daysLeft < 900 : it.bucket === selectedBarBucket
    );
  }, [scopedItems, selectedBarBucket]);

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
    const targetList =
      filteredItems.length > 0
        ? filteredItems
        : scopedItems.filter((i) => i.bucket !== 'ok');
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

  const totalBarDenominator = Math.max(
    1,
    scopedCounts.totalWithin90 + scopedCounts.validBeyond90
  );

  const displayList = compact && bucketFilter === 'all_90' && !selectedClusterDate ? filteredItems.slice(0, 6) : filteredItems;

  return (
    <section
      aria-label="Calibration Forecast & Renewal Planner"
      className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4 text-xs"
    >
      {/* Header Banner */}
      <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 ${collapsed ? '' : 'border-b border-slate-100 pb-3.5'}`}>
        <div
          onClick={() => setCollapsed(!collapsed)}
          className="space-y-1 cursor-pointer select-none"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
              <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
              30 / 60 / 90-DAY RENEWAL PLANNER
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              {tx(
                '校準到期時間軸與 30 / 60 / 90 日外校預警中心',
                'Calibration Forecast & 30 / 60 / 90-Day Renewal Planner'
              )}
            </h2>
            {collapsed && (
              <div className="flex flex-wrap items-center gap-1.5 ml-1">
                <span className="rounded-lg bg-rose-50 border border-rose-200 px-2 py-0.5 font-mono text-[11px] font-extrabold text-rose-700">
                  {tx(`已過期 ${scopedCounts.overdue}`, `Overdue ${scopedCounts.overdue}`)}
                </span>
                <span className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 font-mono text-[11px] font-extrabold text-amber-800">
                  {tx(`31–60日 ${scopedCounts.due60}`, `31–60d ${scopedCounts.due60}`)}
                </span>
                <span className="rounded-lg bg-sky-50 border border-sky-200 px-2 py-0.5 font-mono text-[11px] font-extrabold text-sky-800">
                  {tx(`61–90日 ${scopedCounts.due90}`, `61–90d ${scopedCounts.due90}`)}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <p className="text-[11px] text-slate-500">
              {tx(
                `基準日：${forecast.refToday} → 30日 (${forecast.horizon30Date}) · 60日 (${forecast.horizon60Date}) · 90日 (${forecast.horizon90Date}) ｜ 建議於到期前 14 日安排送外校`,
                `Ref Date: ${forecast.refToday} → +30d (${forecast.horizon30Date}) · +60d (${forecast.horizon60Date}) · +90d (${forecast.horizon90Date}) ｜ Recommended external send-out: 14 days prior to Cal Due`
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
                {tx('外校儀器 External Cal', 'External Cal (E)')}
              </button>
              <button
                type="button"
                onClick={() => setOnlyExternalCal(false)}
                className={`rounded-lg px-2.5 py-1.5 transition cursor-pointer whitespace-nowrap ${
                  !onlyExternalCal ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tx('全部儀器 All', 'All Active')}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportRenewalCsv}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-brand-deep cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            {tx('匯出外校清單 CSV', 'Export Renewal CSV')}
          </button>

          {compact && onExpandFullPlanner && !collapsed && (
            <button
              type="button"
              onClick={onExpandFullPlanner}
              className="inline-flex items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
            >
              {tx('完整排程看板', 'Full View')}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-900 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            {collapsed ? (
              <>
                <span>{tx(`展開預警看板 (${scopedCounts.totalWithin90})`, `Expand Planner (${scopedCounts.totalWithin90})`)}</span>
                <ChevronDown className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>{tx('收摺預警看板', 'Collapse Planner')}</span>
                <ChevronUp className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>

      {/* Visual 30 / 60 / 90-Day Timeline & Milestone Map */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-extrabold text-slate-800 flex flex-wrap items-center gap-2">
            <span>{tx('90 日外校到期視覺化時間軸 (Visual 30 / 60 / 90-Day Calibration Timeline)', 'Visual 30 / 60 / 90-Day External Calibration Timeline')}</span>
            <span className="rounded-md bg-brand-wash px-2 py-0.5 text-[10px] font-bold text-brand-deep">
              {tx('點擊色帶區段或圖例可即時檢視對應儀器', 'Click any bar segment or legend to view instruments')}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            {([
              ['overdue', tx(`已過期 (${scopedCounts.overdue})`, `Overdue (${scopedCounts.overdue})`), 'bg-rose-600', 'text-rose-700 border-rose-200 bg-rose-50'],
              ['due_30', tx(`0–30日 (${scopedCounts.due30})`, `0–30d (${scopedCounts.due30})`), 'bg-orange-500', 'text-orange-700 border-orange-200 bg-orange-50'],
              ['due_60', tx(`31–60日 (${scopedCounts.due60})`, `31–60d (${scopedCounts.due60})`), 'bg-amber-500', 'text-amber-800 border-amber-200 bg-amber-50'],
              ['due_90', tx(`61–90日 (${scopedCounts.due90})`, `61–90d (${scopedCounts.due90})`), 'bg-sky-500', 'text-sky-800 border-sky-200 bg-sky-50'],
              ['ok', tx(`>90日有效 (${scopedCounts.validBeyond90})`, `>90d Valid (${scopedCounts.validBeyond90})`), 'bg-emerald-500', 'text-emerald-800 border-emerald-200 bg-emerald-50'],
            ] as const).map(([bKey, bLabel, dotCls, pillCls]) => {
              const isAct = selectedBarBucket === bKey;
              return (
                <button
                  key={bKey}
                  type="button"
                  onClick={() => handleSelectBarSegment(bKey)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 transition cursor-pointer ${
                    isAct ? 'ring-2 ring-slate-900 font-extrabold shadow-2xs ' + pillCls : 'border-transparent hover:border-slate-200 hover:bg-white ' + pillCls.split(' ')[0]
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${dotCls}`} />
                  {bLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Clickable Segmented Proportional Timeline Bar */}
        <div className="space-y-1.5">
          <div className="flex h-6 w-full overflow-hidden rounded-full bg-slate-200 p-0.5 gap-1">
            {scopedCounts.overdue > 0 && (
              <button
                type="button"
                onClick={() => handleSelectBarSegment('overdue')}
                style={{ width: `${Math.max(6, (scopedCounts.overdue / totalBarDenominator) * 100)}%` }}
                className={`h-full rounded-l-full bg-rose-600 hover:bg-rose-500 text-[10px] font-mono font-extrabold text-white flex items-center justify-center transition-all cursor-pointer ${
                  selectedBarBucket === 'overdue' ? 'ring-2 ring-slate-900 z-10' : selectedBarBucket ? 'opacity-55 hover:opacity-90' : ''
                }`}
                title={tx(`點擊檢視已過期儀器 (${scopedCounts.overdue} 件)`, `Click to view Overdue instruments (${scopedCounts.overdue})`)}
              >
                {scopedCounts.overdue}
              </button>
            )}
            {scopedCounts.due30 > 0 && (
              <button
                type="button"
                onClick={() => handleSelectBarSegment('due_30')}
                style={{ width: `${Math.max(6, (scopedCounts.due30 / totalBarDenominator) * 100)}%` }}
                className={`h-full bg-orange-500 hover:bg-orange-400 text-[10px] font-mono font-extrabold text-white flex items-center justify-center transition-all cursor-pointer ${
                  selectedBarBucket === 'due_30' ? 'ring-2 ring-slate-900 z-10' : selectedBarBucket ? 'opacity-55 hover:opacity-90' : ''
                }`}
                title={tx(`點擊檢視 0–30 日內到期儀器 (${scopedCounts.due30} 件)`, `Click to view 0-30 Days instruments (${scopedCounts.due30})`)}
              >
                {scopedCounts.due30}
              </button>
            )}
            {scopedCounts.due60 > 0 && (
              <button
                type="button"
                onClick={() => handleSelectBarSegment('due_60')}
                style={{ width: `${Math.max(6, (scopedCounts.due60 / totalBarDenominator) * 100)}%` }}
                className={`h-full bg-amber-500 hover:bg-amber-400 text-[10px] font-mono font-extrabold text-white flex items-center justify-center transition-all cursor-pointer ${
                  selectedBarBucket === 'due_60' ? 'ring-2 ring-slate-900 z-10' : selectedBarBucket ? 'opacity-55 hover:opacity-90' : ''
                }`}
                title={tx(`點擊檢視 31–60 日內到期儀器 (${scopedCounts.due60} 件)`, `Click to view 31-60 Days instruments (${scopedCounts.due60})`)}
              >
                {scopedCounts.due60}
              </button>
            )}
            {scopedCounts.due90 > 0 && (
              <button
                type="button"
                onClick={() => handleSelectBarSegment('due_90')}
                style={{ width: `${Math.max(6, (scopedCounts.due90 / totalBarDenominator) * 100)}%` }}
                className={`h-full bg-sky-500 hover:bg-sky-400 text-[10px] font-mono font-extrabold text-white flex items-center justify-center transition-all cursor-pointer ${
                  selectedBarBucket === 'due_90' ? 'ring-2 ring-slate-900 z-10' : selectedBarBucket ? 'opacity-55 hover:opacity-90' : ''
                }`}
                title={tx(`點擊檢視 61–90 日內到期儀器 (${scopedCounts.due90} 件)`, `Click to view 61-90 Days instruments (${scopedCounts.due90})`)}
              >
                {scopedCounts.due90}
              </button>
            )}
            {scopedCounts.validBeyond90 > 0 && (
              <button
                type="button"
                onClick={() => handleSelectBarSegment('ok')}
                style={{ width: `${Math.max(10, (scopedCounts.validBeyond90 / totalBarDenominator) * 100)}%` }}
                className={`h-full rounded-r-full bg-emerald-500 hover:bg-emerald-400 text-[10px] font-mono font-extrabold text-white flex items-center justify-center transition-all cursor-pointer ${
                  selectedBarBucket === 'ok' ? 'ring-2 ring-slate-900 z-10' : selectedBarBucket ? 'opacity-55 hover:opacity-90' : ''
                }`}
                title={tx(`點擊檢視 >90 日有效儀器 (${scopedCounts.validBeyond90} 件)`, `Click to view >90 Days Valid instruments (${scopedCounts.validBeyond90})`)}
              >
                {scopedCounts.validBeyond90}
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 font-mono text-[10px] font-bold text-slate-500">
            <span>{tx(`今日 (${forecast.refToday})`, `Today (${forecast.refToday})`)}</span>
            <span className="text-center">+30d ({forecast.horizon30Date})</span>
            <span className="text-center">+60d ({forecast.horizon60Date})</span>
            <span className="text-right">+90d ({forecast.horizon90Date})</span>
          </div>

          {selectedBarBucket && (
            <div className="mt-2 rounded-2xl border border-slate-300 bg-white p-3 shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="font-extrabold text-slate-900">
                  {selectedBarBucket === 'overdue' && tx(`已選取色帶：已過期儀器 (${barSegmentItems.length} 件)`, `Selected Segment: Overdue Instruments (${barSegmentItems.length})`)}
                  {selectedBarBucket === 'due_30' && tx(`已選取色帶：0–30 日內到期儀器 (${barSegmentItems.length} 件)`, `Selected Segment: Due in 0–30 Days (${barSegmentItems.length})`)}
                  {selectedBarBucket === 'due_60' && tx(`已選取色帶：31–60 日內到期儀器 (${barSegmentItems.length} 件)`, `Selected Segment: Due in 31–60 Days (${barSegmentItems.length})`)}
                  {selectedBarBucket === 'due_90' && tx(`已選取色帶：61–90 日內到期儀器 (${barSegmentItems.length} 件)`, `Selected Segment: Due in 61–90 Days (${barSegmentItems.length})`)}
                  {selectedBarBucket === 'ok' && tx(`已選取色帶：>90 日有效儀器 (${barSegmentItems.length} 件)`, `Selected Segment: >90 Days Valid (${barSegmentItems.length})`)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBarBucket(null);
                    setBucketFilter('all_90');
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  {tx('收起區間清單', 'Close Segment List')}
                </button>
              </div>
              {barSegmentItems.length === 0 ? (
                <div className="py-3 text-center text-[11px] text-slate-500">
                  {tx('此色帶區間暫無對應儀器', 'No instruments in this segment')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {barSegmentItems.map((it) => (
                    <div
                      key={it.equipment.code}
                      onClick={() => onOpenDetail(it.equipment.code)}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-2 hover:border-brand hover:bg-brand-wash/40 transition cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-extrabold text-white">
                            {it.equipment.code}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-brand-deep">
                            {it.tags.join('/')}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-xs font-extrabold text-slate-900">
                          {it.equipment.name}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          Due: {it.dueDate} ({it.daysLeft < 0 ? tx(`逾期 ${Math.abs(it.daysLeft)}日`, `Overdue ${Math.abs(it.daysLeft)}d`) : tx(`剩餘 ${it.daysLeft}日`, `${it.daysLeft}d left`)})
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clickable Due-Date Milestone Clusters along the 90-Day Horizon */}
        {forecast.timelineClusters.length > 0 && (
          <div className="pt-1 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-600">
                {tx('按到期批次檢視（點擊日期節點篩選該批送檢儀器）：', 'Calibration Due-Date Batches (Click milestone to filter):')}
              </span>
              {selectedClusterDate && (
                <button
                  type="button"
                  onClick={() => setSelectedClusterDate(null)}
                  className="font-extrabold text-brand hover:underline cursor-pointer"
                >
                  {tx(`清除日期篩選 (${selectedClusterDate})`, `Clear Date Filter (${selectedClusterDate})`)}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
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
                    className={`shrink-0 rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                      active ? 'ring-2 ring-brand border-brand bg-brand-wash' : `${tone} hover:opacity-90`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black tabular-nums">{cl.dueDate}</span>
                      <span className="rounded-md bg-slate-900/10 px-1.5 py-0.5 font-mono text-[10px] font-extrabold">
                        {cl.count} {tx('件', 'pcs')}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] font-bold opacity-85">
                      {cl.daysLeft < 0
                        ? tx(`已逾期 ${Math.abs(cl.daysLeft)}日`, `Overdue ${Math.abs(cl.daysLeft)}d`)
                        : tx(`${cl.daysLeft} 日後到期`, `In ${cl.daysLeft}d`)}
                      {' · '}
                      {cl.codes.slice(0, 2).join(', ')}
                      {cl.codes.length > 2 ? ` +${cl.codes.length - 2}` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bucket Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        {([
          ['all_90', tx('≤ 90日需跟進總數', 'Total ≤ 90 Days'), scopedCounts.totalWithin90, 'text-slate-900', 'bg-slate-400'],
          ['overdue', tx('已過期 Overdue', 'Expired (<0d)'), scopedCounts.overdue, 'text-rose-600', 'bg-rose-600'],
          ['due_30', tx('0–30 日內到期', 'Due in 0–30d'), scopedCounts.due30, 'text-orange-600', 'bg-orange-500'],
          ['due_60', tx('31–60 日內到期', 'Due in 31–60d'), scopedCounts.due60, 'text-amber-700', 'bg-amber-500'],
          ['due_90', tx('61–90 日內到期', 'Due in 61–90d'), scopedCounts.due90, 'text-sky-700', 'bg-sky-500'],
          ['ok', tx('>90 日有效儀器', '>90d Valid'), scopedCounts.validBeyond90, 'text-emerald-700', 'bg-emerald-500'],
          ['conflicts', tx('排程撞期預警', 'Schedule Conflicts'), scopedCounts.withConflicts, 'text-violet-700', 'bg-violet-600'],
        ] as const).map(([key, label, count, numColor, dotColor]) => {
          const active = bucketFilter === key && !selectedClusterDate;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedClusterDate(null);
                setBucketFilter(key);
                if (key === 'overdue' || key === 'due_30' || key === 'due_60' || key === 'due_90' || key === 'ok') {
                  setSelectedBarBucket(key);
                } else {
                  setSelectedBarBucket(null);
                }
                setListCollapsed(false);
              }}
              className={`rounded-2xl border p-3 text-left transition cursor-pointer ${
                active
                  ? 'border-brand bg-brand-wash/70 ring-2 ring-brand/20'
                  : 'border-slate-200/85 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 truncate whitespace-nowrap">
                <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
                <span className="truncate">{label}</span>
              </div>
              <div className={`mt-1 font-mono text-2xl font-extrabold tabular-nums ${numColor}`}>{count}</div>
            </button>
          );
        })}
      </div>

      {/* Timeline & Conflict List with Collapsible Toggle */}
      <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setListCollapsed(!listCollapsed)}
          className="flex w-full items-center justify-between bg-slate-50/80 px-4 py-2.5 text-left font-extrabold text-slate-800 hover:bg-slate-100/80 cursor-pointer border-b border-slate-100"
        >
          <span>
            {tx(
              `待送外校及排程撞期儀器明細 (${filteredItems.length} 件)`,
              `Instruments Due for Calibration & Conflict Details (${filteredItems.length})`
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-deep">
            {listCollapsed ? tx('展開明細', 'Expand List') : tx('收摺明細', 'Collapse List')}
            {listCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </span>
        </button>

        {!listCollapsed && (
          displayList.length === 0 ? (
            <div className="p-6 text-center space-y-1">
              <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
              <div className="text-sm font-extrabold text-slate-900">
                {tx('此區間內暫無即將到期或撞期之儀器', 'No instruments expiring or conflicting in this bucket')}
              </div>
              <div className="text-[11px] text-slate-500">
                {tx('可切換上方 30 / 60 / 90 日篩選器或點擊時間軸日期節點檢視其他批次', 'Select another 30 / 60 / 90-day filter or timeline milestone above')}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {displayList.map((it) => {
            const eq = it.equipment;
            const pct = Math.max(4, Math.min(100, Math.round((Math.max(0, it.daysLeft) / 90) * 100)));
            const barColor =
              it.bucket === 'overdue'
                ? 'bg-rose-600'
                : it.bucket === 'due_30'
                ? 'bg-orange-500'
                : it.bucket === 'due_60'
                ? 'bg-amber-500'
                : it.bucket === 'due_90'
                ? 'bg-sky-600'
                : 'bg-emerald-500';

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
                ? tx(`已逾期 ${Math.abs(it.daysLeft)} 日`, `Overdue ${Math.abs(it.daysLeft)}d`)
                : tx(`剩餘 ${it.daysLeft} 日`, `${it.daysLeft}d left`);

            return (
              <div
                key={eq.code}
                onClick={() => onOpenDetail(eq.code)}
                className="p-3.5 sm:p-4 hover:bg-brand-wash/30 transition space-y-2.5 cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigateToEquipmentCertPage(eq.code)}
                        className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-xs font-extrabold text-white hover:bg-brand cursor-pointer"
                        title={tx('開啟專屬校準認證狀態頁', 'Open Cert Status Page')}
                      >
                        {eq.code}
                      </button>
                      {it.tags.map((tg) => (
                        <span
                          key={tg}
                          className="rounded bg-brand-wash px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-brand-deep"
                        >
                          {tg}
                        </span>
                      ))}
                      <span className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-extrabold tabular-nums ${badgeCls}`}>
                        {dayLabel} · Cal Due: {it.dueDate}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 tabular-nums">
                        <Send className="h-2.5 w-2.5 text-brand" />
                        {tx(`建議送檢：${it.recommendedSendDate}`, `Send Out: ${it.recommendedSendDate}`)}
                      </span>
                      {it.conflicts.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 border border-violet-300 px-2 py-0.5 text-[11px] font-extrabold text-violet-900">
                          <AlertTriangle className="h-3 w-3 text-violet-700" />
                          {tx(`${it.conflicts.length} 個排程撞期`, `${it.conflicts.length} Schedule Conflict(s)`)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {eq.name}{' '}
                      <span className="font-mono text-xs font-normal text-slate-500">
                        ({eq.maker} · {eq.model} ｜ S/N: {eq.serial})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {eq.currentLoan ? (
                      <span className="rounded-xl bg-brand-wash px-2.5 py-1 text-[11px] font-bold text-brand-deep">
                        {eq.currentLoan.siteLocation} ({eq.currentLoan.borrowerName})
                      </span>
                    ) : (
                      <span className="rounded-xl bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                        {eq.loc || eq.store || 'Lab'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => navigateToEquipmentCertPage(eq.code)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-bold text-brand-deep hover:bg-brand-wash cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {tx('狀態頁', 'Status')}
                    </button>
                    {eq.certUrl && onPreviewCert && (
                      <button
                        type="button"
                        onClick={() => onPreviewCert(eq)}
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 font-extrabold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> Cert
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenDetail(eq.code)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <FileCheck2 className="h-3.5 w-3.5 text-brand" /> {tx('詳情', 'Details')}
                    </button>
                  </div>
                </div>

                {/* 90-Day Countdown Visual Bar */}
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-28 text-right font-mono text-[11px] font-bold text-slate-500 tabular-nums">
                    {it.daysLeft < 0 ? 'EXPIRED' : `${it.daysLeft} / 90 days`}
                  </span>
                </div>

                {/* Schedule Conflict Warnings */}
                {it.conflicts.length > 0 && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/75 px-3 py-2 space-y-1">
                    {it.conflicts.map((c) => (
                      <div key={c.eventId} className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="font-extrabold text-violet-950">
                          {lang === 'en' ? c.reasonEn : c.reasonZh}
                        </span>
                        <span className="font-mono font-bold text-violet-800">
                          {c.eventDate} · {c.eventTitle} ({c.stpCodes.join('+')})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
              })}

              {compact && filteredItems.length > displayList.length && (
                <div className="bg-slate-50 px-4 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={onExpandFullPlanner}
                    className="inline-flex items-center gap-1 font-extrabold text-brand hover:underline cursor-pointer"
                  >
                    {tx(
                      `檢視全部 ${filteredItems.length} 件待送外校儀器及完整排程撞期分析 ›`,
                      `View all ${filteredItems.length} instruments due for calibration & conflict details ›`
                    )}
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>
        </>
      )}
    </section>
  );
};
