import React, { useState, useMemo } from 'react';
import { usePrefs } from '../../prefs';
import { ToolGuideCard } from './ToolGuideCard';
import { Plus, RotateCcw } from 'lucide-react';

export type BleedUnit = 'mL' | 'mm';

interface BleedRow {
  timeLabel: string;
  v2: string;
  vg: string;
}

const DEFAULT_ML_ROWS: BleedRow[] = [
  { timeLabel: '15 min', v2: '802', vg: '800' },
  { timeLabel: '30 min', v2: '804', vg: '799' },
  { timeLabel: '60 min', v2: '805', vg: '797' },
  { timeLabel: '120 min', v2: '806', vg: '795' },
  { timeLabel: '180 min (3hr)', v2: '806', vg: '794' },
];

const DEFAULT_MM_ROWS: BleedRow[] = [
  { timeLabel: '15 min', v2: '100.2', vg: '100.0' },
  { timeLabel: '30 min', v2: '100.5', vg: '99.8' },
  { timeLabel: '60 min', v2: '100.6', vg: '99.5' },
  { timeLabel: '120 min', v2: '100.8', vg: '99.3' },
  { timeLabel: '180 min (3hr)', v2: '100.8', vg: '99.3' },
];

export const BleedingCalcTool: React.FC<{ onViewAllSpecs?: () => void }> = ({ onViewAllSpecs }) => {
  const { tx } = usePrefs();
  const [unit, setUnit] = useState<BleedUnit>('mL');
  const [v1, setV1] = useState('800');
  const [decantedVw, setDecantedVw] = useState('12');
  const [specLimit, setSpecLimit] = useState('2.0');
  const [rows, setRows] = useState<BleedRow[]>(DEFAULT_ML_ROWS);

  const isMl = unit === 'mL';
  const sym1 = isMl ? 'V1' : 'H1';
  const sym2 = isMl ? 'V2' : 'H2';
  const symG = isMl ? 'Vg' : 'Hg';
  const symW = isMl ? 'Vw' : 'Hw';

  const switchUnit = (next: BleedUnit) => {
    if (next === unit) return;
    setUnit(next);
    if (next === 'mm') {
      setV1('100');
      setDecantedVw('1.5');
      setRows(DEFAULT_MM_ROWS);
    } else {
      setV1('800');
      setDecantedVw('12');
      setRows(DEFAULT_ML_ROWS);
    }
  };

  const resetSample = () => {
    if (isMl) {
      setV1('800'); setDecantedVw('12'); setRows(DEFAULT_ML_ROWS);
    } else {
      setV1('100'); setDecantedVw('1.5'); setRows(DEFAULT_MM_ROWS);
    }
  };


  const v1Num = Math.max(0.1, parseFloat(v1) || (isMl ? 800 : 100));
  const v1Valid = isMl ? v1Num >= 790 && v1Num <= 810 : v1Num > 0;
  const limitNum = Math.max(0, parseFloat(specLimit) || 2.0);

  const computedRows = useMemo(() => {
    return rows.map((r) => {
      const v2Num = parseFloat(r.v2);
      const vgNum = parseFloat(r.vg);
      const valid = Number.isFinite(v2Num) && Number.isFinite(vgNum) && v2Num > 0 && vgNum > 0;
      const bleedAmt = valid ? Math.max(0, v2Num - vgNum) : 0;
      const bleedPct = valid ? (bleedAmt / v1Num) * 100 : 0;
      const expPct = valid ? ((v2Num - v1Num) / v1Num) * 100 : 0;
      return { ...r, valid, bleedAmt, bleedPct, expPct };
    });
  }, [rows, v1Num]);

  const lastValid = [...computedRows].reverse().find((r) => r.valid);
  const parsedDecant = parseFloat(decantedVw);
  const hasDecant = decantedVw.trim() !== '' && Number.isFinite(parsedDecant) && parsedDecant >= 0;
  const finalBleedAmt = hasDecant ? parsedDecant : (lastValid?.bleedAmt ?? 0);
  const finalBleedPct = (finalBleedAmt / v1Num) * 100;
  const finalExpPct = lastValid?.expPct ?? 0;
  const isPass = finalBleedPct <= limitNum;
  const fmtAmt = (val: number) => Number(val.toFixed(2)).toString();

  const updateRow = (idx: number, field: keyof BleedRow, val: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  };

  const addRow = () => {
    const last = rows[rows.length - 1];
    setRows((prev) => [
      ...prev,
      {
        timeLabel: `${(prev.length + 1) * 30} min`,
        v2: last?.v2 ?? (isMl ? '806' : '100.8'),
        vg: last?.vg ?? (isMl ? '794' : '99.3'),
      },
    ]);
  };

  const copySummary = [
    `[BL Grout Bleeding & Expansion — Unit: ${unit}]`,
    `Initial (${sym1}): ${v1Num} ${unit}`,
    `Final Bleed (${hasDecant ? symW : `${sym2}-${symG}`}): ${fmtAmt(finalBleedAmt)} ${unit}`,
    `Final Bleeding: ${finalBleedPct.toFixed(2)}% (Spec <= ${limitNum.toFixed(1)}% -> ${isPass ? 'PASS' : 'EXCEED'})`,
    `Free Expansion: ${finalExpPct >= 0 ? '+' : ''}${finalExpPct.toFixed(2)}%`,
  ].join('\n');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            {tx('💧 Grout 泌水率及膨脹率計算器 (Bleeding & Expansion)', '💧 Grout Bleeding & Expansion Calculator')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isMl
              ? tx('ASTM C940 量筒體積法（以 1000 mL 量筒讀取 mL 刻度）', 'ASTM C940 Graduated Cylinder Volume Method (mL readings)')
              : tx('透明管／量筒液面高度法（以經校準鋼尺讀取 mm 高度）', 'Transparent Tube / Cylinder Height Method (Calibrated steel ruler mm readings)')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-extrabold">
            <button
              type="button"
              onClick={() => switchUnit('mL')}
              className={`rounded-lg px-3 py-1.5 transition cursor-pointer whitespace-nowrap ${isMl ? 'bg-brand text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {tx('體積單位 (mL)', 'Volume (mL)')}
            </button>
            <button
              type="button"
              onClick={() => switchUnit('mm')}
              className={`rounded-lg px-3 py-1.5 transition cursor-pointer whitespace-nowrap ${!isMl ? 'bg-brand text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {tx('高度單位 (mm)', 'Height (mm)')}
            </button>
          </div>
          <button
            type="button"
            onClick={resetSample}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {tx('重設範例', 'Reset Sample')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <label className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-1.5 block">
          <span className="font-extrabold text-slate-700">
            {isMl ? tx('1. 初始漿體體積 V1 (mL)', '1. Initial Grout Volume V1 (mL)') : tx('1. 初始漿體高度 H1 (mm)', '1. Initial Grout Height H1 (mm)')}
          </span>
          <input type="number" step="any" value={v1} onChange={(e) => setV1(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-900" />
          <span className={`block text-[11px] font-semibold ${!v1Valid ? 'text-amber-700' : 'text-slate-500'}`}>
            {isMl
              ? (!v1Valid ? tx('⚠️ ASTM C940 標準要求 800 ± 10 mL', '⚠️ ASTM C940 requires 800 ± 10 mL') : tx('標準要求：800 ± 10 mL', 'Standard: 800 ± 10 mL'))
              : tx('以經校準鋼尺 (LT-SR-12/13) 量度初始高度', 'Measure initial height with calibrated steel ruler')}
          </span>
        </label>
        <label className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-1.5 block">
          <span className="font-extrabold text-slate-700">
            {isMl ? tx('2. 最終傾析泌水量 Vw (mL，選填)', '2. Final Decanted Water Vw (mL, Optional)') : tx('2. 最終泌水層高度 Hw (mm，選填)', '2. Final Bleed Layer Height Hw (mm, Optional)')}
          </span>
          <input type="number" step="any" value={decantedVw} onChange={(e) => setDecantedVw(e.target.value)} placeholder={tx('選填', 'Optional')} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-900" />
          <span className="block text-[11px] text-slate-500">
            {tx(`留空則自動按最後時段 (${sym2} − ${symG}) 計算`, `Blank uses last interval (${sym2} − ${symG})`)}
          </span>
        </label>
        <label className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-1.5 block">
          <span className="font-extrabold text-slate-700">{tx('3. 驗收上限 Spec Max Bleeding (%)', '3. Spec Max Bleeding Limit (%)')}</span>
          <input type="number" step="0.1" value={specLimit} onChange={(e) => setSpecLimit(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-900" />
          <span className="block text-[11px] text-slate-500">{tx('一般要求：3 小時 ≤ 2.0%（依合約規格為準）', 'Typical spec: ≤ 2.0% at 3 hrs')}</span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`rounded-2xl border p-4 ${isPass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-600">{tx('最終泌水率 Final Bleeding', 'Final Bleeding (%)')}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold whitespace-nowrap ${isPass ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
              {isPass ? tx('合格 PASS', 'PASS') : tx('超標 EXCEED', 'EXCEED')}
            </span>
          </div>
          <div className="mt-1.5 font-mono text-2xl font-black text-slate-900">{finalBleedPct.toFixed(2)}%</div>
          <div className="text-[11px] text-slate-600 mt-0.5">{tx(`驗收標準 ≤ ${limitNum.toFixed(1)}%`, `Spec Limit ≤ ${limitNum.toFixed(1)}%`)}</div>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
          <span className="text-xs font-extrabold text-slate-600">{tx('自由膨脹率 Free Expansion', 'Free Expansion (%)')}</span>
          <div className="mt-1.5 font-mono text-2xl font-black text-slate-900">{finalExpPct >= 0 ? '+' : ''}{finalExpPct.toFixed(2)}%</div>
          <div className="text-[11px] text-slate-600 mt-0.5 font-mono">({sym2} − {sym1}) / {sym1} × 100%</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="text-xs font-extrabold text-slate-600">
            {isMl ? tx('最終泌水體積 (mL)', 'Final Bleed Volume (mL)') : tx('最終泌水高度 (mm)', 'Final Bleed Height (mm)')}
          </span>
          <div className="mt-1.5 font-mono text-2xl font-black text-brand-deep">{fmtAmt(finalBleedAmt)} {unit}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {hasDecant ? tx(`按實測 ${symW} 計算`, `From measured ${symW}`) : tx(`按最後時段 (${sym2} − ${symG}) 計算`, `From last interval (${sym2} − ${symG})`)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold whitespace-nowrap">
              <tr>
                <th className="px-3 py-2.5">{tx('讀數時段', 'Time Interval')}</th>
                <th className="px-3 py-2.5">{isMl ? tx('總液面 V2 (mL)', 'Upper Surface V2 (mL)') : tx('總液面高度 H2 (mm)', 'Upper Surface H2 (mm)')}</th>
                <th className="px-3 py-2.5">{isMl ? tx('漿體面 Vg (mL)', 'Grout Surface Vg (mL)') : tx('漿體面高度 Hg (mm)', 'Grout Surface Hg (mm)')}</th>
                <th className="px-3 py-2.5">{tx(`泌水量 (${unit})`, `Bleed (${unit})`)}</th>
                <th className="px-3 py-2.5">{tx('泌水率 (%)', 'Bleeding (%)')}</th>
                <th className="px-3 py-2.5">{tx('膨脹率 (%)', 'Expansion (%)')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {computedRows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2"><input value={r.timeLabel} onChange={(e) => updateRow(i, 'timeLabel', e.target.value)} className="w-28 rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-800" /></td>
                  <td className="px-3 py-2"><input type="number" step="any" value={r.v2} onChange={(e) => updateRow(i, 'v2', e.target.value)} className="w-24 rounded-lg border border-slate-200 px-2 py-1 font-mono font-bold text-slate-900" /></td>
                  <td className="px-3 py-2"><input type="number" step="any" value={r.vg} onChange={(e) => updateRow(i, 'vg', e.target.value)} className="w-24 rounded-lg border border-slate-200 px-2 py-1 font-mono font-bold text-slate-900" /></td>
                  <td className="px-3 py-2 font-mono font-bold text-slate-700 whitespace-nowrap">{r.valid ? `${fmtAmt(r.bleedAmt)} ${unit}` : '—'}</td>
                  <td className="px-3 py-2 font-mono font-extrabold text-brand-deep whitespace-nowrap">{r.valid ? `${r.bleedPct.toFixed(2)}%` : '—'}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-sky-700 whitespace-nowrap">{r.valid ? `${r.expPct >= 0 ? '+' : ''}${r.expPct.toFixed(2)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2">
          <button type="button" onClick={addRow} className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100 cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> {tx('新增讀數時段', 'Add Reading Interval')}
          </button>
        </div>
      </div>

      <ToolGuideCard
        stpCode="BL"
        standardRef={isMl ? 'ASTM C940 · STP04-GTT-C940 (Volume mL)' : 'ASTM C940 / GS Height Method · STP04-GTT-C940 (Height mm)'}
        formulaText={`Bleeding (%) = (${sym2} − ${symG}) / ${sym1} × 100%${hasDecant ? ` [Final: ${symW} / ${sym1} × 100%]` : ''} ｜ Expansion (%) = (${sym2} − ${sym1}) / ${sym1} × 100%`}
        structuredData={{
          kind: 'BL',
          unit,
          v1: v1Num,
          decantedVw: hasDecant ? parsedDecant : null,
          specLimitPct: limitNum,
          finalBleedAmt,
          finalBleedPct,
          finalExpPct,
          isPass,
          intervals: computedRows
            .filter((r) => r.valid)
            .map((r) => ({
              timeLabel: r.timeLabel,
              v2: parseFloat(r.v2) || 0,
              vg: parseFloat(r.vg) || 0,
              bleedAmt: r.bleedAmt,
              bleedPct: r.bleedPct,
              expPct: r.expPct,
            })),
        }}
        steps={[
          {
            title: tx('注入灌漿樣本', 'Pour Fresh Grout Sample'),
            detail: isMl
              ? tx('將新拌 Grout 注入 1000 mL 量筒至 V1 = 800 ± 10 mL，隨即密封頂部以防蒸發。', 'Pour freshly mixed grout into a 1000 mL graduated cylinder to V1 = 800 ± 10 mL and cover immediately to prevent evaporation.')
              : tx('將新拌 Grout 注入透明直管或量筒，以經校準鋼尺 (LT-SR-12/13) 讀取初始高度 H1 (mm)，並密封頂部。', 'Pour freshly mixed grout into a transparent cylinder/tube, measure initial height H1 (mm) using a calibrated steel ruler (LT-SR-12/13), and seal the top.'),
          },
          {
            title: tx('定時讀取液面與漿體面', 'Record Interval Readings'),
            detail: tx(`首小時每 15 分鐘讀取一次，其後每小時讀取總上表面 (${sym2}) 及沉降漿體面 (${symG})，直至連續兩次讀數無變化。`, `Record upper surface (${sym2}) and settled grout surface (${symG}) every 15 min for the first hour, then hourly until two successive readings show no further change.`),
          },
          {
            title: tx('最終泌水核對', 'Final Bleeding Verification'),
            detail: isMl
              ? tx('測試結束時可將上層泌水傾析至小量筒實測 Vw (mL)，核對最終泌水率。', 'At completion, decant bleed water into a small graduated cylinder to measure Vw (mL) for final bleeding verification.')
              : tx('測試結束時可直接以經校準鋼尺量度上層泌水層厚度 Hw (mm)，核對最終泌水率。', 'At completion, measure the clear bleed water layer thickness Hw (mm) directly with a calibrated steel ruler.'),
          },
        ]}
        pitfalls={[
          tx('試驗期間量筒／透明管必須放置於無震動之水平檯面上（以水平尺 LT-LV-01 檢查），任何震動均會導致泌水偏高。', 'Place the cylinder/tube on a level, vibration-free surface (verified with spirit level LT-LV-01); vibration artificially increases bleeding.'),
          tx('讀取刻度或鋼尺高度時視線須與液面凹液面底部保持水平，並記錄環境及漿體溫度。', 'Keep eye level horizontal with the meniscus/interface when taking mL or mm readings, and record ambient and grout temperatures.'),
        ]}
        copyText={copySummary}
        onViewAllSpecs={onViewAllSpecs}
      />
    </div>
  );
};
