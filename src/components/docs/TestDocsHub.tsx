import React, { useMemo, useState } from 'react';
import { useApp } from '../../store';
import { usePrefs } from '../../prefs';
import { usePermissions } from '../../permissions';
import { TestMethodItem } from '../../types';
import { getEquipmentCalStatus } from '../../utils';
import { resolveDocLink } from '../../driveDocs';
import { getOfficialTemplateMeta } from '../../utils/completedWorksheetGenerator';
import {
  SERVER_QUALITY_DOCS,
  FORMAL_REPORT_PDF_URLS,
  ServerQualityDoc,
} from '../../data/serverDocsCatalog';
import { HoklasReportPreview } from '../HoklasReportPreview';
import { SharedDocUploadBox } from '../SharedDocUploadBox';
import { CalCertUploadBox } from '../CalCertUploadBox';
import type { CalcToolId } from '../../pages/ToolsPage';
import {
  ArrowLeft,
  Eye,
  Download,
  Calculator,
  ChevronRight,
  ChevronDown,
  Search,
  FileText,
  UploadCloud,
  ShieldCheck,
  Printer,
} from 'lucide-react';

const CALC_FOR_TEST: Partial<Record<string, CalcToolId>> = {
  BL: 'bleeding',
  FC: 'flowcone',
  KD: 'koden',
  SO: 'sonic',
  PLT: 'plt',
  PO: 'pointload',
  VC: 'inclinometer',
};

const cleanZh = (s: string) => s.replace(/\s*[（(][^()（）]*[)）]\s*$/, '').trim();

const docMatchesTest = (d: ServerQualityDoc, code: string) =>
  !!d.testCode && d.testCode.split('+').map((s) => s.trim().toUpperCase()).includes(code.toUpperCase());

function getPdfFileName(url: string, fallbackCode: string): string {
  const raw = url.split('?')[0].split('/').pop() || `${fallbackCode}.pdf`;
  return raw.replace(/\.(xlsx?|docx?)$/i, '.pdf');
}

function resolvePdfUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  const resolved = resolveDocLink(rawUrl);
  return resolved.pdfCompanionUrl || resolved.downloadUrl || rawUrl;
}

function countTestPdfDocs(test: TestMethodItem): number {
  const urls = new Set<string>();
  const add = (u?: string) => {
    const pdf = resolvePdfUrl(u);
    if (pdf) urls.add(pdf);
  };
  add(test.stpPdfUrl);
  add(FORMAL_REPORT_PDF_URLS[test.code]);
  add(test.worksheetPdfUrl || test.worksheetUrl);
  add(test.orderFormUrl);
  add(test.dailyRecordUrl);
  add(test.muTemplateUrl);
  SERVER_QUALITY_DOCS.forEach((d) => {
    if (docMatchesTest(d, test.code)) add(d.localPath || d.url);
  });
  return urls.size;
}

