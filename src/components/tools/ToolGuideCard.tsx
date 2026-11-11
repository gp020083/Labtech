import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePermissions } from '../../permissions';
import { useApp } from '../../store';
import { usePrefs } from '../../prefs';
import { FieldCalcPhoto, FieldCalcRecord, SharedDocAttachment } from '../../types';
import { HK_GOV_SPECS, GOV_DEPTS } from '../../data/hkGovSpecs';
import { detectCalcPassStatus } from '../../utils/limsRules';
import { buildHoklasFieldWorksheetData } from '../../utils/limsProcessTools';
import {
  StructuredCalcPayload,
  getOfficialTemplateMeta,
  triggerCompletedExcelDownload,
  generateSequentialJobRefNo,
  isOfficialJobRefNo,
  toEnglishWorksheetText,
  collectPreviousClientOptions,
} from '../../utils/completedWorksheetGenerator';
import { downloadCalcRecordCsv, formatFileSize, nowTimestamp, readFileAsDataUrl } from '../../utils';
import { FieldSignOffBox } from '../FieldSignOffBox';
import { SitePhotoAttachmentControl } from '../SitePhotoAttachmentControl';
import { HoklasReportPreview } from '../HoklasReportPreview';
import { TestRecordDetailModal } from '../TestRecordDetailModal';
import {
  BookOpen,
  Lightbulb,
  AlertTriangle,
  FileCheck2,
  Copy,
  Landmark,
  Save,
  Download,
  CheckCircle2,
  Printer,
  PenTool,
  FileSpreadsheet,
  Award,
  Hash,
  Trash2,
  ChevronDown,
  Upload,
  FolderOpen,
} from 'lucide-react';

export interface GuideStep {
  title: string;
  detail: string;
}

