import React, { useState } from 'react';
import { useApp } from '../../store';
import { usePrefs } from '../../prefs';
import { FieldCalcPhoto, FieldCalcRecord } from '../../types';
import { HK_GOV_SPECS, GOV_DEPTS } from '../../data/hkGovSpecs';
import { detectCalcPassStatus } from '../../utils/limsRules';
import { buildHoklasFieldWorksheetData } from '../../utils/limsProcessTools';
import {
  StructuredCalcPayload,
  getOfficialTemplateMeta,
  triggerCompletedExcelDownload,
} from '../../utils/completedWorksheetGenerator';
import { downloadCalcRecordCsv, nowTimestamp } from '../../utils';
import { FieldSignOffBox } from '../FieldSignOffBox';
import { SitePhotoAttachmentControl } from '../SitePhotoAttachmentControl';
import { HoklasReportPreview } from '../HoklasReportPreview';
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
  const { jobs, equipment, tests, calcRecords, saveCalcRecord, setStpPreviewCode, pushToast, user } = useApp();
  const { lang, tx } = usePrefs();
  const govSpec = HK_GOV_SPECS.find((s) => s.stpCode === stpCode);
  const templateMeta = getOfficialTemplateMeta(stpCode, tests);
  const [selectedJobNo, setSelectedJobNo] = useState<string>(jobs[0]?.no || 'LT0002');
  const [locationNote, setLocationNote] = useState<string>('');
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [signOffExpanded, setSignOffExpanded] = useState<boolean>(false);
  const [signedBy, setSignedBy] = useState<string>('');
  const [signedRole, setSignedRole] = useState<string>('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [sitePhotos, setSitePhotos] = useState<FieldCalcPhoto[]>([]);
  const [previewState, setPreviewState] = useState<{
    record: FieldCalcRecord;
    mode: 'worksheet' | 'formal_report';
  } | null>(null);

  const passStatus = detectCalcPassStatus(copyText);
  const recentForStp = calcRecords.filter((r) => r.stpCode === stpCode).slice(0, 3);

  const handleCopy = () => {
    navigator.clipboard?.writeText(copyText);
    pushToast(
      tx('已複製計算結果', 'Calculation Copied'),
      tx('可直接貼上至報告或 Worksheet', 'Ready to paste into report or Worksheet')
    );
  };

  const buildCurrentDraftRecord = (): FieldCalcRecord => ({
    id: `${stpCode}-${Date.now().toString().slice(-4)}`,
    jobNo: selectedJobNo,
    stpCode,
    title: `${stpCode} (${standardRef.split('·')[0].trim()})`,
    locationNote: locationNote.trim() || undefined,
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

  const handleSaveToJob = () => {
    const rec = saveCalcRecord({
      jobNo: selectedJobNo,
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
      structuredData,
    });
    setJustSavedId(rec.id);
    setTimeout(() => setJustSavedId(null), 3500);
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
    const draft = buildCurrentDraftRecord();
    const job = jobs.find((j) => j.no === selectedJobNo) || null;
    const ws = buildHoklasFieldWorksheetData({
      record: draft,
      job,
      equipment,
      tests,
    });
    const downloadedName = triggerCompletedExcelDownload({
      stpCode,
      reportRefNo: ws.reportRefNo,
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
      tx('已按官方 Excel 底板產生 Completed Worksheet (.xlsx)', 'Generated Official Completed Excel Worksheet (.xlsx)'),
      `${downloadedName} (${templateMeta.templateFileCode})`
    );
  };

  const handleOpenPreview = (mode: 'worksheet' | 'formal_report') => {
    setPreviewState({ record: buildCurrentDraftRecord(), mode });
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-slate-50/70 p-4 sm:p-5 space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand text-white"><BookOpen className="h-4 w-4" /></span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              {tx('📖 操作指南及驗收要求 (Guide & Requirements)', '📖 Field Guide & Spec Requirements')}
            </h3>
            <p className="text-[11px] text-slate-500">{tx(`參考標準：${standardRef}`, `Reference Standard: ${standardRef}`)}</p>
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
            {tx('儲存計算紀錄、Completed Worksheet (.xls) & HOKLAS 正式報告', 'Save Calc, Completed Worksheet (.xls) & Formal Report')}
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
            📋 {tx('對應上載 Excel 底板：', 'Mapped Excel Template: ')}
            <code className="font-mono font-extrabold text-emerald-800">{templateMeta.templateFileCode}</code>
          </span>
          <span className="font-mono text-[10px] font-bold text-emerald-700">
            {templateMeta.muRefCode}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-slate-600">{tx('選擇工程地盤 (Job No.)', 'Select Site (Job No.)')}</label>
            <select
              aria-label="Select Site Job No"
              value={selectedJobNo}
              onChange={(e) => setSelectedJobNo(e.target.value)}
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
            <label className="text-[11px] font-bold text-slate-600">{tx('樁號 / 樣本編號 (選填)', 'Pile / Sample Ref (Optional)')}</label>
            <input
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder={tx('如：P12 / Trial Batch #4 / BH08', 'e.g. Pile P12 / Batch #4 / BH08')}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-900"
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
          <div className="border-t border-slate-100 pt-2 space-y-1">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {tx(`最近已儲存之 ${stpCode} 現場紀錄 (${recentForStp.length})`, `Recent Saved ${stpCode} Logs (${recentForStp.length})`)}
            </div>
            {recentForStp.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px]">
                <span className="truncate font-semibold text-slate-700">
                  <b className="font-mono text-slate-900">{r.jobNo}</b> · {r.locationNote || r.id} ({r.testedAt.slice(5)})
                  {r.signatureDataUrl ? ' · ✍️已簽' : ''}
                  {r.sitePhotos?.length ? ` · 📷${r.sitePhotos.length}圖` : ''}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewState({ record: r, mode: 'worksheet' })}
                    className="font-extrabold text-brand-deep hover:underline cursor-pointer"
                  >
                    {tx('📋 工作紙', '📋 Worksheet')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewState({ record: r, mode: 'formal_report' })}
                    className="font-extrabold text-amber-800 hover:underline cursor-pointer"
                  >
                    {tx('📜 正式報告', '📜 Report')}
                  </button>
                  <span className={`font-mono text-[10px] font-extrabold ${r.pass ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {r.pass ? '✓ PASS' : '⚠ REVIEW'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {previewState && (
        <HoklasReportPreview
          record={previewState.record}
          structuredData={previewState.record.structuredData || structuredData}
          initialDocMode={previewState.mode}
          onClose={() => setPreviewState(null)}
        />
      )}

      <div className="rounded-2xl border border-brand/20 bg-white px-3.5 py-2.5 font-mono text-xs font-bold text-brand-deep">
        📐 {tx('計算公式：', 'Formula: ')}{formulaText}
      </div>

      {govSpec && (
        <div className="rounded-2xl border border-indigo-200/80 bg-white p-3.5 space-y-2">
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
        <div className="rounded-2xl bg-white p-3.5 border border-slate-200/75 space-y-2.5">
          <div className="flex items-center gap-1.5 font-extrabold text-slate-900"><Lightbulb className="h-4 w-4 text-amber-500" /> {tx('標準操作步驟 (Procedure)', 'Field Procedure Steps')}</div>
          <ol className="space-y-2">
            {steps.map((s, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-wash font-mono text-[11px] font-extrabold text-brand-deep">{idx + 1}</span>
                <div><span className="font-extrabold text-slate-900">{s.title}: </span><span className="text-slate-600">{s.detail}</span></div>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200/80 space-y-2">
          <div className="flex items-center gap-1.5 font-extrabold text-amber-900"><AlertTriangle className="h-4 w-4 text-amber-600" /> {tx('注意事項及 HOKLAS 評審重點', 'Key Precautions & HOKLAS Audit Notes')}</div>
          <ul className="space-y-1.5 text-amber-950/85 leading-relaxed">
            {pitfalls.map((p, idx) => (
              <li key={idx} className="flex items-start gap-1.5"><span className="font-bold text-amber-600">•</span><span>{p}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
