import React, { useState, useMemo } from 'react';
import { usePrefs } from '../../prefs';
import { getHkTodayIso } from '../../utils';
import { formatNearest02, roundToNearestStep } from '../../utils/limsRules';
import { BleedingStructuredPayload } from '../../utils/completedWorksheetGenerator';
import { ToolGuideCard } from './ToolGuideCard';
import { Plus, RotateCcw, CopyCheck } from 'lucide-react';

export type BleedUnit = 'mL' | 'mm';

interface BleedRow {
  timeLabel: string;
  v2: string;
  vg: string;
}

interface SpecimenData {
  v1: string;
  decantedVw: string;
  rows: BleedRow[];
}

const DEFAULT_ML_ROWS: BleedRow[] = [
  { timeLabel: '15m', v2: '801', vg: '800' },
  { timeLabel: '30m', v2: '803', vg: '799' },
  { timeLabel: '45m', v2: '804', vg: '798' },
  { timeLabel: '60m', v2: '805', vg: '797' },
  { timeLabel: '2h · 120m', v2: '806', vg: '795' },
  { timeLabel: '3h · 180m', v2: '806', vg: '794' },
  { timeLabel: '24h · 1440m', v2: '', vg: '' },
];

const DEFAULT_MM_ROWS: BleedRow[] = [
  { timeLabel: '15m', v2: '100.2', vg: '100.0' },
  { timeLabel: '30m', v2: '100.4', vg: '99.9' },
  { timeLabel: '45m', v2: '100.5', vg: '99.7' },
  { timeLabel: '60m', v2: '100.6', vg: '99.5' },
  { timeLabel: '2h · 120m', v2: '100.8', vg: '99.3' },
  { timeLabel: '3h · 180m', v2: '100.8', vg: '99.3' },
  { timeLabel: '24h · 1440m', v2: '', vg: '' },
];

function cloneRows(src: BleedRow[], blankReadings = false): BleedRow[] {
  return src.map((r) => ({
    timeLabel: r.timeLabel,
    v2: blankReadings ? '' : r.v2,
    vg: blankReadings ? '' : r.vg,
  }));
}

function makeDefaultSpecimens(unit: BleedUnit): [SpecimenData, SpecimenData, SpecimenData] {
  const baseRows = unit === 'mL' ? DEFAULT_ML_ROWS : DEFAULT_MM_ROWS;
  const initV1 = unit === 'mL' ? '800' : '100';
  const initVw = unit === 'mL' ? '12' : '1.5';
  return [
    { v1: initV1, decantedVw: initVw, rows: cloneRows(baseRows, false) },
    { v1: initV1, decantedVw: '', rows: cloneRows(baseRows, true) },
    { v1: initV1, decantedVw: '', rows: cloneRows(baseRows, true) },
  ];
}

