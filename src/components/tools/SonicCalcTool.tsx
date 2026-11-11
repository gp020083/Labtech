import React, { useState, useMemo } from 'react';
import { usePrefs } from '../../prefs';
import { SonicProfileRow, SonicStructuredPayload } from '../../utils/completedWorksheetGenerator';
import { ToolGuideCard } from './ToolGuideCard';
import { Plus, RotateCcw, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SonicRowInput {
  pair: string;
  distMm: string;
  baseFatUs: string;
  measFatUs: string;
  energyDropDb: string;
}

export function buildTubePairRows(tubeCount: number, cageDiaMm = 1800): SonicRowInput[] {
  const n = Math.min(6, Math.max(2, Math.round(tubeCount)));
  const rows: SonicRowInput[] = [];
  for (let i = 1; i <= n; i++) {
    for (let j = i + 1; j <= n; j++) {
      const step = Math.min(j - i, n - (j - i));
      const chordMm = Math.max(300, Math.round((cageDiaMm * Math.sin((Math.PI * step) / n)) / 10) * 10);
      const baseFat = Math.round((chordMm * 1000) / 3960);
      const measFat = baseFat + 6;
      rows.push({
        pair: `${i}-${j}`,
        distMm: String(chordMm),
        baseFatUs: String(baseFat),
        measFatUs: String(measFat),
        energyDropDb: '1.6',
      });
    }
  }
  return rows;
}

export const SonicCalcTool: React.FC<{ onViewAllSpecs?: () => void }> = ({ onViewAllSpecs }) => {
  const { tx } = usePrefs();
  const [tubeCount, setTubeCount] = useState<number>(4);
  const [cageDiaMm, setCageDiaMm] = useState<string>('1800');
  const [concreteAgeDays, setConcreteAgeDays] = useState<string>('10');
  const [waterTempC, setWaterTempC] = useState<string>('24.5');
  const [shortestTubeLenM, setShortestTubeLenM] = useState<string>('38.50');
  const [scannedLenM, setScannedLenM] = useState<string>('38.15');
  const [actualPullingSec, setActualPullingSec] = useState<string>('86');
  const [rows, setRows] = useState<SonicRowInput[]>(() => buildTubePairRows(4, 1800));

  const applyTubePreset = (nextCount: number) => {
    const cage = Math.max(300, parseFloat(cageDiaMm) || 1800);
    setTubeCount(nextCount);
    setRows(buildTubePairRows(nextCount, cage));
  };

  const resetAll = () => {
    setTubeCount(4);
    setCageDiaMm('1800');
    setConcreteAgeDays('10');
    setWaterTempC('24.5');
    setShortestTubeLenM('38.50');
    setScannedLenM('38.15');
    setActualPullingSec('86');
    setRows(buildTubePairRows(4, 1800));
  };

  const ageNum = parseFloat(concreteAgeDays) || 0;
  const ageOk = ageNum >= 7;

  const tempNum = parseFloat(waterTempC);
  const tempOk = Number.isFinite(tempNum) && tempNum >= 0 && tempNum <= 30;

  const shortLenNum = Math.max(0, parseFloat(shortestTubeLenM) || 0);
  const plumbedLenNum = Math.max(0, Number((shortLenNum - 0.3).toFixed(3)));
  const scannedLenNum = Math.max(0, parseFloat(scannedLenM) || 0);
  const lenDiffM = Math.abs(scannedLenNum - plumbedLenNum);
  const lenTolM = Math.max(0.25, 0.01 * plumbedLenNum);
  const lengthCheckOk = shortLenNum > 0.3 && lenDiffM <= lenTolM + 1e-9;

  const minPullingSec = Math.max(1, Math.ceil(shortLenNum / 0.5));
  const actualPullNum = Math.max(0, parseFloat(actualPullingSec) || 0);
  const pullingOk = actualPullNum >= minPullingSec;
  const pullSpeedMs = actualPullNum > 0 ? shortLenNum / actualPullNum : 0;

  const computedProfiles = useMemo(() => {
    return rows.map((r) => {
      const distMm = Math.max(1, parseFloat(r.distMm) || 0);
      const baseFatUs = Math.max(1, parseFloat(r.baseFatUs) || 0);
      const measFatUs = Math.max(1, parseFloat(r.measFatUs) || 0);
      const energyDropDb = Math.max(0, parseFloat(r.energyDropDb) || 0);
      const waveSpeedMs = measFatUs > 0 ? (distMm * 1000) / measFatUs : 0;
      const fatDelayPct = baseFatUs > 0 ? ((measFatUs - baseFatUs) / baseFatUs) * 100 : 0;
      const anomaly = fatDelayPct > 20 || energyDropDb > 6 || waveSpeedMs < 3000;
      const rating: 'good' | 'caution' | 'poor' =
        waveSpeedMs >= 3500 ? 'good' : waveSpeedMs >= 3000 ? 'caution' : 'poor';
      return {
        ...r,
        distNum: distMm,
        baseFatNum: baseFatUs,
        measFatNum: measFatUs,
        energyDropNum: energyDropDb,
        waveSpeedMs,
        fatDelayPct,
        anomaly,
        rating,
      };
    });
  }, [rows]);

  const anomalyCount = computedProfiles.filter((p) => p.anomaly).length;
  const minWaveSpeed = computedProfiles.length
    ? Math.min(...computedProfiles.map((p) => p.waveSpeedMs))
    : 0;
  const maxFatDelay = computedProfiles.length
    ? Math.max(...computedProfiles.map((p) => p.fatDelayPct))
    : 0;
  const allGatesOk = ageOk && tempOk && lengthCheckOk && pullingOk;
  const isPass = allGatesOk && computedProfiles.length > 0 && anomalyCount === 0;

  const updateRow = (idx: number, field: keyof SonicRowInput, val: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        pair: `P${prev.length + 1}`,
        distMm: '1270',
        baseFatUs: '320',
        measFatUs: '326',
        energyDropDb: '1.5',
      },
    ]);
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const sonicPayload: SonicStructuredPayload = {
    kind: 'SO',
    tubeCount,
    concreteAgeDays: ageNum,
    waterTempC: Number.isFinite(tempNum) ? tempNum : 24.5,
    shortestTubeLenM: shortLenNum,
    plumbedLenM: plumbedLenNum,
    scannedLenM: scannedLenNum,
    minPullingSec,
    actualPullingSec: actualPullNum,
    lengthCheckOk,
    tempOk,
    pullingOk,
    ageOk,
    isPass,
    profiles: computedProfiles.map(
      (p): SonicProfileRow => ({
        pair: p.pair.trim() || '1-2',
        distMm: p.distNum,
        baseFatUs: p.baseFatNum,
        measFatUs: p.measFatNum,
        energyDropDb: p.energyDropNum,
        waveSpeedMs: Number(p.waveSpeedMs.toFixed(0)),
        fatDelayPct: Number(p.fatDelayPct.toFixed(1)),
        anomaly: p.anomaly,
      })
    ),
  };

  const gateFailNotes: string[] = [];
  if (!ageOk) gateFailNotes.push(`Age ${ageNum}d < 7d`);
  if (!tempOk) gateFailNotes.push(`WaterTemp ${waterTempC}°C outside 0–30°C`);
  if (!lengthCheckOk) gateFailNotes.push(`|A-B|=${lenDiffM.toFixed(2)}m > ${lenTolM.toFixed(2)}m`);
  if (!pullingOk) gateFailNotes.push(`Pull ${actualPullNum}s < Min ${minPullingSec}s`);
  if (anomalyCount > 0) gateFailNotes.push(`${anomalyCount} profile anomaly`);

  const copySummary = [
    `[SO Crosshole Sonic Logging — ASTM D6760 · STP03 Rev 3]`,
    `Tubes = ${tubeCount} · Profiles = ${computedProfiles.length} ｜ Concrete Age = ${ageNum} d ｜ Tube Water Temp = ${waterTempC} °C`,
    `Shortest Tube = ${shortLenNum.toFixed(2)} m → Plumbed B = ${plumbedLenNum.toFixed(2)} m vs Scanned A = ${scannedLenNum.toFixed(2)} m · |A-B| = ${lenDiffM.toFixed(2)} m ≤ ${lenTolM.toFixed(2)} m: ${lengthCheckOk ? 'OK' : 'FAIL'}`,
    `Stopwatch Pulling = ${actualPullNum} s vs Min ${minPullingSec} s · Speed ${pullSpeedMs.toFixed(2)} m/s: ${pullingOk ? 'OK' : 'FAIL'}`,
    `Min Wave Speed = ${minWaveSpeed.toFixed(0)} m/s ｜ Max FAT Delay = ${maxFatDelay >= 0 ? '+' : ''}${maxFatDelay.toFixed(1)}% → ${isPass ? 'PASS' : `ANOMALY / RE-CHECK — ${gateFailNotes.join('; ')}`}`,
  ].join('\n');

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-7 rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {tx(
                '🔊 Step 1 · 跨孔超聲波透射法計算器 · ASTM D6760 · STP03 Rev 3',
                '🔊 Step 1 · Crosshole Sonic Logging Calculator · ASTM D6760 · STP03 Rev 3'
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {tx(
                '自動產生 N(N-1)/2 測管剖面組合，核查混凝土齡期、管內水溫 0–30°C、測繩與編碼器深度差及秒錶最低提拉時間。',
                'Generates N(N-1)/2 access-tube profiles and verifies concrete age, 0–30°C tube water temp, plumbed vs scanned length, and stopwatch pulling speed.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {tx('重設範例', 'Reset')}
          </button>
        </div>

        {/* Access Tube Count Preset Bar */}
        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/45 p-3.5 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-indigo-950">
              {tx('1. 聲測管數量及自動剖面配對 N(N-1)/2', '1. Access Tube Count & Auto Pair Generator N(N-1)/2')}
            </span>
            <label className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700">
              <span>{tx('管心圓直徑 mm', 'Tube Circle Ø mm')}</span>
              <input
                type="number"
                min="300"
                step="50"
                value={cageDiaMm}
                onChange={(e) => setCageDiaMm(e.target.value)}
                className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-extrabold text-slate-900"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[2, 3, 4, 5, 6].map((n) => {
              const pairCnt = (n * (n - 1)) / 2;
              const active = tubeCount === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => applyTubePreset(n)}
                  className={`rounded-xl px-3 py-1.5 font-extrabold transition cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tx(`${n} 管 · ${pairCnt} 剖面`, `${n} Tubes · ${pairCnt} Pairs`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* STP03 Rev 3 Mandatory Pre-Checks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          <label className="rounded-2xl border border-slate-200/90 bg-slate-50/75 p-3 space-y-1 block">
            <span className="font-extrabold text-slate-700">{tx('混凝土齡期 · 日', 'Concrete Age · d')}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={concreteAgeDays}
              onChange={(e) => setConcreteAgeDays(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold text-slate-900"
            />
            <span className={`block text-[10px] font-bold ${ageOk ? 'text-emerald-700' : 'text-rose-600'}`}>
              {ageOk ? '✓ Cl. 6.1 ≥ 7 d' : tx('⚠️ 未滿 7 日須客戶書面同意', '⚠️ < 7 d requires client agreement')}
            </span>
          </label>

          <label className="rounded-2xl border border-slate-200/90 bg-slate-50/75 p-3 space-y-1 block">
            <span className="font-extrabold text-slate-700">{tx('管內水溫 · °C', 'Tube Water · °C')}</span>
            <input
              type="number"
              step="0.1"
              value={waterTempC}
              onChange={(e) => setWaterTempC(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold text-slate-900"
            />
            <span className={`block text-[10px] font-bold ${tempOk ? 'text-emerald-700' : 'text-rose-600'}`}>
              {tempOk ? '✓ Rev 3 Cl. 6.10 · 0–30°C' : tx('⚠️ 超出 0–30°C 範圍', '⚠️ Outside 0–30°C')}
            </span>
          </label>

          <label className="rounded-2xl border border-slate-200/90 bg-slate-50/75 p-3 space-y-1 block">
            <span className="font-extrabold text-slate-700">{tx('最短測管長 · m', 'Shortest Tube · m')}</span>
            <input
              type="number"
              step="0.01"
              value={shortestTubeLenM}
              onChange={(e) => setShortestTubeLenM(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold text-slate-900"
            />
            <span className="block font-mono text-[10px] font-bold text-slate-600">
              {tx(`測繩長 B = ${plumbedLenNum.toFixed(2)} m`, `Plumbed B = ${plumbedLenNum.toFixed(2)} m`)}
            </span>
          </label>

          <label className="rounded-2xl border border-slate-200/90 bg-slate-50/75 p-3 space-y-1 block">
            <span className="font-extrabold text-slate-700">{tx('編碼器掃描長 A · m', 'Scanned Len A · m')}</span>
            <input
              type="number"
              step="0.01"
              value={scannedLenM}
              onChange={(e) => setScannedLenM(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold text-slate-900"
            />
            <span className={`block font-mono text-[10px] font-bold ${lengthCheckOk ? 'text-emerald-700' : 'text-rose-600'}`}>
              {lengthCheckOk
                ? `✓ |A-B| ${lenDiffM.toFixed(2)} ≤ ${lenTolM.toFixed(2)}m`
                : `⚠️ |A-B| ${lenDiffM.toFixed(2)} > ${lenTolM.toFixed(2)}m`}
            </span>
          </label>

          <label className="rounded-2xl border border-slate-200/90 bg-slate-50/75 p-3 space-y-1 block">
            <span className="font-extrabold text-slate-700">{tx('實測提拉秒數 · s', 'Actual Pull · s')}</span>
            <input
              type="number"
              step="1"
              value={actualPullingSec}
              onChange={(e) => setActualPullingSec(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold text-slate-900"
            />
            <span className={`block font-mono text-[10px] font-bold ${pullingOk ? 'text-emerald-700' : 'text-rose-600'}`}>
              {pullingOk
                ? `✓ ≥ ${minPullingSec}s · ${pullSpeedMs.toFixed(2)} m/s`
                : `⚠️ 須 ≥ ${minPullingSec}s · LT-TD-01`}
            </span>
          </label>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={`rounded-2xl border p-4 ${isPass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-slate-600">{tx('STP03 Rev 3 總判定', 'Overall Verdict')}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-white ${isPass ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                {isPass ? 'PASS' : 'ANOMALY'}
              </span>
            </div>
            <div className={`mt-1.5 font-mono text-xl font-black ${isPass ? 'text-emerald-800' : 'text-rose-800'}`}>
              {isPass ? tx('全數剖面及程序合規', 'All Profiles & Checks OK') : tx('發現異常或程序超差', 'Anomaly / Check Failed')}
            </div>
            <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
              {gateFailNotes.length === 0
                ? tx(`共 ${computedProfiles.length} 組剖面 · 0 異常`, `${computedProfiles.length} profiles · 0 anomalies`)
                : gateFailNotes.join(' · ')}
            </div>
          </div>

          <div className="rounded-2xl border border-brand/25 bg-brand-wash/40 p-4">
            <span className="text-xs font-extrabold text-slate-600">{tx('最低混凝土波速 V', 'Min Wave Speed V')}</span>
            <div className="mt-1.5 font-mono text-2xl font-black text-brand-deep">
              {minWaveSpeed > 0 ? `${minWaveSpeed.toFixed(0)} m/s` : '—'}
            </div>
            <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
              {minWaveSpeed >= 3500
                ? tx('✓ Cl. 7.3 優良混凝土 ≥ 3500 m/s', '✓ Good Concrete ≥ 3500 m/s')
                : minWaveSpeed >= 3000
                ? tx('⚠️ Cl. 7.3 存疑區間 3000–3499 m/s', '⚠️ Caution 3000–3499 m/s')
                : tx('🚨 Cl. 7.3 欠佳 < 3000 m/s', '🚨 Poor < 3000 m/s')}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-xs font-extrabold text-slate-600">{tx('最大 FAT 相對延遲', 'Max Relative FAT Delay')}</span>
            <div className="mt-1.5 font-mono text-2xl font-black text-slate-900">
              {maxFatDelay >= 0 ? '+' : ''}
              {maxFatDelay.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {tx(`最低提拉時間 ${minPullingSec} s · 測繩 B = ${plumbedLenNum.toFixed(2)} m`, `Min Pull ${minPullingSec} s · Plumbed B = ${plumbedLenNum.toFixed(2)} m`)}
            </div>
          </div>
        </div>

        {/* Profile Table */}
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold whitespace-nowrap">
                <tr>
                  <th className="px-3 py-2.5">{tx('剖面 Pair', 'Pair')}</th>
                  <th className="px-2.5 py-2.5">{tx('管距 D · mm', 'Dist D · mm')}</th>
                  <th className="px-2.5 py-2.5">{tx('基準 FAT₀ · μs', 'Base FAT₀ · μs')}</th>
                  <th className="px-2.5 py-2.5">{tx('實測 FAT · μs', 'Meas FAT · μs')}</th>
                  <th className="px-2.5 py-2.5">{tx('衰減 · dB', 'Drop · dB')}</th>
                  <th className="px-2.5 py-2.5">{tx('波速 V · m/s', 'Speed V · m/s')}</th>
                  <th className="px-2.5 py-2.5">{tx('FAT 延遲', 'FAT Delay')}</th>
                  <th className="px-2.5 py-2.5">{tx('判定', 'Status')}</th>
                  <th className="px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {computedProfiles.map((p, i) => (
                  <tr key={i} className={p.anomaly ? 'bg-rose-50/55' : 'hover:bg-slate-50/70'}>
                    <td className="px-3 py-2">
                      <input
                        value={p.pair}
                        onChange={(e) => updateRow(i, 'pair', e.target.value)}
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 font-extrabold text-slate-900"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <input
                        type="number"
                        step="5"
                        value={p.distMm}
                        onChange={(e) => updateRow(i, 'distMm', e.target.value)}
                        className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold text-slate-900"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <input
                        type="number"
                        step="1"
                        value={p.baseFatUs}
                        onChange={(e) => updateRow(i, 'baseFatUs', e.target.value)}
                        className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold text-slate-900"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <input
                        type="number"
                        step="1"
                        value={p.measFatUs}
                        onChange={(e) => updateRow(i, 'measFatUs', e.target.value)}
                        className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold text-slate-900"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <input
                        type="number"
                        step="0.1"
                        value={p.energyDropDb}
                        onChange={(e) => updateRow(i, 'energyDropDb', e.target.value)}
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold text-slate-900"
                      />
                    </td>
                    <td className="px-2.5 py-2 whitespace-nowrap">
                      <span
                        className={`font-extrabold ${
                          p.rating === 'good'
                            ? 'text-emerald-700'
                            : p.rating === 'caution'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {p.waveSpeedMs.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 whitespace-nowrap font-bold text-slate-800">
                      {p.fatDelayPct >= 0 ? '+' : ''}
                      {p.fatDelayPct.toFixed(1)}%
                    </td>
                    <td className="px-2.5 py-2 whitespace-nowrap font-sans">
                      {p.anomaly ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800">
                          <AlertTriangle className="h-3 w-3" /> {tx('異常', 'Anomaly')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> OK
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title={tx('刪除此剖面', 'Remove profile')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
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
              <Plus className="h-3.5 w-3.5" /> {tx('新增測試剖面', 'Add Profile Row')}
            </button>
            <span className="text-[11px] font-semibold text-slate-500">
              {tx(
                '異常判準：FAT 延遲 > 20% 或 能量衰減 > 6 dB 或 波速 V < 3000 m/s',
                'Anomaly criteria: FAT delay > 20%, energy drop > 6 dB, or V < 3000 m/s'
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="xl:col-span-5 xl:sticky xl:top-20">
        <ToolGuideCard
          stpCode="SO"
          standardRef="ASTM D6760-16 · STP03-FDT-D6760 rev 3 · FST03"
          formulaText="V = (D_mm × 1000) / FAT_μs ｜ FAT Delay % = (FAT − FAT₀)/FAT₀ × 100% ｜ B = L_short − 0.3 m ｜ |A − B| ≤ max(0.25 m, 1% B) ｜ t_min = ⌈L / 0.5⌉ s"
          copyText={copySummary}
          structuredData={sonicPayload}
          onViewAllSpecs={onViewAllSpecs}
          steps={[
            {
              title: tx('核查齡期、注滿清水及量測管內水溫', 'Verify Age, Fill Tubes & Check Water Temp'),
              detail: tx(
                '確認混凝土齡期 ≥ 7 日，各聲測管注滿潔淨清水，按 STP03 Rev 3 Cl. 6.10 逐管量度水溫須介乎 0°C 至 30°C，並量度管心距及最短管長。',
                'Verify concrete age ≥ 7 days, fill access tubes with clean water, check tube water temperature within 0–30°C per Rev 3 Cl. 6.10, and measure tube spacings and shortest length.'
              ),
            },
            {
              title: tx('單對收發探頭同步下放至管底', 'Lower Single Transmitter-Receiver Pair'),
              detail: tx(
                '按 Rev 3 Cl. 6.19 每次僅使用單對探頭 — 1 發射器配 1 接收器下放至距管底 125 mm 內，深度取樣間距 ≤ 50 mm，核對測繩深度 B 與編碼器掃描長 A 差值 ≤ max(0.25 m, 1% B)。',
                'Per Rev 3 Cl. 6.19, use a single transmitter-receiver probe pair lowered within 125 mm of tube bottom, sampling interval ≤ 50 mm, and verify |A − B| ≤ max(0.25 m, 1% B).'
              ),
            },
            {
              title: tx('秒錶監控提拉速率及複核異常深度', 'Stopwatch Pulling Check & Anomaly Re-scan'),
              detail: tx(
                '以經校準秒錶 LT-TD-01 監控整段提拉時間 ≥ L / 0.5 秒以確保提拉速率 ≤ 0.5 m/s；如發現 FAT 延遲 > 20% 或能量衰減 > 6 dB，須重測及做斜測交叉定位。',
                'Monitor pull duration with calibrated stopwatch LT-TD-01 so pulling speed ≤ 0.5 m/s; re-scan and cross-check any zone with FAT delay > 20% or energy drop > 6 dB.'
              ),
            },
          ]}
          pitfalls={[
            tx(
              '樁頂首 1 m 至 2 m 若出現波速偏低或訊號失真，常因聲測管與混凝土脫空或管內水面不足所致，須先補滿清水再複測。',
              'Signal loss near pile top is often caused by water drop inside access tubes or debonding; top up water completely before re-testing.'
            ),
            tx(
              '按 STP03 Cl. 10.4.2 規定，儀器每 3 個月或每完成 10 組工地測試系列須於已知缺陷模型樁進行內部核查，以較嚴格者為準。',
              'Per STP03 Cl. 10.4.2, verify CSL apparatus on the known-anomaly model pile every 3 months or every 10 site test series, whichever is more stringent.'
            ),
          ]}
        />
      </div>
    </div>
  );
};