export const ToolGuideCard: React.FC<{
  stpCode: string;
  standardRef: string;
  formulaText: string;
  steps: GuideStep[];
  pitfalls: string[];
  copyText: string;
  structuredData?: StructuredCalcPayload;
  onViewAllSpecs?: () => void;
}> = ({ stpCode, standardRef, formulaText, steps, pitfalls, copyText, structuredData, onViewAllSpecs }) => {
  const { jobs, equipment, tests, calcRecords, saveCalcRecord, deleteCalcRecord, setStpPreviewCode, pushToast, user } = useApp();
  const { lang, tx } = usePrefs();
  const perms = usePermissions();
  const govSpec = HK_GOV_SPECS.find((s) => s.stpCode === stpCode);
  const templateMeta = getOfficialTemplateMeta(stpCode, tests);
  const [selectedJobNo, setSelectedJobNo] = useState<string>(jobs[0]?.no || 'LT0002');
  const nextSuggestedRef = useMemo(
    () => generateSequentialJobRefNo(selectedJobNo, stpCode, calcRecords),
    [selectedJobNo, stpCode, calcRecords]
  );
  const [jobRefNo, setJobRefNo] = useState<string>(() =>
    generateSequentialJobRefNo(jobs[0]?.no || 'LT0002', stpCode, calcRecords)
  );

  useEffect(() => {
    const cleanPrefix = `${stpCode.trim().toUpperCase()}-`;
    if (!jobRefNo.toUpperCase().startsWith(cleanPrefix) || !isOfficialJobRefNo(jobRefNo)) {
      setJobRefNo(nextSuggestedRef);
    }
  }, [stpCode, nextSuggestedRef]);
  const [clientName, setClientName] = useState<string>('');
  const [worksOrderNo, setWorksOrderNo] = useState<string>('');
  const [batchNo, setBatchNo] = useState<string>('');
  const [sampleId, setSampleId] = useState<string>('');
  const [locationNote, setLocationNote] = useState<string>('');
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [signOffExpanded, setSignOffExpanded] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [signedBy, setSignedBy] = useState<string>('');
  const [signedRole, setSignedRole] = useState<string>('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [sitePhotos, setSitePhotos] = useState<FieldCalcPhoto[]>([]);
  const [worksOrderAttachment, setWorksOrderAttachment] = useState<SharedDocAttachment | undefined>(undefined);
  const [detailModalRecord, setDetailModalRecord] = useState<FieldCalcRecord | null>(null);
  const woFileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewState, setPreviewState] = useState<{
    record: FieldCalcRecord;
    mode: 'worksheet' | 'formal_report';
  } | null>(null);

  const handleAttachWorksOrder = async (file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    const doc: SharedDocAttachment = {
      id: `wo-${Date.now()}`,
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      docType: 'order_form',
      uploadedBy: user?.name || 'Operator',
      uploadedAt: nowTimestamp(),
      serverPath: `Jobs/${selectedJobNo}/${file.name}`,
      dataUrl,
    };
    setWorksOrderAttachment(doc);
    pushToast(tx('已夾附 Works Order 委託單檔案', 'Works Order Form attached'), file.name);
  };

  const passStatus = detectCalcPassStatus(copyText);
  const recentForStp = calcRecords.filter((r) => r.stpCode === stpCode).slice(0, 5);
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

  const handleSelectJob = (nextJobNo: string) => {
    setSelectedJobNo(nextJobNo);
    setJobRefNo(generateSequentialJobRefNo(nextJobNo, stpCode, calcRecords));
  };

  const handleDispatchNewRefNo = () => {
    const nextRef = generateSequentialJobRefNo(selectedJobNo, stpCode, calcRecords);
    setJobRefNo(nextRef);
    const job = jobs.find((j) => j.no === selectedJobNo);
    const rec = saveCalcRecord({
      jobNo: selectedJobNo,
      jobRefNo: nextRef,
      worksOrderNo: worksOrderNo.trim() || undefined,
      clientName: clientName.trim() || undefined,
      batchNo: effectiveBatchNo,
      sampleId: effectiveSampleId,
      projectTitle: job?.project || job?.shortName || selectedJobNo,
      stpCode,
      title: `${stpCode} (${standardRef.split('·')[0].trim()})`,
      locationNote: locationNote.trim() || undefined,
      summary: copyText,
      pass: passStatus,
      signatureDataUrl: signatureDataUrl || undefined,
      signedBy: signedBy.trim() || undefined,
      signedRole: signedRole.trim() || undefined,
      signedAt: signatureDataUrl ? nowTimestamp() : undefined,
      sitePhotos: sitePhotos.length > 0 ? sitePhotos : undefined,
      worksOrderAttachment,
      structuredData,
    });
    setJustSavedId(rec.id);
    setTimeout(() => setJustSavedId(null), 3500);
    pushToast(
      tx(`🎯 已派發新 Job Ref. No.: ${nextRef}`, `🎯 Assigned New Job Ref. No.: ${nextRef}`),
      tx(
        `已登記至工程 ${selectedJobNo} · 操作員: ${user?.name || 'Operator'}`,
        `Logged under Project ${selectedJobNo} · Operator: ${user?.name || 'Operator'}`
      )
    );
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(copyText);
    pushToast(
      tx('已複製計算結果', 'Calculation Copied'),
      tx('可直接貼上至報告或 Worksheet', 'Ready to paste into report or Worksheet')
    );
  };

  const buildCurrentDraftRecord = (): FieldCalcRecord => {
    const job = jobs.find((j) => j.no === selectedJobNo);
    const activeRefNo =
      jobRefNo.trim() || generateSequentialJobRefNo(selectedJobNo, stpCode, calcRecords);
    return {
      id: `${stpCode}-${Date.now().toString().slice(-4)}`,
      jobNo: selectedJobNo,
      jobRefNo: activeRefNo,
      worksOrderNo: worksOrderNo.trim() || undefined,
      clientName: clientName.trim() || undefined,
      batchNo: effectiveBatchNo,
      sampleId: effectiveSampleId,
      projectTitle: job?.project || job?.shortName || selectedJobNo,
      stpCode,
      title: `${stpCode} (${standardRef.split('·')[0].trim()})`,
      locationNote: locationNote.trim() || undefined,
      summary: copyText,
      pass: passStatus,
      testedAt: nowTimestamp(),
      operatorName: toEnglishWorksheetText(user?.name || 'Operator', 'Operator'),
      signatureDataUrl: signatureDataUrl || undefined,
      signedBy: signedBy.trim() || undefined,
      signedRole: signedRole.trim() || undefined,
      signedAt: signatureDataUrl ? nowTimestamp() : undefined,
      sitePhotos: sitePhotos.length > 0 ? sitePhotos : undefined,
      worksOrderAttachment,
      structuredData,
    };
  };

  const handleSaveToJob = () => {
    const job = jobs.find((j) => j.no === selectedJobNo);
    const activeRefNo =
      jobRefNo.trim() || generateSequentialJobRefNo(selectedJobNo, stpCode, calcRecords);
    setJobRefNo(activeRefNo);
    const rec = saveCalcRecord({
      jobNo: selectedJobNo,
      jobRefNo: activeRefNo,
      worksOrderNo: worksOrderNo.trim() || undefined,
      clientName: clientName.trim() || undefined,
      batchNo: effectiveBatchNo,
      sampleId: effectiveSampleId,
      projectTitle: job?.project || job?.shortName || selectedJobNo,
      stpCode,
      title: `${stpCode} (${standardRef.split('·')[0].trim()})`,
      locationNote: locationNote.trim() || undefined,
      summary: copyText,
      pass: passStatus,
      signatureDataUrl: signatureDataUrl || undefined,
      signedBy: signedBy.trim() || undefined,
      signedRole: signedRole.trim() || undefined,
      signedAt: signatureDataUrl ? nowTimestamp() : undefined,
      sitePhotos: sitePhotos.length > 0 ? sitePhotos : undefined,
      worksOrderAttachment,
      structuredData,
    });
    setJustSavedId(rec.id);
    setTimeout(() => setJustSavedId(null), 3500);
    return rec;
  };

  const handleExportCsv = () => {
    const job = jobs.find((j) => j.no === selectedJobNo);
    downloadCalcRecordCsv(buildCurrentDraftRecord(), job);
    pushToast(
      tx('已匯出 HOKLAS 現場計算紀錄 CSV', 'HOKLAS Field Calc CSV Exported'),
      `${selectedJobNo} · ${stpCode}`
    );
  };

  const handleDirectGenExcel = () => {
    const savedRec = handleSaveToJob();
    const job = jobs.find((j) => j.no === selectedJobNo) || null;
    const ws = buildHoklasFieldWorksheetData({
      record: savedRec,
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
      record: savedRec,
    });
    pushToast(
      tx('已按官方 Excel 底板產生 Completed Worksheet (.xlsx)', 'Generated Official Completed Excel Worksheet (.xlsx)'),
      `${downloadedName} (Ref: ${ws.jobRefNo})`
    );
  };

  const handleOpenPreview = (mode: 'worksheet' | 'formal_report') => {
    const savedRec = handleSaveToJob();
    setPreviewState({ record: savedRec, mode });
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-slate-50/70 p-4 sm:p-5 space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand text-white"><FileSpreadsheet className="h-4 w-4" /></span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              {tx('📋 Step 2 · 編號編配及報告生成', '📋 Step 2 · Job Ref. & Worksheet / Report Generator')}
            </h3>
            <p className="text-[11px] text-slate-500">{tx(`測試標準：${standardRef}`, `Standard: ${standardRef}`)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleCopy} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 font-bold text-white hover:bg-slate-800 cursor-pointer">
            <Copy className="h-3.5 w-3.5" /> {tx('複製結果', 'Copy Result')}
          </button>
          <button type="button" onClick={() => setStpPreviewCode(stpCode)} className="inline-flex items-center gap-1.5 rounded-xl border border-brand/40 bg-white px-3 py-2 font-extrabold text-brand-deep hover:bg-brand-wash cursor-pointer">
            <FileCheck2 className="h-3.5 w-3.5" /> {tx(`檢視 ${stpCode} STP`, `Open ${stpCode} STP`)}
          </button>
        </div>
      </div>

      {/* Save Calculation Result to Site Job Record, Attach 1-2 Site Photos, Field Sign-off & Generate Completed Worksheet / Formal Report */}
      <div className="rounded-2xl border border-brand/30 bg-white p-3.5 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
            <Save className="h-4 w-4 text-brand" />
            {tx('儲存計算紀錄、Completed Worksheet 及 HOKLAS 正式報告', 'Save Calc, Completed Worksheet & Formal Report')}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSignOffExpanded(!signOffExpanded)}
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-extrabold transition cursor-pointer ${
                signOffExpanded || signatureDataUrl
                  ? 'border-brand bg-brand-wash text-brand-deep'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <PenTool className="h-3 w-3" />
              {tx('現場監工簽署板', 'Witness Sign-off Pad')}
              {(signatureDataUrl || sitePhotos.length > 0) && (
                <span className="ml-0.5 rounded bg-brand px-1 text-[9px] text-white">
                  {[signatureDataUrl ? '已簽' : '', sitePhotos.length ? `${sitePhotos.length}圖` : ''].filter(Boolean).join('+')}
                </span>
              )}
            </button>
            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${passStatus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {passStatus ? 'PASS 合規' : 'REVIEW 需覆核'}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
          <span className="font-bold text-emerald-950">
            📋 {tx('對應受控工作紙 PDF：', 'Controlled Worksheet PDF: ')}
            <code className="font-mono font-extrabold text-emerald-800">{templateMeta.templateFileCode.replace(/\.xlsx?$/i, '.pdf')}</code>
          </span>
          <span className="font-mono text-[10px] font-bold text-emerald-700">
            {templateMeta.muRefCode}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-slate-600">{tx('1. 選擇所屬工程', '1. Select Project / Site')}</label>
            <select
              aria-label="Select Site Job No"
              value={selectedJobNo}
              onChange={(e) => handleSelectJob(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-bold text-slate-900"
            >
              {jobs.map((j) => (
                <option key={j.no} value={j.no}>
                  {j.no} · {j.companyProjNo} ({j.shortName})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
              <span>{tx('2. Job Reference No. (每次測試編號)', '2. Job Reference No. (Assigned per Test)')}</span>
              <button
                type="button"
                onClick={handleDispatchNewRefNo}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-0.5 text-[10px] font-extrabold text-white hover:bg-indigo-700 cursor-pointer"
              >
                <Hash className="h-2.5 w-2.5" />
                {tx('🎯 編配新 Ref. No.', '🎯 Assign New Ref. No.')}
              </button>
            </label>
            <input
              value={jobRefNo}
              onChange={(e) => setJobRefNo(e.target.value)}
              placeholder={`e.g. ${nextSuggestedRef}`}
              className="mt-1 w-full rounded-xl border border-indigo-300 bg-indigo-50/40 px-2.5 py-1.5 font-mono font-extrabold text-indigo-950"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-600">
              {tx('3. Client 客戶名稱 (手動輸入或從下拉選單選擇歷史客戶)', '3. Client Name (Manual Input or Select Previous Client)')}
            </label>
            <div className="mt-1 grid grid-cols-1 sm:grid-cols-12 gap-1.5">
              <input
                list={`prev-clients-${stpCode}`}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Type Client Name manually (e.g. CEDD / Gammon Construction Ltd.)"
                className="sm:col-span-7 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-900 focus:border-brand outline-none"
              />
              <datalist id={`prev-clients-${stpCode}`}>
                {previousClients.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <select
                aria-label="Select Previous Client"
                value=""
                onChange={(e) => {
                  if (e.target.value) setClientName(e.target.value);
                }}
                className="sm:col-span-5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 font-bold text-slate-800 cursor-pointer"
              >
                <option value="">{tx('📂 選擇歷史客戶...', '📂 Select Previous Client...')}</option>
                {previousClients.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
              <span>{tx('4. Works Order No. (手動輸入)', '4. Works Order No. (Manual Input)')}</span>
              <input
                ref={woFileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAttachWorksOrder(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => woFileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-lg border border-brand/30 bg-brand-wash/60 px-2 py-0.5 text-[10px] font-extrabold text-brand-deep hover:bg-brand-wash cursor-pointer"
              >
                <Upload className="h-2.5 w-2.5" />
                {worksOrderAttachment
                  ? tx(`✓ 已夾附 (${worksOrderAttachment.fileName.slice(0, 12)}...)`, '✓ Attached')
                  : tx('📎 夾附委託單檔案', '📎 Attach Order Form')}
              </button>
            </label>
            <input
              value={worksOrderNo}
              onChange={(e) => setWorksOrderNo(e.target.value)}
              placeholder="e.g. WO/2026/11/018 (Manual Input)"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:border-brand outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600">{tx('5. 測試位置 / 樁號', '5. Test Location / Pile Ref')}</label>
            <input
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder="e.g. Pile P12 / Batch #4 / BH08"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-900 focus:border-brand outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600">{tx('6. Batch No. (手動輸入)', '6. Batch No. (Manual Input)')}</label>
            <input
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
              placeholder="Manual Batch No. (e.g. B-01)"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:border-brand outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600">{tx('7. Sample Identification No. (手動輸入)', '7. Sample Identification No. (Manual Input)')}</label>
            <input
              value={sampleId}
              onChange={(e) => setSampleId(e.target.value)}
              placeholder="Manual Sample ID (e.g. GS-01)"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:border-brand outline-none"
            />
          </div>
        </div>

        {/* Always-visible 1-2 Site Photo Attachment */}
        <SitePhotoAttachmentControl
          stpCode={stpCode}
          jobNo={selectedJobNo}
          sitePhotos={sitePhotos}
          onChangePhotos={setSitePhotos}
        />

        {signOffExpanded && (
          <FieldSignOffBox
            stpCode={stpCode}
            jobNo={selectedJobNo}
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

        {/* Primary Action Row: Save to Site + Gen Completed Excel (.xls) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleSaveToJob}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 py-2.5 font-extrabold text-white hover:bg-brand-deep transition cursor-pointer whitespace-nowrap"
          >
            {justSavedId ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {justSavedId
              ? tx(`已存入 ${selectedJobNo} (${justSavedId})`, `Saved to ${selectedJobNo} (${justSavedId})`)
              : tx(`💾 儲存至地盤 ${selectedJobNo}`, `💾 Save to Site ${selectedJobNo}`)}
          </button>
          <button
            type="button"
            onClick={handleDirectGenExcel}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 font-extrabold text-white hover:bg-emerald-700 transition cursor-pointer whitespace-nowrap shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {tx(
              `📊 一鍵匯出官方 Excel (.xlsx · ${templateMeta.templateFileCode.split('_')[0]})`,
              `📊 Gen Official Excel (.xlsx · ${templateMeta.templateFileCode.split('_')[0]})`
            )}
          </button>
        </div>

        {/* Secondary Action Row: Completed Worksheet (A4) + Formal Report (A4) + CSV */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenPreview('worksheet')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 font-extrabold text-white hover:bg-slate-800 transition cursor-pointer whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" />
            {tx(
              `📋 官方工作紙 (${templateMeta.templateFileCode.split('_')[0]})`,
              `📋 Official Worksheet (${templateMeta.templateFileCode.split('_')[0]})`
            )}
          </button>
          <button
            type="button"
            onClick={() => handleOpenPreview('formal_report')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/80 bg-amber-50 px-3 py-2 font-extrabold text-amber-950 hover:bg-amber-100 transition cursor-pointer whitespace-nowrap"
          >
            <Award className="h-3.5 w-3.5 text-amber-700" />
            {tx('📜 HOKLAS 正式報告 (A4)', '📜 Formal Report (A4)')}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 font-extrabold text-slate-700 hover:border-brand hover:text-brand transition cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>

        {recentForStp.length > 0 && (
          <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              <span>
                {tx(
                  `📋 已派發 Job Ref. No. 及測試工程紀錄表`,
                  `📋 Dispatched Job Ref. No. & Project Registry (${recentForStp.length})`
                )}
              </span>
              <span className="text-brand-deep normal-case">
                {tx('點擊任何紀錄列彈出完整結果及夾附文件視窗', 'Click any row to open full result & bundled files')}
              </span>
            </div>
            {recentForStp.map((r) => {
              const matchedJob = jobs.find((j) => j.no === r.jobNo);
              return (
                <div
                  key={r.id}
                  onClick={() => setDetailModalRecord(r)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 text-[11px] hover:border-brand/50 hover:bg-brand-wash/25 transition cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-800">
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono font-extrabold text-indigo-950 mr-1.5">
                        {r.jobRefNo || r.id}
                      </span>
                      <b className="font-mono text-slate-900">{r.jobNo}</b>
                      <span className="text-slate-600">
                        {' '}· {r.projectTitle || matchedJob?.shortName || r.jobNo}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                      {r.worksOrderNo ? `WO: ${r.worksOrderNo} · ` : ''}
                      {r.locationNote ? `Loc: ${r.locationNote} · ` : ''}
                      Op: {r.operatorName} ({r.testedAt.slice(5)})
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setDetailModalRecord(r)}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-2 py-0.5 font-extrabold text-brand-deep hover:bg-brand hover:text-white cursor-pointer"
                    >
                      <FolderOpen className="h-3 w-3" /> {tx('檢視結果及附件', 'Dossier')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewState({ record: r, mode: 'worksheet' })}
                      className="font-extrabold text-slate-700 hover:underline cursor-pointer"
                    >
                      Worksheet
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewState({ record: r, mode: 'formal_report' })}
                      className="font-extrabold text-amber-800 hover:underline cursor-pointer"
                    >
                      Report
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteCalcRecord(r.id);
                        pushToast(
                          tx(`🗑️ 已刪除 ${r.jobRefNo || r.id}`, `🗑️ Deleted ${r.jobRefNo || r.id}`),
                          `${r.jobNo} · ${r.stpCode}`
                        );
                      }}
                      className="rounded p-1 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete Record" hidden={!perms.canDeleteRecords}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <TestRecordDetailModal record={detailModalRecord} onClose={() => setDetailModalRecord(null)} />
      {previewState && (
        <HoklasReportPreview
          record={previewState.record}
          structuredData={previewState.record.structuredData || structuredData}
          initialDocMode={previewState.mode}
          onClose={() => setPreviewState(null)}
        />
      )}

      {/* Collapsible Procedure, Formula & Gov Specs Drawer to keep UI clean */}
      <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex w-full items-center justify-between px-4 py-3 text-left font-extrabold text-slate-800 hover:bg-slate-50 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand" />
            {tx('📐 展開公式、測試步驟及部門驗收標準', '📐 Formula, Procedure & HK Dept Specs')}
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-500 transition ${showGuide ? 'rotate-180' : ''}`} />
        </button>

        {showGuide && (
          <div className="border-t border-slate-100 p-3.5 space-y-3 bg-slate-50/50">
            <div className="rounded-xl border border-brand/20 bg-white px-3 py-2 font-mono text-xs font-bold text-brand-deep">
              📐 Formula: {formulaText}
            </div>

            {govSpec && (
              <div className="rounded-xl border border-indigo-200/80 bg-white p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                    <Landmark className="h-4 w-4 text-indigo-600" />
                    <span>{tx('各部門驗收要求 (CEDD · ASD · Housing · BD)', 'HK Dept Requirements (CEDD · ASD · Housing · BD)')}</span>
                  </div>
                  {onViewAllSpecs && (
                    <button type="button" onClick={onViewAllSpecs} className="text-[11px] font-extrabold text-indigo-700 hover:underline cursor-pointer">
                      {tx('完整要求總表 →', 'All Specs Table →')}
                    </button>
                  )}
                </div>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 overflow-hidden">
                  {GOV_DEPTS.map((d) => {
                    const req = govSpec.depts[d.id];
                    const items = (lang === 'en' ? req.criteriaEn : req.criteriaZh).split('\n');
                    return (
                      <div key={d.id} className="flex items-start gap-2.5 bg-slate-50/50 px-2.5 py-2">
                        <span className={`w-16 shrink-0 text-center rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold ${d.badgeCls}`}>{d.short}</span>
                        <div className="text-[11px] font-semibold text-slate-800 leading-snug">{items.join(' ； ')}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2.5">
              <div className="rounded-xl bg-white p-3 border border-slate-200/75 space-y-2">
                <div className="flex items-center gap-1.5 font-extrabold text-slate-900"><Lightbulb className="h-4 w-4 text-amber-500" /> {tx('標準測試步驟', 'Test Procedure Steps')}</div>
                <ol className="space-y-1.5">
                  {steps.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-wash font-mono text-[11px] font-extrabold text-brand-deep">{idx + 1}</span>
                      <div><span className="font-extrabold text-slate-900">{s.title}: </span><span className="text-slate-600">{s.detail}</span></div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-xl bg-amber-50/70 p-3 border border-amber-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 font-extrabold text-amber-900"><AlertTriangle className="h-4 w-4 text-amber-600" /> {tx('HOKLAS 評審及操作重點', 'HOKLAS Audit & Precautions')}</div>
                <ul className="space-y-1 text-amber-950/85 leading-relaxed">
                  {pitfalls.map((p, idx) => (
                    <li key={idx} className="flex items-start gap-1.5"><span className="font-bold text-amber-600">•</span><span>{p}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