export function parseIntervalMinutes(label: string): number {
  const clean = label.trim().toLowerCase();
  const minMatch = clean.match(/(\d+)\s*m/);
  if (minMatch) return parseInt(minMatch[1], 10);
  const hrMatch = clean.match(/(\d+(?:\.\d+)?)\s*h/);
  if (hrMatch) return Math.round(parseFloat(hrMatch[1]) * 60);
  const raw = parseInt(clean, 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 60;
}

function evaluateSpecimen(sp: SpecimenData, isMl: boolean) {
  const v1Num = Math.max(0.1, parseFloat(sp.v1) || (isMl ? 800 : 100));
  const v1Valid = isMl ? v1Num >= 790 && v1Num <= 810 : v1Num >= 95 && v1Num <= 105;
  const computedRows = sp.rows.map((r) => {
    const v2Num = parseFloat(r.v2);
    const vgNum = parseFloat(r.vg);
    const valid =
      r.v2.trim() !== '' &&
      r.vg.trim() !== '' &&
      Number.isFinite(v2Num) &&
      Number.isFinite(vgNum) &&
      v2Num > 0 &&
      vgNum > 0;
    const bleedAmt = valid ? Math.max(0, v2Num - vgNum) : 0;
    const groutExpPct = valid ? ((vgNum - v1Num) / v1Num) * 100 : 0;
    const bleedPct = valid ? (bleedAmt / v1Num) * 100 : 0;
    const expPct = valid ? ((v2Num - v1Num) / v1Num) * 100 : 0;
    return { ...r, valid, v2Num, vgNum, bleedAmt, groutExpPct, bleedPct, expPct };
  });

  const lastValid = [...computedRows].reverse().find((r) => r.valid);
  const parsedDecant = parseFloat(sp.decantedVw);
  const hasDecant = sp.decantedVw.trim() !== '' && Number.isFinite(parsedDecant) && parsedDecant >= 0;
  const hasAnyData = Boolean(lastValid) || hasDecant;
  const finalBleedAmt = hasDecant ? parsedDecant : (lastValid?.bleedAmt ?? 0);
  const finalBleedPct = (finalBleedAmt / v1Num) * 100;
  const finalGroutExpPct = lastValid?.groutExpPct ?? 0;
  const finalExpPct = lastValid?.expPct ?? 0;

  return {
    v1Num,
    v1Valid,
    computedRows,
    lastValid,
    hasDecant,
    parsedDecant: hasDecant ? parsedDecant : null,
    hasAnyData,
    finalBleedAmt,
    finalBleedPct,
    finalGroutExpPct,
    finalExpPct,
  };
}

export const BleedingCalcTool: React.FC<{ onViewAllSpecs?: () => void }> = ({ onViewAllSpecs }) => {
  const { tx } = usePrefs();
  const [unit, setUnit] = useState<BleedUnit>('mL');
  const [specIdx, setSpecIdx] = useState<0 | 1 | 2>(0);
  const [specimens, setSpecimens] = useState<[SpecimenData, SpecimenData, SpecimenData]>(() =>
    makeDefaultSpecimens('mL')
  );
  const [specLimit, setSpecLimit] = useState('2.0');
  const [cementBrand, setCementBrand] = useState('Green Island OPC · BS EN 197-1 CEM I 52.5N');
  const [cementQty, setCementQty] = useState('50 kg · 1 Bag');
  const [admixtureBrand, setAdmixtureBrand] = useState('Sika Grout Aid / Cebex 100');
  const [admixtureQty, setAdmixtureQty] = useState('0.225 kg');
  const [waterSource, setWaterSource] = useState('Mains Potable Water · WSD');
  const [waterQty, setWaterQty] = useState('21.0 L');
  const [wcRatio, setWcRatio] = useState('0.42');
  const [ambientTempText, setAmbientTempText] = useState('23.0');
  const [waterTempText, setWaterTempText] = useState('23.0');
  const [testDateIso, setTestDateIso] = useState(() => getHkTodayIso());
  const [batchNo, setBatchNo] = useState('');
  const [sampleId, setSampleId] = useState('');

  const isMl = unit === 'mL';
  const sym1 = isMl ? 'V1' : 'H1';
  const sym2 = isMl ? 'V2' : 'H2';
  const symG = isMl ? 'Vg' : 'Hg';
  const symW = isMl ? 'Vw' : 'Hw';

  const switchUnit = (next: BleedUnit) => {
    if (next === unit) return;
    setUnit(next);
    setSpecIdx(0);
    setSpecimens(makeDefaultSpecimens(next));
  };

  const resetSample = () => {
    setSpecIdx(0);
    setSpecimens(makeDefaultSpecimens(unit));
    setAmbientTempText('23.0');
    setWaterTempText('23.0');
  };

  const copyFromSpec1 = (targetIdx: 1 | 2) => {
    setSpecimens((prev) => {
      const next = [...prev] as [SpecimenData, SpecimenData, SpecimenData];
      next[targetIdx] = {
        v1: prev[0].v1,
        decantedVw: prev[0].decantedVw,
        rows: cloneRows(prev[0].rows, false),
      };
      return next;
    });
  };

  const copySpec1ToAll = () => {
    setSpecimens((prev) => [
      prev[0],
      { v1: prev[0].v1, decantedVw: prev[0].decantedVw, rows: cloneRows(prev[0].rows, false) },
      { v1: prev[0].v1, decantedVw: prev[0].decantedVw, rows: cloneRows(prev[0].rows, false) },
    ]);
  };

  const updateActiveSpecimen = (patch: Partial<SpecimenData>) => {
    setSpecimens((prev) => {
      const next = [...prev] as [SpecimenData, SpecimenData, SpecimenData];
      next[specIdx] = { ...next[specIdx], ...patch };
      return next;
    });
  };

  const evaluatedAll = useMemo(
    () => [
      evaluateSpecimen(specimens[0], isMl),
      evaluateSpecimen(specimens[1], isMl),
      evaluateSpecimen(specimens[2], isMl),
    ],
    [specimens, isMl]
  );

  const activeSpec = specimens[specIdx];
  const activeEval = evaluatedAll[specIdx];
  const filledEvals = evaluatedAll.filter((e, i) => i === 0 || e.hasAnyData);

  const meanFinalBleedPct =
    filledEvals.reduce((s, e) => s + e.finalBleedPct, 0) / Math.max(1, filledEvals.length);
  const meanGroutExpPct =
    filledEvals.reduce((s, e) => s + e.finalGroutExpPct, 0) / Math.max(1, filledEvals.length);
  const meanFreeExpPct =
    filledEvals.reduce((s, e) => s + e.finalExpPct, 0) / Math.max(1, filledEvals.length);

  const limitNum = Math.max(0, parseFloat(specLimit) || 2.0);
  const ambTempNum = parseFloat(ambientTempText);
  const ambTempOk = Number.isFinite(ambTempNum) && ambTempNum >= 21.0 && ambTempNum <= 25.0;
  const allFilledV1Valid = filledEvals.every((e) => e.v1Valid);

  const reportedBleedPct = roundToNearestStep(meanFinalBleedPct, 0.2);
  const bleedWithinSpec = reportedBleedPct <= limitNum + 1e-9;
  const isPass = bleedWithinSpec && allFilledV1Valid && ambTempOk;

  const fmtAmt = (val: number) => Number(val.toFixed(2)).toString();
  const fmtSigned02 = (val: number) => {
    const r = roundToNearestStep(val, 0.2);
    return `${r > 0 ? '+' : ''}${formatNearest02(val)}%`;
  };

  const updateRow = (idx: number, field: keyof BleedRow, val: string) => {
    const nextRows = activeSpec.rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r));
    updateActiveSpecimen({ rows: nextRows });
  };

  const addRow = () => {
    const curRows = activeSpec.rows;
    const lastIdx = curRows.length - 1;
    const lastIsBlank24h =
      lastIdx >= 0 &&
      parseIntervalMinutes(curRows[lastIdx].timeLabel) >= 1440 &&
      curRows[lastIdx].v2.trim() === '' &&
      curRows[lastIdx].vg.trim() === '';

    const refRow = lastIsBlank24h && lastIdx > 0 ? curRows[lastIdx - 1] : curRows[lastIdx];
    const prevMin = refRow ? parseIntervalMinutes(refRow.timeLabel) : 0;
    const nextMin = prevMin < 60 ? prevMin + 15 : prevMin + 60;
    const nextLabel = nextMin >= 120 && nextMin % 60 === 0 ? `${nextMin / 60}h · ${nextMin}m` : `${nextMin}m`;
    const newRow: BleedRow = {
      timeLabel: nextLabel,
      v2: refRow?.v2 || (isMl ? '806' : '100.8'),
      vg: refRow?.vg || (isMl ? '794' : '99.3'),
    };

    const nextRows = lastIsBlank24h
      ? [...curRows.slice(0, lastIdx), newRow, curRows[lastIdx]]
      : [...curRows, newRow];
    updateActiveSpecimen({ rows: nextRows });
  };

  const failFlags: string[] = [];
  if (!bleedWithinSpec) failFlags.push(`EXCEED Spec ${limitNum.toFixed(1)}%`);
  if (!allFilledV1Valid) failFlags.push(`RE-CHECK ${sym1} out of tolerance`);
  if (!ambTempOk) failFlags.push(`RE-CHECK Ambient ${ambientTempText}°C outside 23±2°C`);

  const copySummary = [
    `[BL Grout Bleeding & Expansion — STP04 Rev 2 · Unit: ${unit} · Replicates: ${filledEvals.length}]`,
    `Initial ${sym1} = ${activeEval.v1Num} ${unit} (${activeEval.v1Valid ? 'OK' : 'RE-CHECK'}) ｜ Ambient = ${ambientTempText} °C (${ambTempOk ? 'OK 23±2°C' : 'RE-CHECK'})`,
    `Grout Expansion = ${fmtSigned02(meanGroutExpPct)} ｜ Interval Bleed = ${formatNearest02(activeEval.lastValid?.bleedPct ?? 0)}% ｜ Free Expansion = ${fmtSigned02(meanFreeExpPct)}`,
    `Final Decanted Bleeding = ${formatNearest02(meanFinalBleedPct)}% (Nearest 0.2% · Spec ≤ ${limitNum.toFixed(1)}% → ${isPass ? 'PASS' : failFlags.join(' / ')})`,
  ].join('\n');

  const blPayload: BleedingStructuredPayload = {
    kind: 'BL',
    unit,
    v1: activeEval.v1Num,
    decantedVw: activeEval.parsedDecant,
    specLimitPct: limitNum,
    finalBleedAmt: activeEval.finalBleedAmt,
    finalBleedPct: roundToNearestStep(meanFinalBleedPct, 0.2),
    finalExpPct: roundToNearestStep(meanFreeExpPct, 0.2),
    isPass,
    cementBrand,
    cementQty,
    admixtureBrand,
    admixtureQty,
    waterSource,
    waterQty,
    wcRatio,
    ambientTempText,
    waterTempText,
    testDateIso,
    batchNo,
    sampleId,
    intervals: activeEval.computedRows
      .filter((r) => r.valid)
      .map((r) => ({
        timeLabel: r.timeLabel,
        v2: r.v2Num,
        vg: r.vgNum,
        bleedAmt: r.bleedAmt,
        bleedPct: roundToNearestStep(r.bleedPct, 0.2),
        expPct: roundToNearestStep(r.expPct, 0.2),
        groutExpPct: roundToNearestStep(r.groutExpPct, 0.2),
      })),
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-7 rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {tx(
                '💧 Step 1 · 水泥漿泌水率及膨脹率測試 · ASTM C940 · STP04 Rev 2',
                '💧 Step 1 · Grout Bleeding & Expansion Test · ASTM C940 · STP04 Rev 2'
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isMl
                ? tx('1000 mL 量筒體積法 · V1 = 800 ± 10 mL · 全部百分比按 STP04 Cl. 8.2–8.5 進位至最接近 0.2%', '1000 mL Cylinder Method · V1 = 800 ± 10 mL · All % rounded to nearest 0.2% per STP04 Cl. 8.2–8.5')
                : tx('FST04 加蓋量杯高度法 · H1 = 100 ± 5 mm · 全部百分比按 STP04 Cl. 8.2–8.5 進位至最接近 0.2%', 'FST04 Covered Beaker Height Method · H1 = 100 ± 5 mm · All % rounded to nearest 0.2%')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-extrabold">
              <button
                type="button"
                onClick={() => switchUnit('mL')}
                className={`rounded-lg px-3 py-1.5 transition cursor-pointer whitespace-nowrap ${isMl ? 'bg-brand text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {tx('體積 · mL', 'Volume · mL')}
              </button>
              <button
                type="button"
                onClick={() => switchUnit('mm')}
                className={`rounded-lg px-3 py-1.5 transition cursor-pointer whitespace-nowrap ${!isMl ? 'bg-brand text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {tx('高度 · mm', 'Height · mm')}
              </button>
            </div>
            <button
              type="button"
              onClick={resetSample}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {tx('重設', 'Reset')}
            </button>
          </div>
        </div>

        {/* Department Limit Presets + 3 Replicate Specimen Switcher */}
        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-3 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-extrabold text-indigo-950">{tx('部門驗收上限預設：', 'Dept Limit Preset:')}</span>
              <button
                type="button"
                onClick={() => setSpecLimit('2.0')}
                className={`rounded-xl px-2.5 py-1 font-extrabold transition cursor-pointer ${
                  Math.abs(limitNum - 2.0) < 0.01 ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'
                }`}
              >
                {tx('樁基灌漿 ≤ 2.0%', 'Piling Grout ≤ 2.0%')}
              </button>
              <button
                type="button"
                onClick={() => setSpecLimit('0.5')}
                className={`rounded-xl px-2.5 py-1 font-extrabold transition cursor-pointer ${
                  Math.abs(limitNum - 0.5) < 0.01 ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700'
                }`}
              >
                {tx('CEDD 泥釘 Sec. 7 ≤ 0.5%', 'CEDD Soil Nail Sec. 7 ≤ 0.5%')}
              </button>
            </div>

            <button
              type="button"
              onClick={copySpec1ToAll}
              className="inline-flex items-center gap-1 rounded-xl border border-indigo-300 bg-white px-2.5 py-1 font-extrabold text-indigo-800 hover:bg-indigo-50 cursor-pointer"
            >
              <CopyCheck className="h-3.5 w-3.5" />
              {tx('同步 Specimen 1 至 2 & 3', 'Copy Specimen 1 → 2 & 3')}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([0, 1, 2] as const).map((idx) => {
              const ev = evaluatedAll[idx];
              const active = specIdx === idx;
              const populated = idx === 0 || ev.hasAnyData;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSpecIdx(idx)}
                  className={`rounded-xl border p-2 text-left transition cursor-pointer ${
                    active
                      ? 'border-brand bg-white ring-2 ring-brand/25 shadow-2xs'
                      : 'border-slate-200/90 bg-white/75 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-slate-900">Specimen {idx + 1}</span>
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${populated ? 'bg-brand/15 text-brand-deep' : 'bg-slate-100 text-slate-500'}`}>
                      {populated ? `${formatNearest02(ev.finalBleedPct)}%` : tx('未填', 'Empty')}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-500">
                    {populated
                      ? `Grout ${fmtSigned02(ev.finalGroutExpPct)} · Free ${fmtSigned02(ev.finalExpPct)}`
                      : tx('點擊輸入或複製試件 1', 'Click to enter or copy #1')}
                  </div>
                </button>
              );
            })}
          </div>

          {specIdx !== 0 && (
            <div className="flex items-center justify-between rounded-xl bg-white/90 border border-indigo-200 px-3 py-1.5">
              <span className="text-[11px] font-bold text-slate-700">
                {tx(`正在編輯 Specimen ${specIdx + 1} · 可一鍵複製 Specimen 1 讀數再微調`, `Editing Specimen ${specIdx + 1}`)}
              </span>
              <button
                type="button"
                onClick={() => copyFromSpec1(specIdx)}
                className="rounded-lg bg-brand px-2.5 py-1 text-[11px] font-extrabold text-white cursor-pointer"
              >
                {tx('複製 Specimen 1 數值', 'Copy Specimen 1 Values')}
              </button>
            </div>
          )}
        </div>

        {/* Inputs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <label className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 space-y-1.5 block">
            <span className="font-extrabold text-slate-700">
              {isMl ? tx('1. 初始體積 V1 · mL', '1. Initial V1 · mL') : tx('1. 初始高度 H1 · mm', '1. Initial H1 · mm')}
            </span>
            <input
              type="number"
              step="any"
              value={activeSpec.v1}
              onChange={(e) => updateActiveSpecimen({ v1: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-900"
            />
            <span className={`block text-[10px] font-bold ${activeEval.v1Valid ? 'text-emerald-700' : 'text-rose-600'}`}>
              {isMl
                ? activeEval.v1Valid
                  ? '✓ 800 ± 10 mL · 790–810'
                  : '⚠️ 須為 790–810 mL'
                : activeEval.v1Valid
                ? '✓ FST04 100 ± 5 mm · 95–105'
                : '⚠️ 須為 95–105 mm'}
            </span>
          </label>

          <label className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 space-y-1.5 block">
            <span className="font-extrabold text-slate-700">
              {isMl ? tx('2. 傾析泌水 Vw · mL', '2. Decanted Vw · mL') : tx('2. 最終泌水層 Hw · mm', '2. Final Bleed Hw · mm')}
            </span>
            <input
              type="number"
              step="any"
              value={activeSpec.decantedVw}
              onChange={(e) => updateActiveSpecimen({ decantedVw: e.target.value })}
              placeholder={tx('選填', 'Optional')}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-900"
            />
            <span className="block text-[10px] text-slate-500">
              {tx(`留空則採用末段 ${sym2} − ${symG}`, `Blank uses last ${sym2} − ${symG}`)}
            </span>
          </label>

          <label className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 space-y-1.5 block">
            <span className="font-extrabold text-slate-700">{tx('3. 環境室溫 · °C', '3. Ambient Temp · °C')}</span>
            <input
              type="text"
              value={ambientTempText}
              onChange={(e) => setAmbientTempText(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-900"
            />
            <span className={`block text-[10px] font-bold ${ambTempOk ? 'text-emerald-700' : 'text-rose-600'}`}>
              {ambTempOk ? '✓ Cl. 5.2 · 23 ± 2°C · 21–25°C' : '⚠️ 超出 21–25°C 規定'}
            </span>
          </label>

          <label className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 space-y-1.5 block">
            <span className="font-extrabold text-slate-700">{tx('4. 驗收上限 · %', '4. Spec Max · %')}</span>
            <input
              type="number"
              step="0.1"
              value={specLimit}
              onChange={(e) => setSpecLimit(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-900"
            />
            <span className="block text-[10px] text-slate-500">
              {tx(`共 ${filledEvals.length} 組試件平均比對`, `Checked against ${filledEvals.length}-specimen mean`)}
            </span>
          </label>
        </div>

        {/* All 4 STP04 Equations KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`rounded-2xl border p-3.5 ${isPass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold text-slate-600">{tx('最終泌水率 Cl. 6.4', 'Final Bleeding Cl. 6.4')}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white ${isPass ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                {isPass ? 'PASS' : 'REVIEW'}
              </span>
            </div>
            <div className="mt-1 font-mono text-2xl font-black text-slate-900">{formatNearest02(meanFinalBleedPct)}%</div>
            <div className="text-[10px] font-mono text-slate-600 mt-0.5">
              {symW}/{sym1} · ≤ {limitNum.toFixed(1)}% · {fmtAmt(activeEval.finalBleedAmt)} {unit}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50/55 p-3.5">
            <span className="text-[11px] font-extrabold text-slate-600">{tx('漿體膨脹率 Cl. 6.1', 'Grout Exp. Cl. 6.1')}</span>
            <div className="mt-1 font-mono text-2xl font-black text-violet-950">{fmtSigned02(meanGroutExpPct)}</div>
            <div className="text-[10px] font-mono text-slate-600 mt-0.5">
              ({symG} − {sym1}) / {sym1} × 100%
            </div>
          </div>

          <div className="rounded-2xl border border-brand/25 bg-brand-wash/45 p-3.5">
            <span className="text-[11px] font-extrabold text-slate-600">{tx('時段泌水率 Cl. 6.2', 'Interval Bleed Cl. 6.2')}</span>
            <div className="mt-1 font-mono text-2xl font-black text-brand-deep">
              {formatNearest02(activeEval.lastValid?.bleedPct ?? 0)}%
            </div>
            <div className="text-[10px] font-mono text-slate-600 mt-0.5">
              ({sym2} − {symG}) / {sym1} × 100%
            </div>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-3.5">
            <span className="text-[11px] font-extrabold text-slate-600">{tx('自由總膨脹 Cl. 6.3', 'Free / Comb. Exp Cl. 6.3')}</span>
            <div className="mt-1 font-mono text-2xl font-black text-sky-950">{fmtSigned02(meanFreeExpPct)}</div>
            <div className="text-[10px] font-mono text-slate-600 mt-0.5">
              ({sym2} − {sym1}) / {sym1} × 100%
            </div>
          </div>
        </div>

        {/* Interval Table */}
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold whitespace-nowrap">
                <tr>
                  <th className="px-3 py-2.5">{tx('讀數時段', 'Interval')}</th>
                  <th className="px-2.5 py-2.5">{isMl ? 'V2 · mL' : 'H2 · mm'}</th>
                  <th className="px-2.5 py-2.5">{isMl ? 'Vg · mL' : 'Hg · mm'}</th>
                  <th className="px-2.5 py-2.5">{tx(`泌水量 · ${unit}`, `Bleed · ${unit}`)}</th>
                  <th className="px-2.5 py-2.5">{tx('漿體膨脹 %', 'Grout Exp %')}</th>
                  <th className="px-2.5 py-2.5">{tx('時段泌水 %', 'Bleed %')}</th>
                  <th className="px-2.5 py-2.5">{tx('自由膨脹 %', 'Free Exp %')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeEval.computedRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2">
                      <input
                        value={r.timeLabel}
                        onChange={(e) => updateRow(i, 'timeLabel', e.target.value)}
                        className="w-26 rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-800"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <input
                        type="number"
                        step="any"
                        placeholder={tx('選填', 'Opt')}
                        value={r.v2}
                        onChange={(e) => updateRow(i, 'v2', e.target.value)}
                        className="w-22 rounded-lg border border-slate-200 px-2 py-1 font-mono font-bold text-slate-900"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <input
                        type="number"
                        step="any"
                        placeholder={tx('選填', 'Opt')}
                        value={r.vg}
                        onChange={(e) => updateRow(i, 'vg', e.target.value)}
                        className="w-22 rounded-lg border border-slate-200 px-2 py-1 font-mono font-bold text-slate-900"
                      />
                    </td>
                    <td className="px-2.5 py-2 font-mono font-bold text-slate-700 whitespace-nowrap">
                      {r.valid ? `${fmtAmt(r.bleedAmt)} ${unit}` : '—'}
                    </td>
                    <td className="px-2.5 py-2 font-mono font-bold text-violet-800 whitespace-nowrap">
                      {r.valid ? fmtSigned02(r.groutExpPct) : '—'}
                    </td>
                    <td className="px-2.5 py-2 font-mono font-extrabold text-brand-deep whitespace-nowrap">
                      {r.valid ? `${formatNearest02(r.bleedPct)}%` : '—'}
                    </td>
                    <td className="px-2.5 py-2 font-mono font-semibold text-sky-700 whitespace-nowrap">
                      {r.valid ? fmtSigned02(r.expPct) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> {tx('新增時段 · 60m內+15m / 60m後+60m', 'Add Interval · +15m / +60m')}
            </button>
            <span className="text-[11px] text-slate-500">
              {tx('所有百分比自動進位至最接近 0.2% · 24h 欄位可於翌晨覆核時補填', 'All percentages rounded to nearest 0.2% · 24h row optional until 24h check')}
            </span>
          </div>
        </div>

        {/* Editable Sample Information (FST04-GTT-C940) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5 text-xs">
          <div className="font-extrabold text-slate-900">
            {tx('🧪 FST04 工作紙樣本資料 · 匯出前可修改', '🧪 FST04 Sample Information · Editable before Export')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><label className="font-bold text-slate-600">Brand of Cement</label><input value={cementBrand} onChange={(e) => setCementBrand(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold" /></div>
            <div><label className="font-bold text-slate-600">Cement Quantity</label><input value={cementQty} onChange={(e) => setCementQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
            <div><label className="font-bold text-slate-600">Brand of Admixture</label><input value={admixtureBrand} onChange={(e) => setAdmixtureBrand(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold" /></div>
            <div><label className="font-bold text-slate-600">Admixture Quantity</label><input value={admixtureQty} onChange={(e) => setAdmixtureQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
            <div><label className="font-bold text-slate-600">Water</label><input value={waterSource} onChange={(e) => setWaterSource(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold" /></div>
            <div><label className="font-bold text-slate-600">Water Quantity</label><input value={waterQty} onChange={(e) => setWaterQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div><label className="font-bold text-slate-600">W/C Ratio</label><input value={wcRatio} onChange={(e) => setWcRatio(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono font-bold" /></div>
            <div><label className="font-bold text-slate-600">Water Temp · °C</label><input value={waterTempText} onChange={(e) => setWaterTempText(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono" /></div>
            <div><label className="font-bold text-slate-600">Date of Testing</label><input type="date" value={testDateIso} onChange={(e) => setTestDateIso(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono" /></div>
            <div className="col-span-2 sm:col-span-1"><label className="font-bold text-amber-900">Batch No. · 手動輸入</label><input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="e.g. B-01" className="mt-0.5 w-full rounded-lg border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 font-mono font-bold" /></div>
            <div className="col-span-2"><label className="font-bold text-amber-900">Sample ID No. · 手動輸入</label><input value={sampleId} onChange={(e) => setSampleId(e.target.value)} placeholder="e.g. BL-01" className="mt-0.5 w-full rounded-lg border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 font-mono font-bold" /></div>
          </div>
        </div>
      </div>

      <div className="xl:col-span-5 xl:sticky xl:top-20">
        <ToolGuideCard
          stpCode="BL"
          standardRef={isMl ? 'ASTM C940-22 · STP04-GTT-C940 rev 2 · Volume mL' : 'ASTM C940-22 · STP04-GTT-C940 rev 2 · Height mm'}
          formulaText={`Grout Exp = (${symG}−${sym1})/${sym1}×100% ｜ Interval Bleed = (${sym2}−${symG})/${sym1}×100% ｜ Free Exp = (${sym2}−${sym1})/${sym1}×100% ｜ Final Bleed = ${symW}/${sym1}×100% · Nearest 0.2%`}
          structuredData={blPayload}
          steps={[
            {
              title: tx('3 分鐘內注入 3 組平行試件並加蓋', 'Pour 3 Replicate Specimens Within 3 Min'),
              detail: isMl
                ? tx('拌漿後 3 分鐘內將新鮮水泥漿注入 3 個 1000 mL 量筒至 V1 = 800 ± 10 mL，維持室溫 23 ± 2°C 並立即密封防蒸發。', 'Within 3 min of mixing, pour grout into 3 replicate 1000 mL cylinders to V1 = 800 ± 10 mL at 23 ± 2°C and cover immediately.')
                : tx('拌漿後 3 分鐘內注入 3 個直徑 100 ± 10 mm 透明量杯至初始高度 H1 = 100 ± 5 mm，維持室溫 23 ± 2°C 並立即加蓋密封。', 'Within 3 min of mixing, pour grout into 3 replicate covered beakers to initial height H1 = 100 ± 5 mm at 23 ± 2°C.'),
            },
            {
              title: tx('按標準時段讀取總液面及漿體面', 'Record Prescribed Interval Readings'),
              detail: tx(`首小時於 15m、30m、45m、60m 各讀一次，其後於 2h、3h 及 24h 讀取總上表面 ${sym2} 與漿體上表面 ${symG}。`, `Read upper water surface ${sym2} and grout surface ${symG} at 15m, 30m, 45m, 60m, then 2h, 3h, and 24h.`),
            },
            {
              title: tx('傾析最終泌水及按 0.2% 修約報告', 'Decant Final Bleed Water & Round to 0.2%'),
              detail: tx('測試結束將上層泌水傾析至 25 mL 量筒讀取 Vw 或以校準鋼尺讀取 Hw；四項百分比均按 STP04 Cl. 8.2–8.5 進位至最接近 0.2%。', 'Decant clear bleed water into a 25 mL graduate or measure Hw; report all four percentages to the nearest 0.2% per STP04 Cl. 8.2–8.5.'),
            },
          ]}
          pitfalls={[
            tx('CEDD GS Sec. 7 泥釘及岩栓灌漿之 3 小時泌水率上限為 ≤ 0.5% 且 24 小時須全數吸收至 0%，切勿誤用一般樁基 ≤ 2.0% 標準。', 'CEDD GS Sec. 7 soil-nail grout requires 3h bleeding ≤ 0.5% and 0% free water at 24h — do not confuse with ≤ 2.0% piling grout.'),
            tx('試件檯面必須以水平尺 LT-LV-01 核實水平且無任何施工震動，室溫須維持於 23 ± 2°C。', 'Keep cylinders on a level, vibration-free surface checked with spirit level LT-LV-01 and maintain 23 ± 2°C ambient temperature.'),
          ]}
          copyText={copySummary}
          onViewAllSpecs={onViewAllSpecs}
        />
      </div>
    </div>
  );
};
