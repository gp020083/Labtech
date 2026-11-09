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
