import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { FieldCalcPhoto, FieldCalcRecord } from '../types';
import { HK_GOV_SPECS, GOV_DEPTS } from '../data/hkGovSpecs';
import {
  detectCalcPassStatus,
  roundToNearestStep,
  formatNearest02,
} from '../utils/limsRules';
import {
  StructuredCalcPayload,
  SonicStructuredPayload,
  SonicProfileRow,
  BleedingStructuredPayload,
  KodenStructuredPayload,
  FlowConeStructuredPayload,
  PointLoadStructuredPayload,
  generateSequentialJobRefNo,
  collectPreviousClientOptions,
} from '../utils/completedWorksheetGenerator';
import { nowTimestamp, getHkTodayIso } from '../utils';
import { buildTubePairRows } from '../components/tools/SonicCalcTool';
import { parseIntervalMinutes } from '../components/tools/BleedingCalcTool';
import { formatSigFigs } from '../components/tools/KodenFlowPointTools';
import { SitePhotoAttachmentControl } from '../components/SitePhotoAttachmentControl';
import { FieldSignOffBox } from '../components/FieldSignOffBox';
import { HoklasReportPreview } from '../components/HoklasReportPreview';
import {
  Copy,
  FileCheck2,
  ChevronDown,
  Plus,
  RotateCcw,
  Save,
  PenTool,
  Printer,
  Award,
  AlertTriangle,
  CheckCircle2,
  Calculator,
} from 'lucide-react';

