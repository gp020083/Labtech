import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { EquipmentItem } from '../types';
import { buildCalibrationForecast, buildCalibrationRenewalCsv } from '../utils/limsProcessTools';
import { CalendarClock, Download, Eye, ChevronRight, X } from 'lucide-react';

export type CalOverviewBucket = 'all_ext' | 'overdue' | 'due_30' | 'due_31_90' | 'valid_90';

export interface CalibrationForecastPanelProps {
  compact?: boolean;
  onExpandFullPlanner?: () => void;
  onOpenDetail?: (code: string) => void;
  onPreviewCert?: (eq: EquipmentItem) => void;
  activeBucket?: string | null;
  onSelectBucket?: (bucket: string) => void;
  selectedBatchDate?: string | null;
  onSelectBatchDate?: (dueDate: string | null) => void;
}

export const CalibrationForecastPanel: React.FC<CalibrationForecastPanelProps> = ({
  compact = false,
  onExpandFullPlanner,
  onOpenDetail,
  onPreviewCert,
  activeBucket,
  onSelectBucket,
  selectedBatchDate,
  onSelectBatchDate,
}) => {
  const { equipment, events, pushToast } = useApp();
  const { tx } = usePrefs();
  const [internalBucket, setInternalBucket] = useState<CalOverviewBucket>('all_ext');
  const [internalBatchDate, setInternalBatchDate] = useState<string | null>(null);

  const currentBucket = activeBucket !== undefined ? activeBucket : internalBucket;
  const currentBatchDate = selectedBatchDate !== undefined ? selectedBatchDate : internalBatchDate;

  const handleBucketClick = (next: CalOverviewBucket) => {
    if (onSelectBatchDate) onSelectBatchDate(null);
    else setInternalBatchDate(null);

    if (onSelectBucket) {
      onSelectBucket(next);
    } else {
      setInternalBucket(next);
    }
  };

  const handleBatchClick = (dueDate: string) => {
    const nextDate = currentBatchDate === dueDate ? null : dueDate;
    if (onSelectBatchDate) {
      onSelectBatchDate(nextDate);
    } else {
      setInternalBatchDate(nextDate);
    }
  };

  const clearBatch = () => {
    if (onSelectBatchDate) onSelectBatchDate(null);
    else setInternalBatchDate(null);
  };

  const forecast = useMemo(() => buildCalibrationForecast(equipment, events), [equipment, events]);

  const extItems = useMemo(
    () => forecast.items.filter((it) => it.isExternalCal && it.daysLeft < 900),
    [forecast.items]
  );

  const counts = useMemo(() => {
    const overdue = extItems.filter((i) => i.bucket === 'overdue').length;
    const due30 = extItems.filter((i) => i.bucket === 'due_30').length;
    const due31to90 = extItems.filter((i) => i.bucket === 'due_60' || i.bucket === 'due_90').length;
    const valid90 = extItems.filter((i) => i.bucket === 'ok').length;
    return {
      total: extItems.length,
      overdue,
      due30,
      due31to90,
      valid90,
    };
  }, [extItems]);

  const extClusters = useMemo(() => {
    const map = new Map<string, { dueDate: string; count: number; bucket: string; daysLeft: number }>();
    for (const it of extItems) {
      if (it.bucket === 'ok' || !/^\d{4}-\d{2}-\d{2}$/.test(it.dueDate)) continue;
      const prev = map.get(it.dueDate);
      if (prev) {
        prev.count += 1;
      } else {
        map.set(it.dueDate, {
          dueDate: it.dueDate,
          count: 1,
          bucket: it.bucket,
          daysLeft: it.daysLeft,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [extItems]);

  const filteredExtItems = useMemo(() => {
    return extItems.filter((it) => {
      if (currentBatchDate) return it.dueDate === currentBatchDate;
      if (!currentBucket || currentBucket === 'all_ext') return true;
      if (currentBucket === 'overdue') return it.bucket === 'overdue';
      if (currentBucket === 'due_30') return it.bucket === 'due_30';
      if (currentBucket === 'due_31_90') return it.bucket === 'due_60' || it.bucket === 'due_90';
      if (currentBucket === 'valid_90') return it.bucket === 'ok';
      return true;
    });
  }, [extItems, currentBucket, currentBatchDate]);

  const handleExportRenewalCsv = () => {
    const urgentList = extItems.filter((i) => i.bucket !== 'ok');
    const targetList =
      currentBatchDate || (currentBucket && currentBucket !== 'all_ext')
        ? filteredExtItems
        : urgentList.length > 0
        ? urgentList
        : extItems;
    const csv = buildCalibrationRenewalCsv(targetList);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Labtech_Calibration_Due_${forecast.refToday}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    pushToast(
      tx('已匯出校準到期清單 CSV', 'Calibration Due List CSV Exported'),
      tx(`共 ${targetList.length} 件外校儀器 · ${forecast.refToday}`, `${targetList.length} external cal items · ${forecast.refToday}`)
    );
  };

  const barTotal = Math.max(1, counts.total);
  const compactRows = useMemo(() => {
    const source =
      currentBatchDate || (currentBucket && currentBucket !== 'all_ext')
        ? filteredExtItems
        : extItems.filter((i) => i.bucket !== 'ok');
    return source.slice(0, 5);
  }, [extItems, filteredExtItems, currentBatchDate, currentBucket]);

  const kpiPills: {
    key: CalOverviewBucket;
    label: string;
    count: number;
    dotCls: string;
    numCls: string;
  }[] = [
    {
      key: 'all_ext',
      label: tx('全部外校儀器', 'All External Cal'),
      count: counts.total,
      dotCls: 'bg-slate-500',
      numCls: 'text-slate-900',
    },
    {
      key: 'overdue',
      label: tx('已逾期', 'Overdue'),
      count: counts.overdue,
      dotCls: 'bg-rose-600',
      numCls: 'text-rose-600',
    },
    {
      key: 'due_30',
      label: tx('30日內到期', 'Due ≤30d'),
      count: counts.due30,
      dotCls: 'bg-orange-500',
      numCls: 'text-orange-600',
    },
    {
      key: 'due_31_90',
      label: tx('31–90日內到期', 'Due 31–90d'),
      count: counts.due31to90,
      dotCls: 'bg-amber-500',
      numCls: 'text-amber-700',
    },
    {
      key: 'valid_90',
      label: tx('>90日有效', 'Valid >90d'),
      count: counts.valid90,
      dotCls: 'bg-emerald-500',
      numCls: 'text-emerald-700',
    },
  ];

  return (
    <section
      aria-label="Calibration Status Overview"
      className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-slate-900">
            <CalendarClock className="h-4 w-4 text-brand shrink-0" />
            {tx('校準到期狀態總覽', 'Calibration Due Overview')}
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-500 tabular-nums">
            {tx(`基準日 ${forecast.refToday}`, `Ref ${forecast.refToday}`)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportRenewalCsv}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:border-brand hover:bg-white hover:text-brand transition cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            {tx('匯出到期清單 CSV', 'Export Due CSV')}
          </button>
          {compact && onExpandFullPlanner && (
            <button
              type="button"
              onClick={onExpandFullPlanner}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              {tx('完整列表', 'Full List')}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4-Segment Proportional Color Bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 gap-0.5">
        {counts.overdue > 0 && (
          <button
            type="button"
            onClick={() => handleBucketClick(currentBucket === 'overdue' ? 'all_ext' : 'overdue')}
            style={{ width: `${Math.max(4, (counts.overdue / barTotal) * 100)}%` }}
            title={`${tx('已逾期', 'Overdue')} · ${counts.overdue}`}
            className={`h-full rounded-l-full bg-rose-500 hover:bg-rose-600 transition-all cursor-pointer ${
              currentBucket === 'overdue' && !currentBatchDate ? 'ring-2 ring-slate-900 z-10' : ''
            }`}
          />
        )}
        {counts.due30 > 0 && (
          <button
            type="button"
            onClick={() => handleBucketClick(currentBucket === 'due_30' ? 'all_ext' : 'due_30')}
            style={{ width: `${Math.max(4, (counts.due30 / barTotal) * 100)}%` }}
            title={`${tx('30日內到期', 'Due ≤30d')} · ${counts.due30}`}
            className={`h-full bg-orange-500 hover:bg-orange-600 transition-all cursor-pointer ${
              currentBucket === 'due_30' && !currentBatchDate ? 'ring-2 ring-slate-900 z-10' : ''
            }`}
          />
        )}
        {counts.due31to90 > 0 && (
          <button
            type="button"
            onClick={() => handleBucketClick(currentBucket === 'due_31_90' ? 'all_ext' : 'due_31_90')}
            style={{ width: `${Math.max(4, (counts.due31to90 / barTotal) * 100)}%` }}
            title={`${tx('31–90日內到期', 'Due 31–90d')} · ${counts.due31to90}`}
            className={`h-full bg-amber-400 hover:bg-amber-500 transition-all cursor-pointer ${
              currentBucket === 'due_31_90' && !currentBatchDate ? 'ring-2 ring-slate-900 z-10' : ''
            }`}
          />
        )}
        {counts.valid90 > 0 && (
          <button
            type="button"
            onClick={() => handleBucketClick(currentBucket === 'valid_90' ? 'all_ext' : 'valid_90')}
            style={{ width: `${Math.max(6, (counts.valid90 / barTotal) * 100)}%` }}
            title={`${tx('>90日有效', 'Valid >90d')} · ${counts.valid90}`}
            className={`h-full rounded-r-full bg-emerald-500 hover:bg-emerald-600 transition-all cursor-pointer ${
              currentBucket === 'valid_90' && !currentBatchDate ? 'ring-2 ring-slate-900 z-10' : ''
            }`}
          />
        )}
      </div>

      {/* Clickable KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {kpiPills.map((pill) => {
          const active = currentBucket === pill.key && !currentBatchDate;
          return (
            <button
              key={pill.key}
              type="button"
              onClick={() => handleBucketClick(pill.key)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                active
                  ? 'border-brand bg-brand-wash/60 ring-2 ring-brand/20 shadow-2xs'
                  : 'border-slate-200/85 bg-slate-50/70 hover:bg-white'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 truncate">
                <span className={`h-2 w-2 rounded-full shrink-0 ${pill.dotCls}`} />
                <span className="truncate">{pill.label}</span>
              </span>
              <span className={`font-mono text-sm font-extrabold tabular-nums ${pill.numCls}`}>
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Single-Row Clickable Due Batch Tags */}
      {extClusters.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1">
            {tx('到期批次', 'Batches')}
          </span>
          {extClusters.map((cl) => {
            const active = currentBatchDate === cl.dueDate;
            const toneCls =
              cl.bucket === 'overdue'
                ? 'border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-300'
                : cl.bucket === 'due_30'
                ? 'border-orange-200 bg-orange-50 text-orange-800 hover:border-orange-300'
                : 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300';
            return (
              <button
                key={cl.dueDate}
                type="button"
                onClick={() => handleBatchClick(cl.dueDate)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  active
                    ? 'border-brand bg-slate-900 text-white shadow-2xs'
                    : toneCls
                }`}
              >
                <span className="font-mono font-extrabold tabular-nums">{cl.dueDate}</span>
                <span className="opacity-70">·</span>
                <span className="font-mono font-extrabold tabular-nums">
                  {cl.count}
                  {tx('件', '')}
                </span>
              </button>
            );
          })}
          {currentBatchDate && (
            <button
              type="button"
              onClick={clearBatch}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-brand shrink-0 cursor-pointer"
            >
              <X className="h-3 w-3" />
              {tx('清除', 'Clear')}
            </button>
          )}
        </div>
      )}

      {/* Optional Compact 5-Row Scannable Table when compact mode is used standalone */}
      {compact && compactRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200/85 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-extrabold text-slate-500">
              <tr>
                <th className="px-3 py-2">{tx('儀器編號', 'Code')}</th>
                <th className="px-3 py-2">{tx('儀器名稱', 'Name')}</th>
                <th className="px-3 py-2">{tx('校準到期日', 'Cal Due')}</th>
                <th className="px-3 py-2 text-right">{tx('證書', 'Cert')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {compactRows.map((it) => {
                const eq = it.equipment;
                const certUrl = eq.certUrl || eq.calCerts?.find((c) => c.dataUrl)?.dataUrl;
                return (
                  <tr
                    key={eq.code}
                    onClick={() => onOpenDetail?.(eq.code)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white">
                        {eq.code}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-900 truncate max-w-[200px]">
                      {eq.name}
                    </td>
                    <td className="px-3 py-2 font-mono font-bold tabular-nums whitespace-nowrap text-slate-800">
                      {it.dueDate}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {certUrl && onPreviewCert ? (
                        <button
                          type="button"
                          onClick={() => onPreviewCert(eq)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                        >
                          <Eye className="h-3 w-3 shrink-0" />
                          {tx('預覽證書', 'Preview')}
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