const DocRow: React.FC<{
  label: string;
  code?: string;
  pdfUrl?: string;
  fileName?: string;
  onPreview?: () => void;
  extraAction?: React.ReactNode;
  missing?: string;
}> = ({ label, code, pdfUrl, fileName, onPreview, extraAction, missing }) => {
  const { tx } = usePrefs();
  const btnBase =
    'min-h-[44px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 sm:py-1.5 text-xs font-extrabold transition cursor-pointer';
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-extrabold text-slate-900">{label}</span>
          {pdfUrl && (
            <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-emerald-700">
              PDF
            </span>
          )}
        </div>
        {code && <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{code}</div>}
      </div>
      {missing ? (
        <span className="text-xs text-slate-400">{missing}</span>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className={`${btnBase} flex-1 sm:flex-none bg-brand-wash text-brand-deep hover:bg-brand hover:text-white`}
            >
              <Eye className="h-3.5 w-3.5 shrink-0" /> {tx('預覽 PDF', 'Preview PDF')}
            </button>
          )}
          {pdfUrl && (
            <a
              href={pdfUrl}
              download={fileName || getPdfFileName(pdfUrl, 'LabTech_Document')}
              className={`${btnBase} flex-1 sm:flex-none border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
            >
              <Download className="h-3.5 w-3.5 shrink-0" /> {tx('下載 PDF', 'Download PDF')}
            </a>
          )}
          {extraAction}
        </div>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; badge?: string; children: React.ReactNode }> = ({ title, badge, children }) => (
  <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 shadow-xs">
    <div className="flex items-center justify-between gap-2 pt-1.5 pb-1">
      <span className="text-[11px] font-extrabold tracking-wide text-slate-500">{title}</span>
      {badge && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
          {badge}
        </span>
      )}
    </div>
    <div className="divide-y divide-slate-100">{children}</div>
  </div>
);

const Collapsible: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex min-h-[48px] w-full items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50/70 rounded-2xl transition cursor-pointer"
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-slate-100 px-4 py-3.5 text-xs text-slate-700">{children}</div>}
    </div>
  );
};

const TestDetail: React.FC<{
  test: TestMethodItem;
  onBack: () => void;
  onStartCalc?: (id: CalcToolId) => void;
}> = ({ test, onBack, onStartCalc }) => {
  const { tests, equipment, jobs, openPreviewDoc, uploadStpDocFile, uploadStpCalCert, pushToast } = useApp();
  const { lang, tx } = usePrefs();
  const perms = usePermissions();
  const [reportPreview, setReportPreview] = useState(false);
  const meta = getOfficialTemplateMeta(test.code, tests);
  const calcId = CALC_FOR_TEST[test.code];

  const docTitle = (d: ServerQualityDoc) => (lang === 'en' ? d.titleEn : cleanZh(d.titleZh));

  const orderForm = SERVER_QUALITY_DOCS.find((d) => d.category === 'order_form' && docMatchesTest(d, test.code));
  const dailyRecord = SERVER_QUALITY_DOCS.find((d) => d.category === 'daily_record' && docMatchesTest(d, test.code));
  const muDoc = SERVER_QUALITY_DOCS.find((d) => d.category === 'mu' && docMatchesTest(d, test.code));

  const stpPdf = resolvePdfUrl(test.stpPdfUrl);
  const reportPdf = resolvePdfUrl(FORMAL_REPORT_PDF_URLS[test.code] || meta.formalReportFileUrl);
  const worksheetPdf = resolvePdfUrl(test.worksheetPdfUrl || test.worksheetUrl);
  const orderFormPdf = resolvePdfUrl(orderForm?.localPath || orderForm?.url || test.orderFormUrl);
  const dailyRecordPdf = resolvePdfUrl(dailyRecord?.localPath || dailyRecord?.url || test.dailyRecordUrl);
  const muPdf = resolvePdfUrl(muDoc?.localPath || muDoc?.url || test.muTemplateUrl);

  const extraTestDocs = useMemo(() => {
    const shownUrls = new Set<string>(
      [stpPdf, reportPdf, worksheetPdf, orderFormPdf, dailyRecordPdf, muPdf].filter(Boolean) as string[]
    );
    return SERVER_QUALITY_DOCS.filter((d) => {
      if (!docMatchesTest(d, test.code)) return false;
      const u = resolvePdfUrl(d.localPath || d.url);
      if (!u || shownUrls.has(u)) return false;
      shownUrls.add(u);
      return true;
    });
  }, [test.code, stpPdf, reportPdf, worksheetPdf, orderFormPdf, dailyRecordPdf, muPdf]);

  const fieldUploadedDocs = useMemo(
    () =>
      (test.stpFiles || []).filter(
        (f) => f.dataUrl && !f.dataUrl.startsWith('/server-docs/')
      ),
    [test.stpFiles]
  );

  const handleFieldRecordUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(ev.target.files || []);
    if (files.length === 0) return;
    const docType = tx('現場完成紀錄 / 相片', 'Completed Field Record / Photo');
    await Promise.all(
      files.map(
        (file) =>
          new Promise<void>((resolve) => {
            const fileSize = `${Math.max(1, Math.round(file.size / 1024))} KB`;
            const reader = new FileReader();
            reader.onload = () => {
              uploadStpDocFile(test.code, {
                fileName: file.name,
                fileSize,
                docType,
                dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
              });
              resolve();
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(file);
          })
      )
    );
    pushToast(
      tx('已上傳現場紀錄或相片', 'Uploaded field record / photo'),
      files.map((f) => f.name).join(', ')
    );
    ev.target.value = '';
  };

  const linkedEquipment = useMemo(
    () =>
      equipment
        .filter((e) => e.inUse !== 'N')
        .filter((e) => (e.testTags || e.tests.split('+').map((s) => s.trim())).includes(test.code))
        .map((e) => ({ eq: e, cal: getEquipmentCalStatus(e, undefined, lang) })),
    [equipment, test.code, lang]
  );
  const eqAlerts = linkedEquipment.filter((x) => x.cal.kind === 'bad' || x.cal.kind === 'warn').length;
  const totalPdfCount = countTestPdfDocs(test);

  return (
    <div className="space-y-3.5">
      <button
        type="button"
        onClick={onBack}
        className="min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 transition cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> {tx('返回全部測試', 'All tests')}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-900 px-2.5 py-0.5 font-mono text-xs font-extrabold text-white">
              {test.code}
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">{test.short}</h1>
            {test.acc ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> HOKLAS 298
              </span>
            ) : (
              <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-extrabold text-amber-700">
                {tx('籌備認證', 'Pending HOKLAS')}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-wash px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-brand-deep">
              <FileText className="h-3 w-3" /> {totalPdfCount} PDF
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {test.name} · {test.std} · {test.stpDocCode} {test.stpRev} · {tx('生效日期', 'Eff')}: {test.stpEffectiveDate}
          </div>
        </div>
        {calcId && onStartCalc && (
          <button
            type="button"
            onClick={() => onStartCalc(calcId)}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white shadow-xs hover:bg-brand-deep active:scale-[0.99] transition cursor-pointer shrink-0"
          >
            <Calculator className="h-4 w-4" /> {tx(`開始計算 ${test.short}`, `Start ${test.short} Calc`)}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Section title={tx('受控程序及正式報告範本', 'Procedure & Formal Report')} badge="PDF">
          <DocRow
            label={
              test.code === 'VC'
                ? tx('HOKLAS 垂直度認證範疇及程序大綱', 'HOKLAS-5 Verticality Scope & Procedure')
                : tx('STP 標準測試程序', 'Standard Test Procedure')
            }
            code={`${test.stpDocCode} · ${test.stpRev} · ${test.stpEffectiveDate}`}
            pdfUrl={stpPdf}
            fileName={stpPdf ? getPdfFileName(stpPdf, test.stpDocCode) : undefined}
            onPreview={
              stpPdf
                ? () =>
                    openPreviewDoc({
                      title: `${test.stpDocCode} ${test.stpRev} — ${test.short}`,
                      url: stpPdf,
                      fileName: getPdfFileName(stpPdf, test.stpDocCode),
                      subtitle: test.std,
                    })
                : undefined
            }
            missing={stpPdf ? undefined : tx('未有 PDF', 'No PDF yet')}
          />
          <DocRow
            label={tx('正式報告空白範本', 'Formal Report Blank Template')}
            code={meta.formalReportFormCode}
            pdfUrl={reportPdf}
            fileName={reportPdf ? getPdfFileName(reportPdf, `${meta.formalReportFormCode}_Report_template`) : undefined}
            onPreview={
              reportPdf
                ? () =>
                    openPreviewDoc({
                      title: `${test.code} — ${meta.formalReportFormCode}`,
                      url: reportPdf,
                      fileName: getPdfFileName(reportPdf, `${meta.formalReportFormCode}_Report_template`),
                      subtitle: `${meta.formalReportTitleZh} · ${meta.testStandard}`,
                    })
                : () => setReportPreview(true)
            }
            extraAction={
              <button
                type="button"
                onClick={() => setReportPreview(true)}
                className="min-h-[44px] sm:min-h-[36px] inline-flex items-center justify-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                title={tx('互動 A4 報告排版預覽', 'Interactive A4 Layout Preview')}
              >
                <Printer className="h-3.5 w-3.5 shrink-0" /> {tx('A4 排版', 'A4 View')}
              </button>
            }
          />
        </Section>

        <Section title={tx('現場工作紙及品質表格', 'Field Worksheet & Quality Forms')} badge="PDF">
          <DocRow
            label={tx('空白現場工作紙 Worksheet', 'Blank Field Worksheet')}
            code={meta.worksheetFormCode}
            pdfUrl={worksheetPdf}
            fileName={worksheetPdf ? getPdfFileName(worksheetPdf, meta.worksheetFormCode) : undefined}
            onPreview={
              worksheetPdf
                ? () =>
                    openPreviewDoc({
                      title: `${test.code} — ${meta.worksheetFormCode}`,
                      url: worksheetPdf,
                      fileName: getPdfFileName(worksheetPdf, meta.worksheetFormCode),
                      subtitle: `${meta.templateTitleZh} · ${meta.testStandard}`,
                    })
                : undefined
            }
          />
          {orderFormPdf && (
            <DocRow
              label={tx('FQS08 測試委託單', 'FQS08 Test Order Form')}
              code={orderForm ? `${orderForm.code} · ${orderForm.revDate}` : 'FQS08'}
              pdfUrl={orderFormPdf}
              fileName={getPdfFileName(orderFormPdf, orderForm?.code || `${test.code}_FQS08`)}
              onPreview={() =>
                openPreviewDoc({
                  title: `${orderForm?.code || 'FQS08'} — ${orderForm ? docTitle(orderForm) : test.short}`,
                  url: orderFormPdf,
                  fileName: getPdfFileName(orderFormPdf, orderForm?.code || `${test.code}_FQS08`),
                })
              }
            />
          )}
          {dailyRecordPdf && (
            <DocRow
              label={tx('FQS09 現場每日測試紀錄表', 'FQS09 Daily Site Record')}
              code={dailyRecord ? `${dailyRecord.code} · ${dailyRecord.revDate}` : 'FQS09'}
              pdfUrl={dailyRecordPdf}
              fileName={getPdfFileName(dailyRecordPdf, dailyRecord?.code || `${test.code}_FQS09`)}
              onPreview={() =>
                openPreviewDoc({
                  title: `${dailyRecord?.code || 'FQS09'} — ${dailyRecord ? docTitle(dailyRecord) : test.short}`,
                  url: dailyRecordPdf,
                  fileName: getPdfFileName(dailyRecordPdf, dailyRecord?.code || `${test.code}_FQS09`),
                })
              }
            />
          )}
          {muPdf && (
            <DocRow
              label={
                test.code === 'PLT'
                  ? tx('750kPa 反力架結構驗算', '750kPa Setup Structural Check')
                  : tx('MU 測量不確定度評估表', 'Measurement Uncertainty Sheet')
              }
              code={muDoc ? `${muDoc.code} · ${muDoc.revDate}` : `${test.code}-MU`}
              pdfUrl={muPdf}
              fileName={getPdfFileName(muPdf, muDoc?.code || `${test.code}_MU`)}
              onPreview={() =>
                openPreviewDoc({
                  title: `${muDoc?.code || `${test.code} MU`} — ${muDoc ? docTitle(muDoc) : test.short}`,
                  url: muPdf,
                  fileName: getPdfFileName(muPdf, muDoc?.code || `${test.code}_MU`),
                })
              }
            />
          )}
        </Section>

        {extraTestDocs.length > 0 && (
          <Section
            title={tx('專項核查表、認證範疇及工程履歷', 'Verification, Scope & Past Job References')}
            badge={`${extraTestDocs.length} PDF`}
          >
            {extraTestDocs.map((d) => {
              const u = resolvePdfUrl(d.localPath || d.url) || d.url;
              return (
                <DocRow
                  key={d.id}
                  label={docTitle(d)}
                  code={`${d.code} · ${d.revDate}`}
                  pdfUrl={u}
                  fileName={getPdfFileName(u, d.code)}
                  onPreview={() =>
                    openPreviewDoc({
                      title: `${d.code} — ${docTitle(d)}`,
                      url: u,
                      fileName: getPdfFileName(u, d.code),
                      subtitle: `Rev: ${d.revDate} · PDF`,
                    })
                  }
                />
              );
            })}
          </Section>
        )}

        <Section title={tx('出隊必備校準儀器', 'Calibrated Equipment to Bring')}>
          {linkedEquipment.length === 0 ? (
            <div className="py-3 text-xs text-slate-600 leading-relaxed">{test.equipmentTypes.join(' · ')}</div>
          ) : (
            <>
              <div className={`py-2.5 text-sm font-extrabold ${eqAlerts ? 'text-amber-700' : 'text-emerald-700'}`}>
                {eqAlerts
                  ? tx(
                      `共 ${linkedEquipment.length} 件關聯儀器，其中 ${eqAlerts} 件校準需留意`,
                      `${linkedEquipment.length} items, ${eqAlerts} need calibration attention`
                    )
                  : tx(
                      `共 ${linkedEquipment.length} 件關聯儀器，校準全部有效`,
                      `${linkedEquipment.length} items, all calibrations valid`
                    )}
              </div>
              {linkedEquipment.map(({ eq, cal }) => (
                <div key={eq.code} className="flex items-center justify-between gap-2 py-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-slate-800">{eq.code}</span>
                    <span className="ml-2 text-slate-500">{eq.name}</span>
                  </div>
                  <span
                    className={`shrink-0 font-bold ${
                      cal.kind === 'bad'
                        ? 'text-rose-600'
                        : cal.kind === 'warn'
                        ? 'text-amber-600'
                        : cal.kind === 'ok'
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {cal.label}
                  </span>
                </div>
              ))}
            </>
          )}
        </Section>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <div className="text-sm font-extrabold text-slate-900">
              {tx('現場紀錄歸檔', 'Field Record Archiving')}
            </div>
            <div className="text-xs text-slate-500">
              {tx(
                '前線同事完成測試後，可直接拍攝或上傳已簽署工作紙 PDF 及現場測試相片',
                'Frontline operators can directly upload signed worksheet PDFs or site photos'
              )}
            </div>
          </div>
          <label className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white hover:bg-slate-800 active:scale-[0.99] transition cursor-pointer shrink-0">
            <UploadCloud className="h-4 w-4 shrink-0" />
            <span>{tx('上傳已完成紀錄表 / 相片', 'Upload Completed Record / Photo')}</span>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,image/*"
              onChange={handleFieldRecordUpload}
              className="hidden"
            />
          </label>
        </div>

        {fieldUploadedDocs.length > 0 && (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/70 px-3">
            {fieldUploadedDocs.map((f) => (
              <DocRow
                key={f.id}
                label={f.fileName}
                code={`${f.docType || 'Field Record'} · ${f.fileSize} · ${f.uploadedAt}`}
                pdfUrl={f.dataUrl}
                fileName={f.fileName}
                onPreview={
                  f.dataUrl
                    ? () =>
                        openPreviewDoc({
                          title: f.fileName,
                          url: f.dataUrl!,
                          fileName: f.fileName,
                          subtitle: `${f.docType || ''} · ${f.uploadedBy}`,
                        })
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      <Collapsible title={tx('測試檢查要點及 FQS49 合資格人員', 'Key Checkpoints & FQS49 Qualified Personnel')}>
        <ol className="list-decimal space-y-1.5 pl-5 leading-relaxed">
          {test.keyParams.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ol>
        {test.approvedSignatories?.length ? (
          <div className="mt-3">
            <span className="font-bold text-slate-500">{tx('授權簽署人：', 'Approved Signatories: ')}</span>
            {test.approvedSignatories.join(lang === 'en' ? ', ' : '、')}
          </div>
        ) : null}
        {test.qualifiedOperators?.length ? (
          <div className="mt-1">
            <span className="font-bold text-slate-500">{tx('合資格操作員：', 'Qualified Operators: ')}</span>
            {test.qualifiedOperators.join(lang === 'en' ? ', ' : '、')}
          </div>
        ) : null}
      </Collapsible>

      <Collapsible title={tx('受控版本紀錄', 'Controlled Revision History')}>
        <div className="divide-y divide-slate-100">
          {test.versions.map((v) => (
            <div
              key={v.ver}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 ${
                v.status === 'obsolete' ? 'text-slate-400' : ''
              }`}
            >
              <div>
                <span className={`font-mono font-bold ${v.status === 'obsolete' ? 'line-through' : 'text-slate-900'}`}>
                  {v.ver}
                </span>
                {v.note && <div className="text-[11px] text-slate-500">{v.note}</div>}
              </div>
              <span className="font-mono text-xs shrink-0">
                {v.date} · {v.status === 'current' ? tx('現行生效', 'Current') : tx('已封存作廢', 'Obsolete')}
              </span>
            </div>
          ))}
        </div>
      </Collapsible>

      {perms.canManageDocs && (
        <Collapsible title={tx('品質管理：批次管理受控 PDF 及儀器校準證書', 'Quality Admin: Controlled PDFs & Cal Certs')}>
          <div className="space-y-3">
            <SharedDocUploadBox
              title={tx(`${test.code} 受控 PDF 及現場附件`, `${test.code} Controlled PDFs & Attachments`)}
              buttonLabel={tx('上傳已完成紀錄表 / 相片', 'Upload Completed Record / Photo')}
              docTypeOptions={[
                tx('現場完成紀錄 / 相片', 'Completed Field Record / Photo'),
                tx('受控 STP PDF', 'Controlled STP PDF'),
                tx('空白 Worksheet PDF', 'Blank Worksheet PDF'),
                tx('正式報告範本 PDF', 'Formal Report Template PDF'),
                tx('FQS08 委託單 PDF', 'FQS08 Order Form PDF'),
                tx('FQS09 每日紀錄 PDF', 'FQS09 Daily Record PDF'),
              ]}
              docs={test.stpFiles || []}
              onUpload={(doc) => uploadStpDocFile(test.code, doc)}
              onPreviewToast={(fn) => pushToast(tx('已開啟文件', 'Opened file'), fn)}
            />
            <CalCertUploadBox
              title={tx(`${test.code} 關聯儀器校準證書`, `${test.code} Linked Calibration Certificates`)}
              certs={test.calCerts || []}
              eqOptions={linkedEquipment.map(({ eq }) => ({ code: eq.code, name: eq.name }))}
              onUpload={(d) =>
                uploadStpCalCert({
                  stpCode: test.code,
                  fileName: d.fileName,
                  fileSize: d.fileSize,
                  eqCode: d.eqCode,
                  dueDate: d.dueDate,
                  certNo: d.certNo,
                  dataUrl: d.dataUrl,
                })
              }
              onPreviewToast={(fn) => pushToast(tx('已開啟 Cal Cert', 'Opened Cal Cert'), fn)}
            />
          </div>
        </Collapsible>
      )}

      {reportPreview && (
        <HoklasReportPreview
          record={{
            id: `RPT-${test.code}`,
            jobNo: jobs[0]?.no || 'LT0001',
            stpCode: test.code,
            title: `${test.code} Official Formal Report Template`,
            summary: 'Official Formal Report Template Preview',
            pass: true,
            testedAt: '2026-11-08 09:00',
            operatorName: 'Operator',
          }}
          job={jobs[0] || null}
          initialDocMode="formal_report"
          onClose={() => setReportPreview(false)}
        />
      )}
    </div>
  );
};

/** 7 LabTech Test Document Hubs — 100% PDF-First, zero general clutter. */
export const TestDocsHub: React.FC<{ onStartCalc?: (id: CalcToolId) => void }> = ({ onStartCalc }) => {
  const { tests } = useApp();
  const { tx } = usePrefs();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((t) =>
      `${t.code} ${t.short} ${t.name} ${t.std} ${t.stpDocCode} ${t.worksheetCode}`.toLowerCase().includes(q)
    );
  }, [tests, query]);

  const selectedTest = selected ? tests.find((t) => t.code === selected) : null;
  if (selectedTest) {
    return <TestDetail test={selectedTest} onBack={() => setSelected(null)} onStartCalc={onStartCalc} />;
  }

  return (
    <div className="space-y-3.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tx(
            '搜尋 7 項測試，例如 KD、Sonic、C939、C940、Point Load、PLT、VC…',
            'Search 7 LabTech tests, e.g. KD, Sonic, C939, C940, Point Load, PLT, VC…'
          )}
          className="min-h-[44px] w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand shadow-xs"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((t) => {
          const pdfCount = countTestPdfDocs(t);
          return (
            <button
              key={t.code}
              type="button"
              onClick={() => setSelected(t.code)}
              className="group flex min-h-[132px] flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-xs transition hover:border-brand/60 hover:shadow-md active:bg-slate-50/80 active:scale-[0.99] cursor-pointer"
            >
              <div className="w-full space-y-2.5">
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white">
                      {t.code}
                    </span>
                    {t.acc ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
                        <ShieldCheck className="h-3 w-3" /> HOKLAS 298
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-extrabold text-amber-700">
                        {tx('籌備認證', 'Pending HOKLAS')}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand shrink-0" />
                </div>

                <div>
                  <div className="text-base font-extrabold text-slate-900 group-hover:text-brand-deep transition">
                    {t.short}
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-600">{t.name}</div>
                  <div className="mt-1 line-clamp-1 font-mono text-[11px] text-slate-500">{t.std}</div>
                </div>
              </div>

              <div className="mt-3 flex w-full items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                <span className="truncate font-mono text-[11px] font-bold text-slate-500">
                  {t.stpDocCode} · {t.stpRev}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-wash px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-brand-deep shrink-0">
                  <FileText className="h-3 w-3" /> {pdfCount} PDF
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-sm text-slate-500">
          <FileText className="h-4 w-4" /> {tx('找不到符合搜尋條件的測試項目', 'No matching test found')}
        </div>
      )}
    </div>
  );
};