export const MobileCalcFooter: React.FC<{
  stpCode: string;
  formula: string;
  copyText: string;
  notes: string[];
  structuredData?: StructuredCalcPayload;
}> = ({ stpCode, formula, copyText, notes, structuredData }) => {
  const { jobs, calcRecords, saveCalcRecord, setStpPreviewCode, pushToast, user } = useApp();
  const { lang, tx } = usePrefs();
  const [open, setOpen] = useState(false);
  const [jobNo, setJobNo] = useState(jobs[0]?.no || 'LT0002');
  const [jobRefNo, setJobRefNo] = useState(() =>
    generateSequentialJobRefNo(jobs[0]?.no || 'LT0002', stpCode, calcRecords)
  );
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [worksOrderNo, setWorksOrderNo] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [sampleId, setSampleId] = useState('');
  const [locNote, setLocNote] = useState('');
  const [sitePhotos, setSitePhotos] = useState<FieldCalcPhoto[]>([]);
  const [signOffExpanded, setSignOffExpanded] = useState(false);
  const [signedBy, setSignedBy] = useState('');
  const [signedRole, setSignedRole] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [previewState, setPreviewState] = useState<{
    record: FieldCalcRecord;
    mode: 'worksheet' | 'formal_report';
  } | null>(null);

  const spec = HK_GOV_SPECS.find((s) => s.stpCode === stpCode);
  const passStatus = detectCalcPassStatus(copyText);
  const selectedJob = jobs.find((j) => j.no === jobNo) || null;
  const effectiveRefNo =
    jobRefNo.trim() || generateSequentialJobRefNo(jobNo, stpCode, calcRecords);
  const previousClients = useMemo(
    () => collectPreviousClientOptions(jobs, calcRecords),
    [jobs, calcRecords]
  );
  const effectiveBatchNo =
    batchNo.trim() ||
    (structuredData?.kind === 'FC' || structuredData?.kind === 'BL'
      ? structuredData.batchNo?.trim()
      : '') ||
    undefined;
  const effectiveSampleId =
    sampleId.trim() ||
    (structuredData?.kind === 'FC' || structuredData?.kind === 'BL'
      ? structuredData.sampleId?.trim()
      : '') ||
    undefined;

  const findMatchingSavedRecord = (): FieldCalcRecord | undefined => {
    if (savedRecordId) {
      const byId = calcRecords.find((r) => r.id === savedRecordId);
      if (byId && (byId.jobRefNo || '').toUpperCase() === effectiveRefNo.trim().toUpperCase()) {
        return byId;
      }
    }
    return calcRecords.find(
      (r) =>
        r.stpCode === stpCode &&
        (r.jobRefNo || '').trim().toUpperCase() === effectiveRefNo.trim().toUpperCase()
    );
  };

  const buildDraftRecord = (): FieldCalcRecord => {
    const existing = findMatchingSavedRecord();
    return {
      id: existing?.id || `${stpCode}-${Date.now().toString().slice(-4)}`,
      jobNo,
      jobRefNo: effectiveRefNo,
      worksOrderNo: worksOrderNo.trim() || existing?.worksOrderNo || undefined,
      clientName: clientName.trim() || existing?.clientName || undefined,
      batchNo: effectiveBatchNo || existing?.batchNo,
      sampleId: effectiveSampleId || existing?.sampleId,
      projectTitle: selectedJob?.project || selectedJob?.shortName || existing?.projectTitle || undefined,
      stpCode,
      title: `${stpCode} Field Calculation`,
      locationNote: locNote.trim() || existing?.locationNote || undefined,
      summary: copyText,
      pass: passStatus,
      testedAt: existing?.testedAt || nowTimestamp(),
      operatorName: existing?.operatorName || user?.name || 'Operator',
      signatureDataUrl: signatureDataUrl || existing?.signatureDataUrl || undefined,
      signedBy: signedBy.trim() || existing?.signedBy || undefined,
      signedRole: signedRole.trim() || existing?.signedRole || undefined,
      signedAt: signatureDataUrl ? existing?.signedAt || nowTimestamp() : existing?.signedAt,
      sitePhotos: sitePhotos.length > 0 ? sitePhotos : existing?.sitePhotos,
      worksOrderAttachment: existing?.worksOrderAttachment,
      worksheetAttachment: existing?.worksheetAttachment,
      structuredData,
    };
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(copyText);
    pushToast(tx('已複製計算結果', 'Calculation Copied'), tx('可直接貼上至報告或訊息', 'Ready to paste'));
  };

  const handleDispatchNewRefNo = () => {
    const nextRef = generateSequentialJobRefNo(jobNo, stpCode, calcRecords);
    setJobRefNo(nextRef);
    setSavedRecordId(null);
    pushToast(
      tx('已編配新工作編號', 'Assigned Next Job Ref. No.'),
      `${nextRef} · ${tx('按儲存紀錄寫入總表', 'Tap Save Record to commit')}`
    );
  };

  const handleSave = () => {
    const saved = saveCalcRecord({
      jobNo,
      jobRefNo: effectiveRefNo,
      worksOrderNo: worksOrderNo.trim() || undefined,
      clientName: clientName.trim() || undefined,
      batchNo: effectiveBatchNo,
      sampleId: effectiveSampleId,
      projectTitle: selectedJob?.project || selectedJob?.shortName || undefined,
      stpCode,
      title: `${stpCode} Field Calculation`,
      locationNote: locNote.trim() || undefined,
      summary: copyText,
      pass: passStatus,
      signatureDataUrl: signatureDataUrl || undefined,
      signedBy: signedBy.trim() || undefined,
      signedRole: signedRole.trim() || undefined,
      signedAt: signatureDataUrl ? nowTimestamp() : undefined,
      sitePhotos: sitePhotos.length > 0 ? sitePhotos : undefined,
      structuredData,
    });
    setSavedRecordId(saved.id);
    if (saved.jobRefNo) {
      setJobRefNo(saved.jobRefNo);
    }
  };

  return (
    <div className="space-y-2.5 pb-2 text-xs">
      <div className="rounded-2xl border border-brand/30 bg-white p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold text-slate-900">
            💾 {tx('儲存紀錄及預覽工作紙 / 報告', 'Save Record & Preview PDF')}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSignOffExpanded(!signOffExpanded)}
              className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-extrabold cursor-pointer ${
                signOffExpanded || signatureDataUrl
                  ? 'border-brand bg-brand-wash text-brand-deep'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <PenTool className="h-3 w-3" />
              {tx('監工簽署', 'Sign-off')}
            </button>
            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${passStatus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {passStatus ? 'PASS' : 'REVIEW'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={jobNo}
            onChange={(e) => {
              const nextJob = e.target.value;
              setJobNo(nextJob);
              setJobRefNo(generateSequentialJobRefNo(nextJob, stpCode, calcRecords));
              setSavedRecordId(null);
            }}
            className="min-h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 font-bold text-slate-900"
          >
            {jobs.map((j) => (
              <option key={j.no} value={j.no}>{j.no} · {j.shortName}</option>
            ))}
          </select>
          <input
            value={locNote}
            onChange={(e) => setLocNote(e.target.value)}
            placeholder={tx('樁號 / 樣本號 · 選填', 'Pile / Sample Ref')}
            className="min-h-[42px] rounded-xl border border-slate-200 px-2.5 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex gap-1">
            <input
              value={jobRefNo}
              onChange={(e) => {
                setJobRefNo(e.target.value);
                setSavedRecordId(null);
              }}
              placeholder="Job Ref. No."
              className="min-h-[40px] min-w-0 flex-1 rounded-xl border border-brand/40 bg-brand-wash/30 px-2 py-1.5 font-mono text-[11px] font-extrabold text-brand-deep"
            />
            <button
              type="button"
              onClick={handleDispatchNewRefNo}
              className="min-h-[40px] shrink-0 rounded-xl bg-brand px-2.5 py-1.5 text-[10px] font-extrabold text-white cursor-pointer"
            >
              🎯 {tx('編配', 'New')}
            </button>
          </div>
          <input
            value={worksOrderNo}
            onChange={(e) => setWorksOrderNo(e.target.value)}
            placeholder={tx('Works Order No.', 'Works Order No.')}
            className="min-h-[40px] rounded-xl border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 font-mono text-[11px] font-bold text-slate-900"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            list={`mob-prev-clients-${stpCode}`}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder={tx('Client 客戶名稱', 'Client Name')}
            className="min-h-[40px] rounded-xl border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 text-[11px] font-bold text-slate-900"
          />
          <datalist id={`mob-prev-clients-${stpCode}`}>
            {previousClients.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setClientName(e.target.value);
            }}
            className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-800"
          >
            <option value="">{tx('📂 歷史客戶...', '📂 Previous Clients...')}</option>
            {previousClients.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            placeholder="Batch No."
            className="min-h-[40px] rounded-xl border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 font-mono text-[11px] font-bold text-slate-900"
          />
          <input
            value={sampleId}
            onChange={(e) => setSampleId(e.target.value)}
            placeholder="Sample ID No."
            className="min-h-[40px] rounded-xl border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 font-mono text-[11px] font-bold text-slate-900"
          />
        </div>

        <SitePhotoAttachmentControl
          stpCode={stpCode}
          jobNo={jobNo}
          sitePhotos={sitePhotos}
          onChangePhotos={setSitePhotos}
          compact
        />

        {signOffExpanded && (
          <FieldSignOffBox
            stpCode={stpCode}
            jobNo={jobNo}
            signedBy={signedBy}
            onChangeSignedBy={setSignedBy}
            signedRole={signedRole}
            onChangeSignedRole={setSignedRole}
            signatureDataUrl={signatureDataUrl}
            onChangeSignature={setSignatureDataUrl}
            sitePhotos={sitePhotos}
            onChangePhotos={setSitePhotos}
            hidePhotoSection
          />
        )}

        <button
          type="button"
          onClick={handleSave}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 font-extrabold text-white shadow-2xs active:bg-brand-deep cursor-pointer"
        >
          <Save className="h-4 w-4 shrink-0" />
          <span>
            {findMatchingSavedRecord()
              ? tx(`更新紀錄 · ${effectiveRefNo}`, `Update Record · ${effectiveRefNo}`)
              : tx(`儲存紀錄 · ${effectiveRefNo}`, `Save Record · ${effectiveRefNo}`)}
          </span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPreviewState({ record: buildDraftRecord(), mode: 'worksheet' })}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 font-extrabold text-white active:bg-slate-800 cursor-pointer"
          >
            <Printer className="h-4 w-4 shrink-0" />
            <span>{tx('官方工作紙', 'Official Worksheet')}</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewState({ record: buildDraftRecord(), mode: 'formal_report' })}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 font-extrabold text-amber-950 active:bg-amber-100 cursor-pointer"
          >
            <Award className="h-4 w-4 shrink-0 text-amber-700" />
            <span>{tx('正式報告', 'Formal Report')}</span>
          </button>
        </div>
      </div>

      {previewState && (
        <HoklasReportPreview
          record={previewState.record}
          structuredData={previewState.record.structuredData || structuredData}
          initialDocMode={previewState.mode}
          onClose={() => setPreviewState(null)}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={handleCopy} className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-slate-900 py-3 font-extrabold text-white cursor-pointer">
          <Copy className="h-4 w-4" /> {tx('複製計算結果', 'Copy Result')}
        </button>
        <button type="button" onClick={() => setStpPreviewCode(stpCode)} className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-brand/40 bg-white py-3 font-extrabold text-brand-deep cursor-pointer">
          <FileCheck2 className="h-4 w-4" /> {tx(`檢視 ${stpCode} STP`, `Open ${stpCode} STP`)}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <button type="button" onClick={() => setOpen(!open)} className="flex min-h-[44px] w-full items-center justify-between px-3.5 py-3 font-extrabold text-slate-800 cursor-pointer">
          <span>📐 {tx('公式、注意事項及各部門驗收標準', 'Formula, Notes & Dept Specs')}</span>
          <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="border-t border-slate-100 p-3.5 space-y-2.5 bg-slate-50/60">
            <div className="rounded-xl bg-white border border-brand/20 p-2.5 font-mono text-[11px] font-bold text-brand-deep break-words">{formula}</div>
            {spec && (
              <div className="space-y-1.5">
                {GOV_DEPTS.map((d) => {
                  const req = spec.depts[d.id];
                  const txt = (lang === 'en' ? req.criteriaEn : req.criteriaZh).split('\n').join(' ； ');
                  return (
                    <div key={d.id} className="rounded-xl bg-white border border-slate-200/80 p-2 text-[11px]">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold border mr-1.5 ${d.badgeCls}`}>{d.short}</span>
                      <span className="font-semibold text-slate-800">{txt}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <ul className="space-y-1 text-[11px] text-amber-900 bg-amber-50/80 rounded-xl p-2.5 border border-amber-200/80">
              {notes.map((n, i) => <li key={i}>• {n}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 1. SO — Crosshole Sonic Logging (STP03-FDT-D6760 Rev 3)
 * ============================================================================ */
export const MobileSonicCalc: React.FC = () => {
  const { tx } = usePrefs();
  const [tubeCount, setTubeCount] = useState<number>(4);
  const [concreteAgeDays, setConcreteAgeDays] = useState('10');
  const [waterTempC, setWaterTempC] = useState('24.5');
  const [shortestTubeLenM, setShortestTubeLenM] = useState('38.50');
  const [scannedLenM, setScannedLenM] = useState('38.15');
  const [actualPullingSec, setActualPullingSec] = useState('86');
  const [rows, setRows] = useState(() => buildTubePairRows(4, 1800));

  const applyPreset = (n: number) => {
    setTubeCount(n);
    setRows(buildTubePairRows(n, 1800));
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

  const computedProfiles = useMemo(
    () =>
      rows.map((r) => {
        const distMm = Math.max(1, parseFloat(r.distMm) || 0);
        const baseFatUs = Math.max(1, parseFloat(r.baseFatUs) || 0);
        const measFatUs = Math.max(1, parseFloat(r.measFatUs) || 0);
        const energyDropDb = Math.max(0, parseFloat(r.energyDropDb) || 0);
        const waveSpeedMs = measFatUs > 0 ? (distMm * 1000) / measFatUs : 0;
        const fatDelayPct = baseFatUs > 0 ? ((measFatUs - baseFatUs) / baseFatUs) * 100 : 0;
        const anomaly = fatDelayPct > 20 || energyDropDb > 6 || waveSpeedMs < 3000;
        return { ...r, distNum: distMm, baseFatNum: baseFatUs, measFatNum: measFatUs, energyDropNum: energyDropDb, waveSpeedMs, fatDelayPct, anomaly };
      }),
    [rows]
  );

  const anomalyCount = computedProfiles.filter((p) => p.anomaly).length;
  const minWaveSpeed = computedProfiles.length ? Math.min(...computedProfiles.map((p) => p.waveSpeedMs)) : 0;
  const isPass = ageOk && tempOk && lengthCheckOk && pullingOk && computedProfiles.length > 0 && anomalyCount === 0;

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

  const copyText = `[SO Sonic Logging — STP03 Rev 3] Tubes=${tubeCount} (${computedProfiles.length} pairs) | Age=${ageNum}d | WaterTemp=${waterTempC}°C | Plumbed B=${plumbedLenNum.toFixed(2)}m vs Scanned A=${scannedLenNum.toFixed(2)}m | Pull=${actualPullNum}s (Min ${minPullingSec}s) | MinV=${minWaveSpeed.toFixed(0)}m/s -> ${isPass ? 'PASS' : 'ANOMALY / RE-CHECK'}`;

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold text-sm text-slate-900">🔊 {tx('跨孔超聲波透射法 · STP03 Rev 3', 'Sonic Logging · STP03 Rev 3')}</span>
          <button type="button" onClick={() => applyPreset(4)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 cursor-pointer">
            <RotateCcw className="h-3.5 w-3.5" /> {tx('重設', 'Reset')}
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => applyPreset(n)}
              className={`min-h-[40px] rounded-xl font-extrabold cursor-pointer ${
                tubeCount === n ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {n}{tx('管', 'T')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('混凝土齡期 · 日', 'Concrete Age · d')}</span>
            <input type="number" value={concreteAgeDays} onChange={(e) => setConcreteAgeDays(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className={`text-[10px] font-bold ${ageOk ? 'text-emerald-700' : 'text-rose-600'}`}>{ageOk ? '✓ ≥ 7 d' : '⚠️ < 7 d'}</span>
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('管內水溫 · °C', 'Water Temp · °C')}</span>
            <input type="number" step="0.1" value={waterTempC} onChange={(e) => setWaterTempC(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className={`text-[10px] font-bold ${tempOk ? 'text-emerald-700' : 'text-rose-600'}`}>{tempOk ? '✓ 0–30°C' : '⚠️ 0–30°C'}</span>
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('最短管長 · m', 'Shortest Tube · m')}</span>
            <input type="number" step="0.01" value={shortestTubeLenM} onChange={(e) => setShortestTubeLenM(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className="font-mono text-[10px] text-slate-500">B = {plumbedLenNum.toFixed(2)} m</span>
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('編碼器長 A · m', 'Scanned A · m')}</span>
            <input type="number" step="0.01" value={scannedLenM} onChange={(e) => setScannedLenM(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className={`font-mono text-[10px] font-bold ${lengthCheckOk ? 'text-emerald-700' : 'text-rose-600'}`}>
              |A−B| {lenDiffM.toFixed(2)} ≤ {lenTolM.toFixed(2)}m
            </span>
          </label>
          <label className="col-span-2 rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 flex items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-700 block">{tx('秒錶實測提拉時間 · s', 'Stopwatch Pull Time · s')}</span>
              <span className={`font-mono text-[10px] font-bold ${pullingOk ? 'text-emerald-700' : 'text-rose-600'}`}>
                {pullingOk ? `✓ ≥ ${minPullingSec} s · ≤ 0.5 m/s` : `⚠️ 最低要求 ${minPullingSec} s · LT-TD-01`}
              </span>
            </div>
            <input type="number" step="1" value={actualPullingSec} onChange={(e) => setActualPullingSec(e.target.value)} className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
          </label>
        </div>

        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${isPass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
          <div>
            <div className="text-[11px] font-bold text-slate-600">{tx(`最低波速 V · 共 ${computedProfiles.length} 剖面`, `Min Speed V · ${computedProfiles.length} Pairs`)}</div>
            <div className="font-mono text-2xl font-black text-slate-900">{minWaveSpeed.toFixed(0)} m/s</div>
            <div className="text-[11px] font-bold text-brand-deep">
              {anomalyCount === 0 ? tx('0 異常剖面', '0 Anomaly Profiles') : tx(`${anomalyCount} 組異常剖面`, `${anomalyCount} Anomalies`)}
            </div>
          </div>
          <span className={`rounded-xl px-3 py-1.5 font-extrabold text-white ${isPass ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {isPass ? 'PASS' : 'ANOMALY'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {computedProfiles.map((p, i) => (
          <div key={i} className={`rounded-2xl border p-3 space-y-2 ${p.anomaly ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200/90 bg-white'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500">Pair</span>
                <input value={p.pair} onChange={(e) => setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, pair: e.target.value } : x)))} className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono font-extrabold" />
              </div>
              <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-extrabold ${p.anomaly ? 'text-rose-700' : 'text-emerald-700'}`}>
                {p.anomaly ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {p.waveSpeedMs.toFixed(0)} m/s · {p.fatDelayPct >= 0 ? '+' : ''}{p.fatDelayPct.toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className="text-[10px] font-bold text-slate-500">{tx('管距 D · mm', 'Dist D · mm')}</span><input type="number" value={p.distMm} onChange={(e) => setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, distMm: e.target.value } : x)))} className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></label>
              <label className="block"><span className="text-[10px] font-bold text-slate-500">{tx('衰減 · dB', 'Drop · dB')}</span><input type="number" step="0.1" value={p.energyDropDb} onChange={(e) => setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, energyDropDb: e.target.value } : x)))} className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></label>
              <label className="block"><span className="text-[10px] font-bold text-slate-500">{tx('基準 FAT₀ · μs', 'Base FAT₀ · μs')}</span><input type="number" value={p.baseFatUs} onChange={(e) => setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, baseFatUs: e.target.value } : x)))} className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></label>
              <label className="block"><span className="text-[10px] font-bold text-slate-500">{tx('實測 FAT · μs', 'Meas FAT · μs')}</span><input type="number" value={p.measFatUs} onChange={(e) => setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, measFatUs: e.target.value } : x)))} className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" /></label>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setRows((p) => [...p, { pair: `P${p.length + 1}`, distMm: '1270', baseFatUs: '320', measFatUs: '326', energyDropDb: '1.5' }])} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white py-2.5 font-extrabold text-slate-700 cursor-pointer">
          <Plus className="h-4 w-4" /> {tx('新增測試剖面', 'Add Profile')}
        </button>
      </div>

      <MobileCalcFooter
        stpCode="SO"
        formula="V = (D_mm×1000)/FAT_μs ｜ FAT Delay = (FAT−FAT₀)/FAT₀×100% ｜ B = L_short − 0.3 m ｜ t_min = ⌈L/0.5⌉ s"
        copyText={copyText}
        structuredData={sonicPayload}
        notes={[
          tx('STP03 Rev 3 Cl. 6.10 規定測試前聲測管水溫須為 0°C 至 30°C，並以秒錶 LT-TD-01 監控提拉速率 ≤ 0.5 m/s。', 'Verify tube water temp 0–30°C per Cl. 6.10 and monitor pull speed ≤ 0.5 m/s with stopwatch LT-TD-01.'),
          tx('Rev 3 Cl. 6.19 規定每次單一剖面僅使用單對收發探頭同步提拉。', 'Per Rev 3 Cl. 6.19, use a single transmitter-receiver probe pair per profile.'),
        ]}
      />
    </div>
  );
};

/* ============================================================================
 * 2. BL — Grout Bleeding & Expansion (STP04-GTT-C940 Rev 2)
 * ============================================================================ */
const ML_ROWS = [
  { timeLabel: '15m', v2: '801', vg: '800' },
  { timeLabel: '30m', v2: '803', vg: '799' },
  { timeLabel: '45m', v2: '804', vg: '798' },
  { timeLabel: '60m', v2: '805', vg: '797' },
  { timeLabel: '2h · 120m', v2: '806', vg: '795' },
  { timeLabel: '3h · 180m', v2: '806', vg: '794' },
  { timeLabel: '24h · 1440m', v2: '', vg: '' },
];
const MM_ROWS = [
  { timeLabel: '15m', v2: '100.2', vg: '100.0' },
  { timeLabel: '30m', v2: '100.4', vg: '99.9' },
  { timeLabel: '45m', v2: '100.5', vg: '99.7' },
  { timeLabel: '60m', v2: '100.6', vg: '99.5' },
  { timeLabel: '2h · 120m', v2: '100.8', vg: '99.3' },
  { timeLabel: '3h · 180m', v2: '100.8', vg: '99.3' },
  { timeLabel: '24h · 1440m', v2: '', vg: '' },
];

export const MobileBleedingCalc: React.FC = () => {
  const { tx } = usePrefs();
  const [unit, setUnit] = useState<'mL' | 'mm'>('mL');
  const [v1, setV1] = useState('800');
  const [decantedVw, setDecantedVw] = useState('12');
  const [specLimit, setSpecLimit] = useState('2.0');
  const [rows, setRows] = useState(ML_ROWS);
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
  const s1 = isMl ? 'V1' : 'H1';
  const s2 = isMl ? 'V2' : 'H2';
  const sG = isMl ? 'Vg' : 'Hg';
  const sW = isMl ? 'Vw' : 'Hw';

  const switchUnit = (next: 'mL' | 'mm') => {
    if (next === unit) return;
    setUnit(next);
    setV1(next === 'mL' ? '800' : '100');
    setDecantedVw(next === 'mL' ? '12' : '1.5');
    setRows(next === 'mL' ? ML_ROWS : MM_ROWS);
  };

  const v1Num = Math.max(0.1, parseFloat(v1) || (isMl ? 800 : 100));
  const v1Valid = isMl ? v1Num >= 790 && v1Num <= 810 : v1Num >= 95 && v1Num <= 105;
  const ambTempNum = parseFloat(ambientTempText);
  const ambTempOk = Number.isFinite(ambTempNum) && ambTempNum >= 21.0 && ambTempNum <= 25.0;
  const limitNum = Math.max(0, parseFloat(specLimit) || 2.0);

  const computed = useMemo(
    () =>
      rows.map((r) => {
        const n2 = parseFloat(r.v2);
        const ng = parseFloat(r.vg);
        const valid = r.v2.trim() !== '' && r.vg.trim() !== '' && Number.isFinite(n2) && Number.isFinite(ng) && n2 > 0 && ng > 0;
        const amt = valid ? Math.max(0, n2 - ng) : 0;
        const groutExpPct = valid ? ((ng - v1Num) / v1Num) * 100 : 0;
        const bleedPct = valid ? (amt / v1Num) * 100 : 0;
        const expPct = valid ? ((n2 - v1Num) / v1Num) * 100 : 0;
        return { ...r, valid, n2, ng, amt, groutExpPct, bleedPct, expPct };
      }),
    [rows, v1Num]
  );

  const lastValid = [...computed].reverse().find((r) => r.valid);
  const parsedDecant = parseFloat(decantedVw);
  const hasDecant = decantedVw.trim() !== '' && Number.isFinite(parsedDecant) && parsedDecant >= 0;
  const finalAmt = hasDecant ? parsedDecant : (lastValid?.amt ?? 0);
  const finalBleedPct = (finalAmt / v1Num) * 100;
  const finalGroutExpPct = lastValid?.groutExpPct ?? 0;
  const finalExpPct = lastValid?.expPct ?? 0;
  const bleedWithinSpec = roundToNearestStep(finalBleedPct, 0.2) <= limitNum + 1e-9;
  const isPass = bleedWithinSpec && v1Valid && ambTempOk;

  const fmt = (n: number) => Number(n.toFixed(2)).toString();
  const fmtSigned02 = (val: number) => `${roundToNearestStep(val, 0.2) > 0 ? '+' : ''}${formatNearest02(val)}%`;

  const addIntervalRow = () => {
    const lastIdx = rows.length - 1;
    const lastIsBlank24h =
      lastIdx >= 0 &&
      parseIntervalMinutes(rows[lastIdx].timeLabel) >= 1440 &&
      rows[lastIdx].v2.trim() === '' &&
      rows[lastIdx].vg.trim() === '';
    const refRow = lastIsBlank24h && lastIdx > 0 ? rows[lastIdx - 1] : rows[lastIdx];
    const prevMin = refRow ? parseIntervalMinutes(refRow.timeLabel) : 0;
    const nextMin = prevMin < 60 ? prevMin + 15 : prevMin + 60;
    const nextLabel = nextMin >= 120 && nextMin % 60 === 0 ? `${nextMin / 60}h · ${nextMin}m` : `${nextMin}m`;
    const added = {
      timeLabel: nextLabel,
      v2: refRow?.v2 || (isMl ? '806' : '100.8'),
      vg: refRow?.vg || (isMl ? '794' : '99.3'),
    };
    setRows((p) => (lastIsBlank24h ? [...p.slice(0, lastIdx), added, p[lastIdx]] : [...p, added]));
  };

  const blPayload: BleedingStructuredPayload = {
    kind: 'BL',
    unit,
    v1: v1Num,
    decantedVw: hasDecant ? parsedDecant : null,
    specLimitPct: limitNum,
    finalBleedAmt: finalAmt,
    finalBleedPct: roundToNearestStep(finalBleedPct, 0.2),
    finalExpPct: roundToNearestStep(finalExpPct, 0.2),
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
    intervals: computed
      .filter((r) => r.valid)
      .map((r) => ({
        timeLabel: r.timeLabel,
        v2: r.n2,
        vg: r.ng,
        bleedAmt: r.amt,
        bleedPct: roundToNearestStep(r.bleedPct, 0.2),
        expPct: roundToNearestStep(r.expPct, 0.2),
        groutExpPct: roundToNearestStep(r.groutExpPct, 0.2),
      })),
  };

  const failLabel = !bleedWithinSpec ? 'EXCEED' : 'RE-CHECK';

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="font-extrabold text-sm text-slate-900">💧 {tx('水泥漿泌水及膨脹 · STP04', 'Grout Bleeding & Exp · STP04')}</div>
          <button type="button" onClick={() => { setV1(isMl ? '800' : '100'); setDecantedVw(isMl ? '12' : '1.5'); setAmbientTempText('23.0'); setRows(isMl ? ML_ROWS : MM_ROWS); }} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 cursor-pointer"><RotateCcw className="h-3.5 w-3.5" /> {tx('重設', 'Reset')}</button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 font-extrabold">
          <button type="button" onClick={() => switchUnit('mL')} className={`min-h-[40px] rounded-lg py-2 cursor-pointer ${isMl ? 'bg-brand text-white shadow-xs' : 'text-slate-600'}`}>{tx('體積 · mL', 'Volume · mL')}</button>
          <button type="button" onClick={() => switchUnit('mm')} className={`min-h-[40px] rounded-lg py-2 cursor-pointer ${!isMl ? 'bg-brand text-white shadow-xs' : 'text-slate-600'}`}>{tx('高度 · mm', 'Height · mm')}</button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" onClick={() => setSpecLimit('2.0')} className={`min-h-[38px] rounded-xl px-2.5 py-1.5 font-extrabold cursor-pointer ${Math.abs(limitNum - 2.0) < 0.01 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {tx('樁基灌漿 ≤ 2.0%', 'Piling ≤ 2.0%')}
          </button>
          <button type="button" onClick={() => setSpecLimit('0.5')} className={`min-h-[38px] rounded-xl px-2.5 py-1.5 font-extrabold cursor-pointer ${Math.abs(limitNum - 0.5) < 0.01 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {tx('CEDD 泥釘 Sec. 7 ≤ 0.5%', 'CEDD Soil Nail ≤ 0.5%')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600 text-[11px]">{tx(`初始 ${s1} · ${unit}`, `Init ${s1} · ${unit}`)}</span>
            <input type="number" step="any" value={v1} onChange={(e) => setV1(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm font-bold" />
            <span className={`text-[10px] font-bold ${v1Valid ? 'text-emerald-700' : 'text-rose-600'}`}>
              {isMl ? (v1Valid ? '✓ 790–810 mL' : '⚠️ 790–810 mL') : (v1Valid ? '✓ 95–105 mm' : '⚠️ 95–105 mm')}
            </span>
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600 text-[11px]">{tx(`傾析 ${sW} · ${unit}`, `Final ${sW} · ${unit}`)}</span>
            <input type="number" step="any" value={decantedVw} onChange={(e) => setDecantedVw(e.target.value)} placeholder={tx('選填', 'Opt')} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm font-bold" />
            <span className="text-[10px] text-slate-500">{tx(`留空用末段 ${s2}−${sG}`, `Blank uses ${s2}−${sG}`)}</span>
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600 text-[11px]">{tx('室溫 · °C', 'Ambient · °C')}</span>
            <input value={ambientTempText} onChange={(e) => setAmbientTempText(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm font-bold" />
            <span className={`text-[10px] font-bold ${ambTempOk ? 'text-emerald-700' : 'text-rose-600'}`}>{ambTempOk ? '✓ 23±2°C' : '⚠️ 21–25°C'}</span>
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600 text-[11px]">{tx('上限 · %', 'Limit · %')}</span>
            <input type="number" step="0.1" value={specLimit} onChange={(e) => setSpecLimit(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm font-bold" />
            <span className="text-[10px] text-slate-500">{tx('進位至 0.2%', 'Nearest 0.2%')}</span>
          </label>
        </div>

        <div className={`rounded-2xl border p-3.5 space-y-2 ${isPass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-600">{tx('最終泌水率 · 進位至 0.2%', 'Final Bleeding · Nearest 0.2%')}</div>
              <div className="font-mono text-2xl font-black text-slate-900">
                {formatNearest02(finalBleedPct)}% <span className="text-xs font-bold text-brand-deep">· {fmt(finalAmt)} {unit}</span>
              </div>
            </div>
            <span className={`rounded-xl px-3 py-1.5 font-extrabold text-white ${isPass ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              {isPass ? 'PASS' : failLabel}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200/60 font-mono text-[11px]">
            <div><span className="text-slate-500 block font-sans text-[10px]">{tx('漿體膨脹', 'Grout Exp')}</span><b className="text-violet-900">{fmtSigned02(finalGroutExpPct)}</b></div>
            <div><span className="text-slate-500 block font-sans text-[10px]">{tx('時段泌水', 'Int. Bleed')}</span><b className="text-brand-deep">{formatNearest02(lastValid?.bleedPct ?? 0)}%</b></div>
            <div><span className="text-slate-500 block font-sans text-[10px]">{tx('自由膨脹', 'Free Exp')}</span><b className="text-sky-800">{fmtSigned02(finalExpPct)}</b></div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {computed.map((r, i) => (
          <div key={i} className="rounded-2xl border border-slate-200/90 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <input value={r.timeLabel} onChange={(e) => setRows((p) => p.map((x, idx) => (idx === i ? { ...x, timeLabel: e.target.value } : x)))} className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-extrabold text-slate-800" />
              <div className="font-mono text-[11px] font-extrabold text-brand-deep">
                {r.valid ? `Bleed ${formatNearest02(r.bleedPct)}% · Grout ${fmtSigned02(r.groutExpPct)} · Free ${fmtSigned02(r.expPct)}` : tx('選填時段', 'Optional')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className="text-[11px] font-bold text-slate-500">{isMl ? 'V2 · mL' : 'H2 · mm'}</span><input type="number" step="any" placeholder={tx('選填', 'Opt')} value={r.v2} onChange={(e) => setRows((p) => p.map((x, idx) => (idx === i ? { ...x, v2: e.target.value } : x)))} className="mt-0.5 w-full rounded-xl border border-slate-200 px-2.5 py-2 font-mono text-sm font-bold" /></label>
              <label className="block"><span className="text-[11px] font-bold text-slate-500">{isMl ? 'Vg · mL' : 'Hg · mm'}</span><input type="number" step="any" placeholder={tx('選填', 'Opt')} value={r.vg} onChange={(e) => setRows((p) => p.map((x, idx) => (idx === i ? { ...x, vg: e.target.value } : x)))} className="mt-0.5 w-full rounded-xl border border-slate-200 px-2.5 py-2 font-mono text-sm font-bold" /></label>
            </div>
          </div>
        ))}
        <button type="button" onClick={addIntervalRow} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white py-2.5 font-extrabold text-slate-700 cursor-pointer"><Plus className="h-4 w-4" /> {tx('新增時段 · +15m / +60m', 'Add Interval · +15m / +60m')}</button>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-3 space-y-2">
        <div className="font-extrabold text-[11px] text-sky-950">🧪 {tx('FST04 樣本資料 · 匯出前可修改', 'FST04 Sample Info · Editable')}</div>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Brand of Cement</span><input value={cementBrand} onChange={(e) => setCementBrand(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Cement Qty</span><input value={cementQty} onChange={(e) => setCementQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Brand of Admixture</span><input value={admixtureBrand} onChange={(e) => setAdmixtureBrand(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Admixture Qty</span><input value={admixtureQty} onChange={(e) => setAdmixtureQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Water</span><input value={waterSource} onChange={(e) => setWaterSource(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Water Qty</span><input value={waterQty} onChange={(e) => setWaterQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">W/C Ratio</span><input value={wcRatio} onChange={(e) => setWcRatio(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Date of Testing</span><input type="date" value={testDateIso} onChange={(e) => setTestDateIso(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Water Temp · °C</span><input value={waterTempText} onChange={(e) => setWaterTempText(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Batch No.</span><input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="col-span-2 block"><span className="text-[10px] font-bold text-slate-600">Sample ID</span><input value={sampleId} onChange={(e) => setSampleId(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
        </div>
      </div>

      <MobileCalcFooter
        stpCode="BL"
        formula={`Grout Exp = (${sG}−${s1})/${s1}×100% ｜ Bleed = (${s2}−${sG})/${s1}×100% ｜ Free Exp = (${s2}−${s1})/${s1}×100% ｜ Final = ${sW}/${s1}×100% · Nearest 0.2%`}
        copyText={`[BL Grout Bleeding — ${unit}] ${s1}=${v1Num} ${unit} (${v1Valid ? 'OK' : 'RE-CHECK'}) | Amb=${ambientTempText}°C (${ambTempOk ? 'OK' : 'RE-CHECK'}) | GroutExp=${fmtSigned02(finalGroutExpPct)} | FreeExp=${fmtSigned02(finalExpPct)} | FinalBleed=${formatNearest02(finalBleedPct)}% (≤${limitNum.toFixed(1)}%) -> ${isPass ? 'PASS' : failLabel}`}
        structuredData={blPayload}
        notes={[
          tx('STP04 Cl. 8.2–8.5 規定全部四項百分比均進位至最接近 0.2%，室溫維持 23 ± 2°C。', 'Round all four percentages to nearest 0.2% per STP04 Cl. 8.2–8.5 and maintain 23 ± 2°C ambient temp.'),
          tx('CEDD GS Sec. 7 泥釘灌漿 3h 泌水率上限為 ≤ 0.5% 且 24h 須為 0%。', 'CEDD GS Sec. 7 soil-nail grout requires 3h bleeding ≤ 0.5% and 0% at 24h.'),
        ]}
      />
    </div>
  );
};

/* ============================================================================
 * 3. KD — Koden Ultrasonic Echo Sounder (STP02-FDT-TM3 Rev 7)
 * ============================================================================ */
export const MobileKodenCalc: React.FC = () => {
  const { tx } = usePrefs();
  const [pileDia, setPileDia] = useState('2500');
  const [tapeDepthM, setTapeDepthM] = useState('42.50');
  const [uesDepthM, setUesDepthM] = useState('42.42');
  const [d1M, setD1M] = useState('2.5');
  const [d2M, setD2M] = useState('42.5');
  const [showChartHelper, setShowChartHelper] = useState(false);
  const [shVal, setShVal] = useState('0.0250');
  const [caliperR, setCaliperR] = useState('100.0');
  const [dxMm, setDxMm] = useState('115');
  const [dyMm, setDyMm] = useState('85');
  const [dirX, setDirX] = useState<'E' | 'W'>('E');
  const [dirY, setDirY] = useState<'N' | 'S'>('S');
  const [specN, setSpecN] = useState('75');

  const tapeNum = Math.max(0.1, parseFloat(tapeDepthM) || 42.5);
  const uesNum = Math.max(0.1, parseFloat(uesDepthM) || 42.42);
  const depthDiffM = Math.abs(tapeNum - uesNum);
  const depthTolM = Math.min(0.3, 0.01 * tapeNum);
  const depthVerifyOk = depthDiffM <= depthTolM + 1e-9;

  const d1Num = Math.max(0, parseFloat(d1M) || 0);
  const d2Num = Math.max(d1Num + 0.5, parseFloat(d2M) || 42.5);
  const deltaDM = Number((d2Num - d1Num).toFixed(3));

  const sh4 = Math.round(Math.max(0.0001, parseFloat(shVal) || 0.025) * 10000) / 10000;
  const diaM = Number(((parseFloat(caliperR) || 0) * sh4).toFixed(3));

  const absDx = Math.abs(parseFloat(dxMm) || 0);
  const absDy = Math.abs(parseFloat(dyMm) || 0);
  const lxM = Math.round((absDx / 1000) * 10000) / 10000;
  const lyM = Math.round((absDy / 1000) * 10000) / 10000;
  const vx = lxM > 0 ? deltaDM / lxM : 9999;
  const vy = lyM > 0 ? deltaDM / lyM : 9999;
  const lrM = Math.hypot(lxM, lyM);
  const lr4 = Math.round(lrM * 10000) / 10000;
  const eMm = lrM * 1000;
  const ratio = lr4 > 0 ? deltaDM / lr4 : 9999;
  const vertPct = (lrM / deltaDM) * 100;
  const limit = parseFloat(specN) || 75;
  const pass = ratio >= limit && depthVerifyOk;

  const kdPayload: KodenStructuredPayload = {
    kind: 'KD',
    pileDiaMm: parseFloat(pileDia) || 2500,
    depthM: deltaDM,
    dxMm: dirX === 'E' ? absDx : -absDx,
    dyMm: dirY === 'N' ? absDy : -absDy,
    offsetMm: Number(eMm.toFixed(1)),
    ratioDenom: ratio,
    vertPct,
    limitDenom: limit,
    isPass: pass,
    scaleFactorSh: sh4,
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold text-sm text-slate-900">📡 Koden · STP02 Rev 7</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => setSpecN('75')} className={`min-h-[36px] rounded-lg px-2.5 py-1 font-bold cursor-pointer ${specN === '75' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>≤1:75</button>
            <button type="button" onClick={() => setSpecN('100')} className={`min-h-[36px] rounded-lg px-2.5 py-1 font-bold cursor-pointer ${specN === '100' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>≤1:100</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('測錘深度 D_tape · m', 'Tape Depth · m')}</span>
            <input type="number" step="0.01" value={tapeDepthM} onChange={(e) => setTapeDepthM(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('圖譜深度 D_UES · m', 'UES Depth · m')}</span>
            <input type="number" step="0.01" value={uesDepthM} onChange={(e) => setUesDepthM(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className={`font-mono text-[10px] font-bold ${depthVerifyOk ? 'text-emerald-700' : 'text-rose-600'}`}>
              {depthVerifyOk ? `✓ |Δ| ${depthDiffM.toFixed(2)} ≤ ${depthTolM.toFixed(2)}m` : `⚠️ |Δ| ${depthDiffM.toFixed(2)} > ${depthTolM.toFixed(2)}m`}
            </span>
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('起算深度 D1 · m', 'Top D1 · m')}</span>
            <input type="number" step="0.1" value={d1M} onChange={(e) => setD1M(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('樁底深度 D2 · m', 'Base D2 · m')}</span>
            <input type="number" step="0.1" value={d2M} onChange={(e) => setD2M(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
            <span className="font-mono text-[10px] text-brand-deep">ΔD = {deltaDM.toFixed(1)} m</span>
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">|dx| · mm &amp; Dir</span>
            <div className="mt-1 flex gap-1">
              <input type="number" min="0" value={dxMm} onChange={(e) => setDxMm(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm font-bold" />
              <select value={dirX} onChange={(e) => setDirX(e.target.value as 'E' | 'W')} className="rounded-lg border border-slate-300 bg-white px-1.5 font-bold"><option value="E">E</option><option value="W">W</option></select>
            </div>
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">|dy| · mm &amp; Dir</span>
            <div className="mt-1 flex gap-1">
              <input type="number" min="0" value={dyMm} onChange={(e) => setDyMm(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm font-bold" />
              <select value={dirY} onChange={(e) => setDirY(e.target.value as 'N' | 'S')} className="rounded-lg border border-slate-300 bg-white px-1.5 font-bold"><option value="N">N</option><option value="S">S</option></select>
            </div>
          </label>
        </div>

        <button type="button" onClick={() => setShowChartHelper(!showChartHelper)} className="flex min-h-[38px] w-full items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50/50 py-1.5 font-extrabold text-indigo-800 cursor-pointer">
          <Calculator className="h-3.5 w-3.5" /> {tx('SH 橫向比例尺及孔徑換算 L = r × SH', 'SH Scale & Borehole Dia Converter')}
        </button>

        {showChartHelper && (
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-indigo-100 bg-indigo-50/30 p-2.5">
            <label className="block"><span className="text-[10px] font-bold text-slate-600">Pile D · mm</span><input type="number" value={pileDia} onChange={(e) => setPileDia(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono font-bold" /></label>
            <label className="block"><span className="text-[10px] font-bold text-slate-600">SH · m/mm</span><input type="number" step="0.0001" value={shVal} onChange={(e) => setShVal(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono font-bold" /></label>
            <label className="block"><span className="text-[10px] font-bold text-slate-600">r · mm → {diaM.toFixed(3)}m</span><input type="number" step="0.1" value={caliperR} onChange={(e) => setCaliperR(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono font-bold" /></label>
          </div>
        )}

        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${pass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
          <div>
            <div className="text-[11px] font-bold text-slate-600">VR · Spec ≤ 1:{limit}</div>
            <div className="font-mono text-2xl font-black text-slate-900">1 : {ratio > 5000 ? '∞' : ratio.toFixed(0)}</div>
            <div className="font-mono text-[11px] font-bold text-brand-deep">
              LR = {eMm.toFixed(1)}mm Towards {dirY}{dirX} · Vx 1:{vx > 5000 ? '∞' : vx.toFixed(0)} · Vy 1:{vy > 5000 ? '∞' : vy.toFixed(0)}
            </div>
          </div>
          <span className={`rounded-xl px-3 py-1.5 font-extrabold text-white ${pass ? 'bg-emerald-600' : 'bg-rose-600'}`}>{pass ? 'PASS' : 'EXCEED'}</span>
        </div>
      </div>

      <MobileCalcFooter
        stpCode="KD"
        formula="T = |D_tape−D_UES| ≤ min(0.3m, 1%) ｜ L = r×ROUND(SH,4) ｜ VR = 1 : (ΔD / ROUND(LR,4)) ｜ U95 = ± 1 mm"
        copyText={`[KD Koden — STP02 Rev 7] D=${pileDia}mm | Tape=${tapeNum.toFixed(2)}m vs UES=${uesNum.toFixed(2)}m (${depthVerifyOk ? 'OK' : 'RE-CHECK'}) | ΔD=${deltaDM.toFixed(1)}m | LR=${eMm.toFixed(1)}mm Towards ${dirY}${dirX} | VR=1:${ratio.toFixed(0)} -> ${pass ? 'PASS' : 'EXCEED / RE-CHECK'}`}
        structuredData={kdPayload}
        notes={[
          tx('STP02 Rev 7 規定量度 NS / WE 正交護筒內徑、控制絞車速率 5–11 m/min，走紙比例 1:50 / 1:100 / 1:200，U95 = ± 1 mm。', 'Measure NS/WE casing ID, keep winch speed at 5–11 m/min, feed rate 1:50/1:100/1:200, U95 = ± 1 mm.'),
        ]}
      />
    </div>
  );
};

/* ============================================================================
 * 4. FC — Flow Cone Efflux Test (STP05-GTT-C939 Rev 2)
 * ============================================================================ */
const MOB_FC_RANGES = [
  { id: 'piling', label: '樁基 11–30s', min: 11, max: 30 },
  { id: 'nail', label: 'CEDD 泥釘 15–30s', min: 15, max: 30 },
  { id: 'bd', label: 'BD 10–30s', min: 10, max: 30 },
  { id: 'hkha', label: 'HKHA 12–30s', min: 12, max: 30 },
];

export const MobileFlowConeCalc: React.FC = () => {
  const { tx } = usePrefs();
  const [presetId, setPresetId] = useState('piling');
  const [waterSec, setWaterSec] = useState('8.0');
  const [t1Sec, setT1Sec] = useState('16.4');
  const [t2Sec, setT2Sec] = useState('16.8');
  const [temp, setTemp] = useState('23.0');
  const [cementBrand, setCementBrand] = useState('Green Island OPC · BS EN 197-1 CEM I 52.5N');
  const [cementQty, setCementQty] = useState('50 kg · 1 Bag');
  const [admixtureBrand, setAdmixtureBrand] = useState('Sika Grout Aid / Cebex 100');
  const [admixtureQty, setAdmixtureQty] = useState('0.225 kg');
  const [waterSource, setWaterSource] = useState('Mains Potable Water · WSD');
  const [waterQty, setWaterQty] = useState('21.0 L');
  const [wcRatio, setWcRatio] = useState('0.42');
  const [ambientTempText, setAmbientTempText] = useState('23.0 °C');
  const [waterTempText, setWaterTempText] = useState('23.0 °C');
  const [testDateIso, setTestDateIso] = useState(() => getHkTodayIso());
  const [batchNo, setBatchNo] = useState('');
  const [sampleId, setSampleId] = useState('');
  const [timeWaterAdded, setTimeWaterAdded] = useState('09:15');
  const [timeDrawingGrout, setTimeDrawingGrout] = useState('09:20');

  const preset = MOB_FC_RANGES.find((r) => r.id === presetId) || MOB_FC_RANGES[0];
  const wNum = parseFloat(waterSec) || 0;
  const wOk = wNum >= 7.8 && wNum <= 8.2;
  const n1 = parseFloat(t1Sec) || 0;
  const n2 = parseFloat(t2Sec) || 0;
  const avg = (n1 + n2) / 2;
  const avg02 = roundToNearestStep(avg, 0.2);
  const avgFmt02 = formatNearest02(avg);
  const diff = Math.abs(n1 - n2);
  const repOk = n1 > 0 && n2 > 0 && diff <= 1.8 + 1e-9;
  const tempNum = parseFloat(temp);
  const tempOk = Number.isFinite(tempNum) && tempNum >= 21.0 && tempNum <= 25.0;
  const ceilingOk = n1 > 0 && n2 > 0 && avg <= 35.0 && n1 <= 35.0 && n2 <= 35.0;
  const specOk = avg02 >= preset.min && avg02 <= preset.max;
  const allOk = wOk && repOk && tempOk && ceilingOk && specOk;

  const fcPayload: FlowConeStructuredPayload = {
    kind: 'FC',
    waterCheckSec: wNum,
    waterOk: wOk,
    groutTempC: Number.isFinite(tempNum) ? tempNum : 23.0,
    t1Sec: n1,
    t2Sec: n2,
    meanSec: avg02,
    diffSec: diff,
    repeatOk: repOk,
    specRangeText: `${preset.min}–${preset.max} s`,
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
    timeWaterAdded,
    timeDrawingGrout,
  };

  const failParts: string[] = [];
  if (!wOk) failParts.push('RE-CHECK Nozzle');
  if (!repOk) failParts.push('RE-TEST >1.8s');
  if (!tempOk) failParts.push('RE-TEST Temp');
  if (!ceilingOk) failParts.push('EXCEED 35s Ceiling');
  if (!specOk) failParts.push(`EXCEED ${preset.min}–${preset.max}s`);

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 space-y-3">
        <div className="font-extrabold text-sm text-slate-900">⏱️ {tx('水泥漿流錐 · ASTM C939 · STP05', 'Flow Cone · ASTM C939 · STP05')}</div>

        <div className="grid grid-cols-2 gap-1.5">
          {MOB_FC_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setPresetId(r.id)}
              className={`min-h-[38px] rounded-xl px-2 py-1.5 font-extrabold cursor-pointer ${
                presetId === r.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('清水校準 · s', 'Water Check · s')}</span>
            <input type="number" step="0.1" value={waterSec} onChange={(e) => setWaterSec(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" />
            <span className={`text-[10px] font-bold ${wOk ? 'text-emerald-700' : 'text-rose-600'}`}>{wOk ? '✓ 8.0±0.2s' : '⚠️ 7.8–8.2s'}</span>
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('試樣漿溫 · °C', 'Specimen Temp · °C')}</span>
            <input type="number" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" />
            <span className={`text-[10px] font-bold ${tempOk ? 'text-emerald-700' : 'text-rose-600'}`}>{tempOk ? '✓ 23.0±2.0°C' : '⚠️ 21–25°C'}</span>
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">Run 1 T1 · s</span>
            <input type="number" step="0.1" value={t1Sec} onChange={(e) => setT1Sec(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" />
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">Run 2 T2 · s</span>
            <input type="number" step="0.1" value={t2Sec} onChange={(e) => setT2Sec(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" />
          </label>
        </div>

        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${allOk ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
          <div>
            <div className="text-[11px] font-bold text-slate-600">{tx('平均流出時間 · 進位至 0.2 s', 'Mean Efflux · Nearest 0.2 s')}</div>
            <div className="font-mono text-2xl font-black text-brand-deep">{avgFmt02} s</div>
            <div className="font-mono text-[11px] font-bold text-slate-600">
              |T1−T2|={diff.toFixed(1)}s · |Ti−Avg|={(diff / 2).toFixed(2)}s · {preset.min}–{preset.max}s
            </div>
          </div>
          <span className={`rounded-xl px-3 py-1.5 font-extrabold text-white ${allOk ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {allOk ? 'PASS' : tx('重測', 'RE-TEST')}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-3 space-y-2">
        <div className="font-extrabold text-[11px] text-sky-950">🧪 {tx('FST05 樣本資料 · 匯出前可修改', 'FST05 Sample Info · Editable')}</div>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Brand of Cement</span><input value={cementBrand} onChange={(e) => setCementBrand(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Cement Qty</span><input value={cementQty} onChange={(e) => setCementQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Brand of Admixture</span><input value={admixtureBrand} onChange={(e) => setAdmixtureBrand(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Admixture Qty</span><input value={admixtureQty} onChange={(e) => setAdmixtureQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Water</span><input value={waterSource} onChange={(e) => setWaterSource(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Water Qty</span><input value={waterQty} onChange={(e) => setWaterQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">W/C Ratio</span><input value={wcRatio} onChange={(e) => setWcRatio(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Date of Testing</span><input type="date" value={testDateIso} onChange={(e) => setTestDateIso(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Ambient Temp</span><input value={ambientTempText} onChange={(e) => setAmbientTempText(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Water Temp</span><input value={waterTempText} onChange={(e) => setWaterTempText(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Batch No.</span><input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Sample ID</span><input value={sampleId} onChange={(e) => setSampleId(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Time Water Added</span><input value={timeWaterAdded} onChange={(e) => setTimeWaterAdded(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Time Drawing Grout</span><input value={timeDrawingGrout} onChange={(e) => setTimeDrawingGrout(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
        </div>
      </div>

      <MobileCalcFooter
        stpCode="FC"
        formula="Water = 8.0±0.2s ｜ Temp = 23.0±2.0°C ｜ Mean = ROUND((T1+T2)/2, 0.2s) ≤ 35s ｜ |T1−T2| ≤ 1.8s"
        copyText={`[FC Flow Cone — STP05 Rev 2] Water=${wNum.toFixed(1)}s (${wOk ? 'OK' : 'RE-CHECK'}) | Temp=${temp}°C (${tempOk ? 'OK' : 'RE-TEST'}) | T1=${n1.toFixed(1)}s, T2=${n2.toFixed(1)}s -> Mean=${avgFmt02}s (Nearest 0.2s, |T1-T2|=${diff.toFixed(1)}s) -> ${allOk ? 'PASS' : failParts.join(' / ')}`}
        structuredData={fcPayload}
        notes={[
          tx('流嘴首次斷流透光即停錶，平均值按 STP05 Cl. 7.5 進位至最接近 0.2 s，方法上限為 ≤ 35.0 s。', 'Stop at first break in continuous stream; report mean to nearest 0.2 s per STP05 Cl. 7.5 (ceiling ≤ 35.0 s).'),
        ]}
      />
    </div>
  );
};

/* ============================================================================
 * 5. PO — Point Load Strength Index (STP06-RKT-D5731 Rev 2 — Core Only)
 * ============================================================================ */
export const MobilePointLoadCalc: React.FC = () => {
  const { tx } = usePrefs();
  const [mode, setMode] = useState<'diametral' | 'axial'>('diametral');
  const [dMm, setDMm] = useState('52.0');
  const [dPrimeMm, setDPrimeMm] = useState('');
  const [wMm, setWMm] = useState('52.0');
  const [freeEndLMm, setFreeEndLMm] = useState('35.0');
  const [loadKn, setLoadKn] = useState('11.8');
  const [sec, setSec] = useState('24');

  const switchMode = (next: 'diametral' | 'axial') => {
    setMode(next);
    if (next === 'axial' && Math.abs((parseFloat(dMm) || 52) - (parseFloat(wMm) || 52)) < 0.01) {
      setDMm('36.0');
      setWMm('52.0');
    } else if (next === 'diametral' && (parseFloat(dMm) || 36) < 40) {
      setDMm('52.0');
    }
  };

  const d = Math.max(1, parseFloat(dMm) || 50);
  const parsedDPrime = parseFloat(dPrimeMm);
  const hasDPrime = dPrimeMm.trim() !== '' && Number.isFinite(parsedDPrime) && parsedDPrime > 0;
  const dEff = hasDPrime ? parsedDPrime : d;
  const dPrimeOk = !hasDPrime || parsedDPrime <= d + 1e-6;

  const w = Math.max(1, parseFloat(wMm) || 50);
  const freeL = Math.max(0, parseFloat(freeEndLMm) || 0);
  const ratioDW = d / w;
  const geomOk =
    dPrimeOk &&
    (mode === 'diametral' ? freeL >= 0.5 * d - 1e-6 : ratioDW >= 0.33 - 1e-6 && ratioDW <= 1.0 + 1e-6);

  const pN = Math.max(0, (parseFloat(loadKn) || 0) * 1000);
  const de2 = mode === 'diametral' ? d * dEff : (4 * w * dEff) / Math.PI;
  const de = Math.sqrt(Math.max(1e-6, de2));
  const isUncorr = pN / Math.max(1e-6, de2);
  const fFactor = Math.pow(de / 50, 0.45);
  const is50 = isUncorr * fFactor;
  const secNum = parseFloat(sec) || 0;
  const timeOk = secNum >= 10 && secNum <= 60;
  const isValid = timeOk && geomOk && pN > 0;

  const poPayload: PointLoadStructuredPayload = {
    kind: 'PO',
    mode,
    dMm: d,
    wMm: w,
    dPrimeMm: hasDPrime ? dEff : undefined,
    loadKn: parseFloat(loadKn) || 0,
    failSec: secNum,
    deMm: Number(de.toFixed(2)),
    isUncorrMpa: Number(isUncorr.toPrecision(3)),
    fFactor: Number(fFactor.toFixed(4)),
    is50Mpa: Number(is50.toPrecision(3)),
    estUcsMpa: Number((is50 * 22).toFixed(1)),
    timeOk: isValid,
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold text-sm text-slate-900">🪨 Point Load · STP06 Rev 2</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => switchMode('diametral')} className={`min-h-[36px] rounded-lg px-2.5 py-1 font-bold cursor-pointer ${mode === 'diametral' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {tx('徑向', 'Diametral')}
            </button>
            <button type="button" onClick={() => switchMode('axial')} className={`min-h-[36px] rounded-lg px-2.5 py-1 font-bold cursor-pointer ${mode === 'axial' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {tx('軸向 · 僅限岩芯', 'Axial · Core')}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-amber-300 bg-amber-50/75 px-2.5 py-2 text-[11px] font-semibold text-amber-950">
          {tx('HOKLAS 298 及 STP06 Cl. 2.1 嚴禁不規則岩塊測試，僅認可岩芯徑向及軸向測試。', 'HOKLAS 298 & STP06 Cl. 2.1 prohibit irregular lump tests; rock cores only.')}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('初始壓頭距 D · mm', 'Platen D · mm')}</span>
            <input type="number" step="0.1" value={dMm} onChange={(e) => setDMm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
          </label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('貫入距 D\' · mm', 'Penetration D\' · mm')}</span>
            <input type="number" step="0.1" value={dPrimeMm} onChange={(e) => setDPrimeMm(e.target.value)} placeholder={tx('選填 · 預設=D', 'Opt · =D')} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
          </label>
          {mode === 'diametral' ? (
            <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
              <span className="font-bold text-slate-600">{tx('端面距 L · mm', 'Free-End L · mm')}</span>
              <input type="number" step="0.5" value={freeEndLMm} onChange={(e) => setFreeEndLMm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
              <span className={`text-[10px] font-bold ${geomOk ? 'text-emerald-700' : 'text-rose-600'}`}>{geomOk ? '✓ L ≥ 0.5D' : `⚠️ L < ${(0.5 * d).toFixed(1)}mm`}</span>
            </label>
          ) : (
            <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
              <span className="font-bold text-slate-600">{tx('岩芯直徑 W · mm', 'Core Width W · mm')}</span>
              <input type="number" step="0.1" value={wMm} onChange={(e) => setWMm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
              <span className={`text-[10px] font-bold ${geomOk ? 'text-emerald-700' : 'text-rose-600'}`}>{geomOk ? `✓ D/W=${ratioDW.toFixed(2)}` : '⚠️ 0.33 ≤ D/W ≤ 1.0'}</span>
            </label>
          )}
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block">
            <span className="font-bold text-slate-600">{tx('破壞荷載 P · kN', 'Load P · kN')}</span>
            <input type="number" step="0.05" value={loadKn} onChange={(e) => setLoadKn(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
          </label>
          <label className="col-span-2 rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 flex items-center justify-between gap-2">
            <div>
              <span className="font-bold text-slate-700 block">{tx('加載破壞時間 · 須為 10–60 秒', 'Time to Failure · Must be 10–60 s')}</span>
              <span className={`text-[10px] font-bold ${timeOk ? 'text-emerald-700' : 'text-rose-600'}`}>
                {timeOk ? '✓ 10–60 s 合規' : tx('⚠️ 超出 10–60 s 屬無效須重測', '⚠️ Invalid outside 10–60 s')}
              </span>
            </div>
            <input type="number" value={sec} onChange={(e) => setSec(e.target.value)} className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold" />
          </label>
        </div>

        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${isValid ? 'border-brand/25 bg-brand-wash/50' : 'border-rose-200 bg-rose-50/70'}`}>
          <div>
            <div className="text-[11px] font-bold text-slate-600">{tx('修正點荷載指數 Is(50) · 3 位有效數字', 'Corrected Is(50) · 3 sig. figs')}</div>
            <div className="font-mono text-2xl font-black text-brand-deep">{formatSigFigs(is50, 3)} MPa</div>
            <div className="font-mono text-[11px] text-slate-600">
              Is = {formatSigFigs(isUncorr, 3)} MPa · De = {de.toFixed(1)} mm · UCS ≈ {(is50 * 22).toFixed(0)} MPa
            </div>
          </div>
          <span className={`rounded-xl px-3 py-1.5 font-extrabold text-white ${isValid ? 'bg-violet-700' : 'bg-rose-600'}`}>
            {!isValid ? 'INVALID' : is50 >= 3 ? 'Cat 1(a)' : is50 >= 2 ? 'Cat 1(b)' : is50 >= 1 ? 'Cat 1(c)' : '< 1 MPa'}
          </span>
        </div>
      </div>

      <MobileCalcFooter
        stpCode="PO"
        formula="Diametral De²=D×D' ｜ Axial De²=4WD'/π ｜ Is=P(N)/De² ｜ F=(De/50)^0.45 ｜ Is(50)=F×Is · 3 sig. figs"
        copyText={`[PO Point Load — STP06 Rev 2] ${mode === 'diametral' ? 'Diametral' : 'Axial Core'} D=${d}mm${hasDPrime ? `, D'=${dEff}mm` : ''}, P=${loadKn}kN, Time=${sec}s -> Is=${formatSigFigs(isUncorr, 3)} MPa, Is(50)=${formatSigFigs(is50, 3)} MPa -> ${isValid ? 'PASS' : 'INVALID / RE-TEST'}`}
        structuredData={poPayload}
        notes={[
          tx('破壞時間低於 10 s 或超過 60 s，或破裂面未貫穿兩壓頭接觸點，均屬無效測試須作廢重測。', 'Reject and re-test if failure occurs outside 10–60 s or fracture misses either platen contact point.'),
        ]}
      />
    </div>
  );
};
