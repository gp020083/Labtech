import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { FieldCalcPhoto, FieldCalcRecord } from '../types';
import { HK_GOV_SPECS, GOV_DEPTS } from '../data/hkGovSpecs';
import { detectCalcPassStatus } from '../utils/limsRules';
import { buildHoklasFieldWorksheetData } from '../utils/limsProcessTools';
import {
  StructuredCalcPayload,
  getOfficialTemplateMeta,
  triggerCompletedExcelDownload,
  generateSequentialJobRefNo,
  collectPreviousClientOptions,
} from '../utils/completedWorksheetGenerator';
import { downloadCalcRecordCsv, nowTimestamp } from '../utils';
import { SitePhotoAttachmentControl } from '../components/SitePhotoAttachmentControl';
import { FieldSignOffBox } from '../components/FieldSignOffBox';
import { HoklasReportPreview } from '../components/HoklasReportPreview';
import { Copy, FileCheck2, ChevronDown, Plus, RotateCcw, Save, Download, PenTool, Printer, FileSpreadsheet, Award } from 'lucide-react';

export const MobileCalcFooter: React.FC<{
  stpCode: string;
  formula: string;
  copyText: string;
  notes: string[];
  structuredData?: StructuredCalcPayload;
}> = ({ stpCode, formula, copyText, notes, structuredData }) => {
  const { jobs, equipment, tests, calcRecords, saveCalcRecord, setStpPreviewCode, pushToast, user } = useApp();
  const { lang, tx } = usePrefs();
  const [open, setOpen] = useState(false);
  const [jobNo, setJobNo] = useState(jobs[0]?.no || 'LT0002');
  const [jobRefNo, setJobRefNo] = useState(() =>
    generateSequentialJobRefNo(jobs[0]?.no || 'LT0002', stpCode, calcRecords)
  );
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
  const templateMeta = getOfficialTemplateMeta(stpCode, tests);
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

  const buildDraftRecord = (): FieldCalcRecord => ({
    id: `${stpCode}-${Date.now().toString().slice(-4)}`,
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
    testedAt: nowTimestamp(),
    operatorName: user?.name || 'Operator',
    signatureDataUrl: signatureDataUrl || undefined,
    signedBy: signedBy.trim() || undefined,
    signedRole: signedRole.trim() || undefined,
    signedAt: signatureDataUrl ? nowTimestamp() : undefined,
    sitePhotos: sitePhotos.length > 0 ? sitePhotos : undefined,
    structuredData,
  });

  const handleCopy = () => {
    navigator.clipboard?.writeText(copyText);
    pushToast(tx('已複製計算結果', 'Calculation Copied'), tx('可直接貼上至報告或訊息', 'Ready to paste'));
  };

  const handleDispatchNewRefNo = () => {
    const nextRef = generateSequentialJobRefNo(jobNo, stpCode, calcRecords);
    setJobRefNo(nextRef);
    saveCalcRecord({
      jobNo,
      jobRefNo: nextRef,
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
  };

  const handleSave = () => {
    saveCalcRecord({
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
    const nextAfterSave = generateSequentialJobRefNo(jobNo, stpCode, [
      ...calcRecords,
      { id: 'tmp', jobNo, jobRefNo: effectiveRefNo, stpCode, title: '', summary: '', pass: true, testedAt: '', operatorName: '' },
    ]);
    setJobRefNo(nextAfterSave);
  };

  const handleDirectExcel = () => {
    const draft = buildDraftRecord();
    const job = jobs.find((j) => j.no === jobNo) || null;
    const ws = buildHoklasFieldWorksheetData({
      record: draft,
      job,
      equipment,
      tests,
    });
    const downloadedName = triggerCompletedExcelDownload({
      stpCode,
      reportRefNo: ws.reportRefNo,
      jobRefNo: ws.jobRefNo,
      worksOrderNo: ws.worksOrderNo,
      batchNo: ws.batchNo,
      sampleId: ws.sampleId,
      testedAt: ws.testedAt,
      jobNo: ws.jobNo,
      companyProjNo: ws.companyProjNo,
      projectTitle: ws.projectTitle,
      clientName: ws.clientName,
      siteLocation: ws.siteLocation,
      locationNote: ws.locationNote,
      ambientTemp: '26.5 °C',
      weatherNote: 'Fine / Sunny',
      operatorName: ws.operatorName,
      approvedSignatory: ws.approvedSignatory,
      pass: ws.pass,
      equipmentRows: ws.equipmentList,
      measurementRows: ws.rows,
      structured: structuredData,
      tests,
      equipmentRegistry: equipment,
      job,
      record: draft,
    });
    pushToast(
      tx('已產生官方 Completed Excel (.xlsx)', 'Generated Official Completed Excel (.xlsx)'),
      `${downloadedName} (${templateMeta.templateFileCode})`
    );
  };

  const handleCsv = () => {
    const job = jobs.find((j) => j.no === jobNo);
    downloadCalcRecordCsv(buildDraftRecord(), job);
  };

  return (
    <div className="space-y-2.5 text-xs">
      <div className="rounded-2xl border border-brand/30 bg-white p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold text-slate-900">💾 {tx('儲存計算紀錄及產生 Completed Worksheet / 正式報告', 'Save Calc & Gen Worksheet / Report')}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSignOffExpanded(!signOffExpanded)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-extrabold cursor-pointer ${
                signOffExpanded || signatureDataUrl
                  ? 'border-brand bg-brand-wash text-brand-deep'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <PenTool className="h-3 w-3" />
              {tx('✍️ 監工簽署', '✍️ Sign-off')}
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
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 font-bold text-slate-900"
          >
            {jobs.map((j) => (
              <option key={j.no} value={j.no}>{j.no} · {j.shortName}</option>
            ))}
          </select>
          <input value={locNote} onChange={(e) => setLocNote(e.target.value)} placeholder={tx('樁號 / 樣本號 (選填)', 'Pile / Sample Ref')} className="rounded-xl border border-slate-200 px-2.5 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex gap-1">
            <input
              value={jobRefNo}
              onChange={(e) => setJobRefNo(e.target.value)}
              placeholder="Job Ref. No."
              className="min-w-0 flex-1 rounded-xl border border-brand/40 bg-brand-wash/30 px-2 py-1.5 font-mono text-[11px] font-extrabold text-brand-deep"
            />
            <button
              type="button"
              onClick={handleDispatchNewRefNo}
              className="shrink-0 rounded-xl bg-brand px-2 py-1.5 text-[10px] font-extrabold text-white cursor-pointer"
            >
              🎯 {tx('派號', 'Ref')}
            </button>
          </div>
          <input
            value={worksOrderNo}
            onChange={(e) => setWorksOrderNo(e.target.value)}
            placeholder={tx('Works Order No. (手打)', 'Works Order No. (Manual)')}
            className="rounded-xl border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 font-mono text-[11px] font-bold text-slate-900"
          />
        </div>

        {/* 1-2 Site Photos Attachment */}
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

        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" onClick={handleSave} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 font-extrabold text-white cursor-pointer">
            <Save className="h-4 w-4" /> {tx(`存入 ${jobNo}`, `Save to ${jobNo}`)}
          </button>
          <button type="button" onClick={handleDirectExcel} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 font-extrabold text-white cursor-pointer">
            <FileSpreadsheet className="h-4 w-4" /> {tx('📊 官方 Excel (.xlsx)', '📊 Official Excel (.xlsx)')}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button type="button" onClick={() => setPreviewState({ record: buildDraftRecord(), mode: 'worksheet' })} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 py-2 font-extrabold text-white cursor-pointer">
            <Printer className="h-3.5 w-3.5" /> {tx('📋 工作紙', '📋 Worksheet')}
          </button>
          <button type="button" onClick={() => setPreviewState({ record: buildDraftRecord(), mode: 'formal_report' })} className="inline-flex items-center justify-center gap-1 rounded-xl border border-amber-400 bg-amber-50 py-2 font-extrabold text-amber-950 cursor-pointer">
            <Award className="h-3.5 w-3.5 text-amber-700" /> {tx('📜 正式報告', '📜 Report')}
          </button>
          <button type="button" onClick={handleCsv} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 py-2 font-extrabold text-slate-700 cursor-pointer">
            <Download className="h-3.5 w-3.5" /> CSV
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
        <button type="button" onClick={handleCopy} className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 py-3 font-extrabold text-white cursor-pointer">
          <Copy className="h-4 w-4" /> {tx('複製計算結果', 'Copy Result')}
        </button>
        <button type="button" onClick={() => setStpPreviewCode(stpCode)} className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-brand/40 bg-white py-3 font-extrabold text-brand-deep cursor-pointer">
          <FileCheck2 className="h-4 w-4" /> {tx(`檢視 ${stpCode} STP`, `Open ${stpCode} STP`)}
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3.5 py-3 font-extrabold text-slate-800 cursor-pointer">
          <span>📐 {tx('公式、注意事項及各部門 Spec', 'Formula, Notes & Dept Specs')}</span>
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

const ML_ROWS = [
  { timeLabel: '15 min', v2: '802', vg: '800' },
  { timeLabel: '30 min', v2: '804', vg: '799' },
  { timeLabel: '60 min', v2: '805', vg: '797' },
  { timeLabel: '120 min', v2: '806', vg: '795' },
  { timeLabel: '180 min (3hr)', v2: '806', vg: '794' },
];
const MM_ROWS = [
  { timeLabel: '15 min', v2: '100.2', vg: '100.0' },
  { timeLabel: '30 min', v2: '100.5', vg: '99.8' },
  { timeLabel: '60 min', v2: '100.6', vg: '99.5' },
  { timeLabel: '120 min', v2: '100.8', vg: '99.3' },
  { timeLabel: '180 min (3hr)', v2: '100.8', vg: '99.3' },
];

export const MobileBleedingCalc: React.FC = () => {
  const { tx } = usePrefs();
  const [unit, setUnit] = useState<'mL' | 'mm'>('mL');
  const [v1, setV1] = useState('800');
  const [decantedVw, setDecantedVw] = useState('12');
  const [specLimit, setSpecLimit] = useState('2.0');
  const [rows, setRows] = useState(ML_ROWS);
  const [cementBrand, setCementBrand] = useState('Green Island OPC (BS EN 197-1 CEM I 52.5N)');
  const [cementQty, setCementQty] = useState('50 kg (1 Bag)');
  const [admixtureBrand, setAdmixtureBrand] = useState('Sika Grout Aid / Cebex 100');
  const [admixtureQty, setAdmixtureQty] = useState('0.225 kg');
  const [waterSource, setWaterSource] = useState('Mains Potable Water (WSD)');
  const [waterQty, setWaterQty] = useState('21.0 L');
  const [wcRatio, setWcRatio] = useState('0.42');
  const [ambientTempText, setAmbientTempText] = useState('26.5 °C');
  const [waterTempText, setWaterTempText] = useState('25.3 °C');
  const [testDateIso, setTestDateIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [batchNo, setBatchNo] = useState('GR-B01');
  const [sampleId, setSampleId] = useState('GS-01');

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
  const limitNum = Math.max(0, parseFloat(specLimit) || 2.0);
  const computed = useMemo(() => rows.map((r) => {
    const n2 = parseFloat(r.v2);
    const ng = parseFloat(r.vg);
    const valid = Number.isFinite(n2) && Number.isFinite(ng) && n2 > 0 && ng > 0;
    const amt = valid ? Math.max(0, n2 - ng) : 0;
    return { ...r, valid, amt, bleedPct: valid ? (amt / v1Num) * 100 : 0, expPct: valid ? ((n2 - v1Num) / v1Num) * 100 : 0 };
  }), [rows, v1Num]);

  const lastValid = [...computed].reverse().find((r) => r.valid);
  const hasDecant = decantedVw.trim() !== '' && Number.isFinite(parseFloat(decantedVw)) && parseFloat(decantedVw) >= 0;
  const finalAmt = hasDecant ? parseFloat(decantedVw) : (lastValid?.amt ?? 0);
  const finalBleedPct = (finalAmt / v1Num) * 100;
  const finalExpPct = lastValid?.expPct ?? 0;
  const isPass = finalBleedPct <= limitNum;
  const fmt = (n: number) => Number(n.toFixed(2)).toString();

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="font-extrabold text-sm text-slate-900">💧 {tx('Grout 泌水及膨脹率', 'Grout Bleeding & Exp.')}</div>
          <button type="button" onClick={() => { setV1(isMl ? '800' : '100'); setDecantedVw(isMl ? '12' : '1.5'); setRows(isMl ? ML_ROWS : MM_ROWS); }} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 cursor-pointer"><RotateCcw className="h-3.5 w-3.5" /> {tx('重設', 'Reset')}</button>
        </div>
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 font-extrabold">
          <button type="button" onClick={() => switchUnit('mL')} className={`rounded-lg py-2 cursor-pointer ${isMl ? 'bg-brand text-white shadow-xs' : 'text-slate-600'}`}>{tx('體積單位 (mL)', 'Volume (mL)')}</button>
          <button type="button" onClick={() => switchUnit('mm')} className={`rounded-lg py-2 cursor-pointer ${!isMl ? 'bg-brand text-white shadow-xs' : 'text-slate-600'}`}>{tx('高度單位 (mm)', 'Height (mm)')}</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600 text-[11px]">{tx(`初始 ${s1} (${unit})`, `Init ${s1} (${unit})`)}</span><input type="number" step="any" value={v1} onChange={(e) => setV1(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm font-bold" /></label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600 text-[11px]">{tx(`最終 ${sW} (${unit})`, `Final ${sW} (${unit})`)}</span><input type="number" step="any" value={decantedVw} onChange={(e) => setDecantedVw(e.target.value)} placeholder={tx('選填', 'Opt')} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm font-bold" /></label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600 text-[11px]">{tx('上限 (%)', 'Limit (%)')}</span><input type="number" step="0.1" value={specLimit} onChange={(e) => setSpecLimit(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm font-bold" /></label>
        </div>
        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${isPass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
          <div>
            <div className="text-[11px] font-bold text-slate-600">{tx('最終泌水率 Final Bleeding', 'Final Bleeding')}</div>
            <div className="font-mono text-2xl font-black text-slate-900">{finalBleedPct.toFixed(2)}% <span className="text-xs font-bold text-brand-deep">({fmt(finalAmt)} {unit})</span></div>
            <div className="font-mono text-[11px] text-sky-700 font-bold">{tx('自由膨脹率：', 'Free Exp: ')}{finalExpPct >= 0 ? '+' : ''}{finalExpPct.toFixed(2)}%</div>
          </div>
          <span className={`rounded-xl px-3 py-1.5 font-extrabold text-white ${isPass ? 'bg-emerald-600' : 'bg-rose-600'}`}>{isPass ? tx('合格 PASS', 'PASS') : tx('超標 EXCEED', 'EXCEED')}</span>
        </div>
      </div>

      <div className="space-y-2">
        {computed.map((r, i) => (
          <div key={i} className="rounded-2xl border border-slate-200/90 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <input value={r.timeLabel} onChange={(e) => setRows((p) => p.map((x, idx) => (idx === i ? { ...x, timeLabel: e.target.value } : x)))} className="w-32 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-extrabold text-slate-800" />
              <div className="font-mono text-[11px] font-extrabold text-brand-deep">
                {r.valid ? `${fmt(r.amt)} ${unit} · ${r.bleedPct.toFixed(2)}% (${r.expPct >= 0 ? '+' : ''}${r.expPct.toFixed(2)}%)` : '—'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className="text-[11px] font-bold text-slate-500">{isMl ? tx('總液面 V2 (mL)', 'Upper V2 (mL)') : tx('總液面高度 H2 (mm)', 'Upper H2 (mm)')}</span><input type="number" step="any" value={r.v2} onChange={(e) => setRows((p) => p.map((x, idx) => (idx === i ? { ...x, v2: e.target.value } : x)))} className="mt-0.5 w-full rounded-xl border border-slate-200 px-2.5 py-2 font-mono text-sm font-bold" /></label>
              <label className="block"><span className="text-[11px] font-bold text-slate-500">{isMl ? tx('漿體面 Vg (mL)', 'Grout Vg (mL)') : tx('漿體面高度 Hg (mm)', 'Grout Hg (mm)')}</span><input type="number" step="any" value={r.vg} onChange={(e) => setRows((p) => p.map((x, idx) => (idx === i ? { ...x, vg: e.target.value } : x)))} className="mt-0.5 w-full rounded-xl border border-slate-200 px-2.5 py-2 font-mono text-sm font-bold" /></label>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setRows((p) => [...p, { timeLabel: `${(p.length + 1) * 30} min`, v2: p[p.length - 1]?.v2 || '806', vg: p[p.length - 1]?.vg || '794' }])} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white py-2.5 font-extrabold text-slate-700 cursor-pointer"><Plus className="h-4 w-4" /> {tx('新增讀數時段', 'Add Reading Interval')}</button>
      </div>

      {/* Editable Sample Information (FST04 Worksheet) */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-3 space-y-2">
        <div className="font-extrabold text-[11px] text-sky-950">🧪 Sample Information (FST04 Worksheet — Editable before Gen)</div>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Brand of Cement</span><input value={cementBrand} onChange={(e) => setCementBrand(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Quantity (Cement)</span><input value={cementQty} onChange={(e) => setCementQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Brand of Admixture</span><input value={admixtureBrand} onChange={(e) => setAdmixtureBrand(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Quantity (Admixture)</span><input value={admixtureQty} onChange={(e) => setAdmixtureQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Water</span><input value={waterSource} onChange={(e) => setWaterSource(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Quantity (Water)</span><input value={waterQty} onChange={(e) => setWaterQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Water / Cement Ratio</span><input value={wcRatio} onChange={(e) => setWcRatio(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Date of Testing</span><input type="date" value={testDateIso} onChange={(e) => setTestDateIso(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Ambient Temp</span><input value={ambientTempText} onChange={(e) => setAmbientTempText(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Water Temp</span><input value={waterTempText} onChange={(e) => setWaterTempText(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Batch No.</span><input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Sample ID</span><input value={sampleId} onChange={(e) => setSampleId(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
        </div>
      </div>

      <MobileCalcFooter
        stpCode="BL"
        formula={`Bleeding (%) = (${s2} − ${sG}) / ${s1} × 100% ｜ Expansion (%) = (${s2} − ${s1}) / ${s1} × 100%`}
        copyText={`[BL Grout Bleeding — ${unit}] ${s1}=${v1Num} ${unit} | Bleed=${fmt(finalAmt)} ${unit} (${finalBleedPct.toFixed(2)}%) | Exp=${finalExpPct >= 0 ? '+' : ''}${finalExpPct.toFixed(2)}% -> ${isPass ? 'PASS' : 'EXCEED'}`}
        structuredData={{
          kind: 'BL',
          unit,
          v1: v1Num,
          decantedVw: hasDecant ? parseFloat(decantedVw) : null,
          specLimitPct: limitNum,
          finalBleedAmt: finalAmt,
          finalBleedPct,
          finalExpPct,
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
              v2: parseFloat(r.v2) || 0,
              vg: parseFloat(r.vg) || 0,
              bleedAmt: r.amt,
              bleedPct: r.bleedPct,
              expPct: r.expPct,
            })),
        }}
        notes={[
          tx('量筒或透明直管須放置於無震動水平檯面上並加蓋防蒸發。', 'Place cylinder/tube on a level, vibration-free surface and cover top.'),
          tx('首小時每 15 分鐘讀取一次，其後每小時讀取直至穩定。', 'Read every 15 min for first hour, then hourly until stable.'),
        ]}
      />
    </div>
  );
};

export const MobileKodenCalc: React.FC = () => {
  const { tx } = usePrefs();
  const [pileDia, setPileDia] = useState('2500');
  const [depthM, setDepthM] = useState('42.5');
  const [dxMm, setDxMm] = useState('115');
  const [dyMm, setDyMm] = useState('-85');
  const [specN, setSpecN] = useState('75');
  const hMm = Math.max(100, (parseFloat(depthM) || 1) * 1000);
  const eMm = Math.hypot(parseFloat(dxMm) || 0, parseFloat(dyMm) || 0);
  const ratio = eMm > 0.01 ? hMm / eMm : 9999;
  const limit = parseFloat(specN) || 75;
  const pass = ratio >= limit;

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between"><span className="font-extrabold text-sm text-slate-900">📡 Koden Verticality</span><div className="flex gap-1"><button type="button" onClick={() => setSpecN('75')} className={`rounded-lg px-2 py-1 font-bold cursor-pointer ${specN === '75' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>1:75</button><button type="button" onClick={() => setSpecN('100')} className={`rounded-lg px-2 py-1 font-bold cursor-pointer ${specN === '100' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>1:100</button></div></div>
        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">Pile Dia D (mm)</span><input type="number" value={pileDia} onChange={(e) => setPileDia(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" /></label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">Depth H (m)</span><input type="number" step="0.1" value={depthM} onChange={(e) => setDepthM(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" /></label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">Offset ΔX (mm)</span><input type="number" value={dxMm} onChange={(e) => setDxMm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" /></label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">Offset ΔY (mm)</span><input type="number" value={dyMm} onChange={(e) => setDyMm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" /></label>
        </div>
        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${pass ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
          <div><div className="text-[11px] font-bold text-slate-600">Verticality (Spec ≤ 1:{limit})</div><div className="font-mono text-2xl font-black text-slate-900">1 : {ratio > 5000 ? '∞' : ratio.toFixed(0)}</div><div className="font-mono text-[11px] font-bold text-brand-deep">Offset e = {eMm.toFixed(1)} mm ({((eMm / hMm) * 100).toFixed(3)}%)</div></div>
          <span className={`rounded-xl px-3 py-1.5 font-extrabold text-white ${pass ? 'bg-emerald-600' : 'bg-rose-600'}`}>{pass ? tx('合格', 'PASS') : tx('超標', 'EXCEED')}</span>
        </div>
      </div>
      <MobileCalcFooter stpCode="KD" formula="e = √(ΔX² + ΔY²) ｜ Verticality = 1 : (H_mm / e)" copyText={`[KD Koden] D=${pileDia}mm, H=${depthM}m | e=${eMm.toFixed(1)}mm | 1:${ratio.toFixed(0)} (${pass ? 'PASS' : 'EXCEED'})`} notes={[tx('測試前確認已完成清底循環並調平絞車架。', 'Ensure desanding is completed and winch frame is level.')]} />
    </div>
  );
};

export const MobileFlowConeCalc: React.FC = () => {
  const { tx } = usePrefs();
  const [waterSec, setWaterSec] = useState('8.0');
  const [t1Sec, setT1Sec] = useState('16.4');
  const [t2Sec, setT2Sec] = useState('16.8');
  const [temp, setTemp] = useState('26.5');
  const [cementBrand, setCementBrand] = useState('Green Island OPC (BS EN 197-1 CEM I 52.5N)');
  const [cementQty, setCementQty] = useState('50 kg (1 Bag)');
  const [admixtureBrand, setAdmixtureBrand] = useState('Sika Grout Aid / Cebex 100');
  const [admixtureQty, setAdmixtureQty] = useState('0.225 kg');
  const [waterSource, setWaterSource] = useState('Mains Potable Water (WSD)');
  const [waterQty, setWaterQty] = useState('21.0 L');
  const [wcRatio, setWcRatio] = useState('0.42');
  const [ambientTempText, setAmbientTempText] = useState('26.5 °C');
  const [waterTempText, setWaterTempText] = useState('25.3 °C');
  const [testDateIso, setTestDateIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [batchNo, setBatchNo] = useState('GR-B01');
  const [sampleId, setSampleId] = useState('GS-01');
  const [timeWaterAdded, setTimeWaterAdded] = useState('09:15');
  const [timeDrawingGrout, setTimeDrawingGrout] = useState('09:20');
  const wNum = parseFloat(waterSec) || 0;
  const wOk = wNum >= 7.8 && wNum <= 8.2;
  const n1 = parseFloat(t1Sec) || 0;
  const n2 = parseFloat(t2Sec) || 0;
  const avg = (n1 + n2) / 2;
  const diff = Math.abs(n1 - n2);
  const repOk = diff <= 1.8;

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 space-y-3">
        <div className="font-extrabold text-sm text-slate-900">⏱️ Flow Cone (ASTM C939)</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">Water Check (s)</span><input type="number" step="0.1" value={waterSec} onChange={(e) => setWaterSec(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" /><span className={`text-[10px] font-bold ${wOk ? 'text-emerald-700' : 'text-rose-600'}`}>{wOk ? '✓ 8.0±0.2s' : '⚠️ 7.8–8.2s'}</span></label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">Grout Temp (°C)</span><input type="number" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" /></label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">Run 1 T1 (s)</span><input type="number" step="0.1" value={t1Sec} onChange={(e) => setT1Sec(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" /></label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">Run 2 T2 (s)</span><input type="number" step="0.1" value={t2Sec} onChange={(e) => setT2Sec(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" /></label>
        </div>
        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${repOk && wOk ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
          <div><div className="text-[11px] font-bold text-slate-600">Mean Efflux Time</div><div className="font-mono text-2xl font-black text-brand-deep">{avg.toFixed(1)} s</div><div className="font-mono text-[11px] font-bold text-slate-600">|T1 − T2| = {diff.toFixed(1)} s (≤1.8s)</div></div>
          <span className={`rounded-xl px-3 py-1.5 font-extrabold text-white ${repOk ? 'bg-emerald-600' : 'bg-rose-600'}`}>{repOk ? 'OK' : tx('重測', 'RETEST')}</span>
        </div>
      </div>

      {/* Editable Sample Information (FST05 Worksheet) */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-3 space-y-2">
        <div className="font-extrabold text-[11px] text-sky-950">🧪 Sample Information (FST05 Worksheet — Editable before Gen)</div>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Brand of Cement</span><input value={cementBrand} onChange={(e) => setCementBrand(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Quantity (Cement)</span><input value={cementQty} onChange={(e) => setCementQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Brand of Admixture</span><input value={admixtureBrand} onChange={(e) => setAdmixtureBrand(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Quantity (Admixture)</span><input value={admixtureQty} onChange={(e) => setAdmixtureQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Water</span><input value={waterSource} onChange={(e) => setWaterSource(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Quantity (Water)</span><input value={waterQty} onChange={(e) => setWaterQty(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-600">Water / Cement Ratio</span><input value={wcRatio} onChange={(e) => setWcRatio(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold" /></label>
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
        formula="Water = 8.0±0.2s (1725 mL) ｜ Mean = (T1+T2)/2 ｜ |T1−T2| ≤ 1.8s"
        copyText={`[FC Flow Cone] Water=${wNum.toFixed(1)}s | T1=${n1.toFixed(1)}s, T2=${n2.toFixed(1)}s -> Mean=${avg.toFixed(1)}s (Temp ${temp}°C)`}
        structuredData={{
          kind: 'FC',
          waterCheckSec: wNum,
          waterOk: wOk,
          groutTempC: parseFloat(temp) || 26.5,
          t1Sec: n1,
          t2Sec: n2,
          meanSec: avg,
          diffSec: diff,
          repeatOk: repOk,
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
        }}
        notes={[tx('於流嘴首次斷流透光 (First Break) 即停錶。', 'Stop timing at the first break in continuous stream.')]}
      />
    </div>
  );
};

export const MobilePointLoadCalc: React.FC = () => {
  const { tx } = usePrefs();
  const [mode, setMode] = useState<'diametral' | 'axial'>('diametral');
  const [dMm, setDMm] = useState('52.0');
  const [wMm, setWMm] = useState('52.0');
  const [loadKn, setLoadKn] = useState('11.8');
  const [sec, setSec] = useState('24');
  const d = Math.max(1, parseFloat(dMm) || 50);
  const w = Math.max(1, parseFloat(wMm) || 50);
  const pN = Math.max(0, (parseFloat(loadKn) || 0) * 1000);
  const de2 = mode === 'diametral' ? d * d : (4 * w * d) / Math.PI;
  const de = Math.sqrt(de2);
  const is50 = (pN / de2) * Math.pow(de / 50, 0.45);

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between"><span className="font-extrabold text-sm text-slate-900">🪨 Point Load Is(50)</span><div className="flex gap-1"><button type="button" onClick={() => setMode('diametral')} className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${mode === 'diametral' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Diametral</button><button type="button" onClick={() => setMode('axial')} className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${mode === 'axial' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Axial</button></div></div>
        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">Platen D (mm)</span><input type="number" step="0.1" value={dMm} onChange={(e) => setDMm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" /></label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">Width W (mm)</span><input type="number" step="0.1" disabled={mode === 'diametral'} value={wMm} onChange={(e) => setWMm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold disabled:opacity-40" /></label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">Load P (kN)</span><input type="number" step="0.05" value={loadKn} onChange={(e) => setLoadKn(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" /></label>
          <label className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 block"><span className="font-bold text-slate-600">Fail Time (10–60s)</span><input type="number" value={sec} onChange={(e) => setSec(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm font-bold" /></label>
        </div>
        <div className="rounded-2xl border border-brand/25 bg-brand-wash/50 p-3.5 flex items-center justify-between">
          <div><div className="text-[11px] font-bold text-slate-600">Corrected Is(50)</div><div className="font-mono text-2xl font-black text-brand-deep">{is50.toFixed(2)} MPa</div><div className="font-mono text-[11px] text-slate-600">De = {de.toFixed(1)} mm · UCS ≈ {(is50 * 22).toFixed(0)} MPa</div></div>
          <span className="rounded-xl bg-violet-700 px-3 py-1.5 font-extrabold text-white">{is50 >= 3 ? 'Cat 1(a)' : is50 >= 2 ? 'Cat 1(b)' : is50 >= 1 ? 'Cat 1(c)' : '< 1 MPa'}</span>
        </div>
      </div>
      <MobileCalcFooter stpCode="PO" formula="Is = P(N)/De² ｜ F = (De/50)^0.45 ｜ Is(50) = F × Is" copyText={`[PO Point Load] ${mode} D=${d}mm, P=${loadKn}kN -> Is(50)=${is50.toFixed(2)} MPa`} notes={[tx('破裂面須完整貫穿上下壓頭，局部崩角屬無效須作廢。', 'Fracture must pass through both platen points; reject local chipping.')]} />
    </div>
  );
};
