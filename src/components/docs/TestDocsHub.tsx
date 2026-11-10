import React, { useMemo, useState } from 'react';
import { useApp } from '../../store';
import { usePrefs } from '../../prefs';
import { usePermissions } from '../../permissions';
import { TestMethodItem } from '../../types';
import { downloadBlankTemplate, getEquipmentCalStatus } from '../../utils';
import { resolveDocLink } from '../../driveDocs';
import { getOfficialTemplateMeta } from '../../utils/completedWorksheetGenerator';
import { SERVER_QUALITY_DOCS, ServerQualityDoc } from '../../data/serverDocsCatalog';
import { HoklasReportPreview } from '../HoklasReportPreview';
import { SharedDocUploadBox } from '../SharedDocUploadBox';
import { CalCertUploadBox } from '../CalCertUploadBox';
import type { CalcToolId } from '../../pages/ToolsPage';
import { ArrowLeft, Eye, Download, Calculator, ChevronRight, ChevronDown, Search, FolderOpen, FileText } from 'lucide-react';

const CALC_FOR_TEST: Record<string, CalcToolId> = {
  BL: 'bleeding', FC: 'flowcone', KD: 'koden', PLT: 'plt', PO: 'pointload', VC: 'inclinometer',
};

const GENERAL_KEY = '__general__';

/** Strip a trailing English parenthetical so Chinese mode shows one language only. */
const cleanZh = (s: string) => s.replace(/\s*[（(][^()（）]*[)）]\s*$/, '').trim();

const docMatchesTest = (d: ServerQualityDoc, code: string) =>
  !!d.testCode && d.testCode.split('+').map((s) => s.trim().toUpperCase()).includes(code.toUpperCase());

/** One document line: label on the left, preview / download on the right. */
const DocRow: React.FC<{
  label: string;
  code?: string;
  onPreview?: () => void;
  downloadHref?: string;
  onDownload?: () => void;
  missing?: string;
}> = ({ label, code, onPreview, downloadHref, onDownload, missing }) => {
  const { tx } = usePrefs();
  const btn = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer';
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-bold text-slate-900">{label}</div>
        {code && <div className="truncate font-mono text-[11px] text-slate-500">{code}</div>}
      </div>
      {missing ? (
        <span className="text-xs text-slate-400">{missing}</span>
      ) : (
        <div className="flex items-center gap-1.5">
          {onPreview && (
            <button type="button" onClick={onPreview} className={`${btn} bg-brand-wash text-brand-deep hover:bg-brand hover:text-white`}>
              <Eye className="h-3.5 w-3.5" /> {tx('預覽', 'Preview')}
            </button>
          )}
          {downloadHref ? (
            <a href={downloadHref} download target="_blank" rel="noopener noreferrer" className={`${btn} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
              <Download className="h-3.5 w-3.5" /> {tx('下載', 'Download')}
            </a>
          ) : onDownload ? (
            <button type="button" onClick={onDownload} className={`${btn} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
              <Download className="h-3.5 w-3.5" /> {tx('下載', 'Download')}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-2 shadow-xs">
    <div className="pt-2 text-[11px] font-extrabold text-slate-400">{title}</div>
    <div className="divide-y divide-slate-100">{children}</div>
  </div>
);

const Collapsible: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer">
        {title}
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-700">{children}</div>}
    </div>
  );
};

const TestDetail: React.FC<{ test: TestMethodItem; onBack: () => void; onStartCalc?: (id: CalcToolId) => void }> = ({ test, onBack, onStartCalc }) => {
  const { tests, equipment, jobs, openPreviewDoc, uploadStpDocFile, uploadStpCalCert, pushToast } = useApp();
  const { lang, tx } = usePrefs();
  const perms = usePermissions();
  const [reportPreview, setReportPreview] = useState(false);
  const meta = getOfficialTemplateMeta(test.code, tests);
  const calcId = CALC_FOR_TEST[test.code];

  const docTitle = (d: ServerQualityDoc) => (lang === 'en' ? d.titleEn : cleanZh(d.titleZh));
  const previewServerDoc = (d: ServerQualityDoc) => openPreviewDoc({ title: `${d.code} — ${docTitle(d)}`, url: d.url, fileName: d.url.split('/').pop() });

  const orderForm = SERVER_QUALITY_DOCS.find((d) => d.category === 'order_form' && docMatchesTest(d, test.code));
  const dailyRecord = SERVER_QUALITY_DOCS.find((d) => d.category === 'daily_record' && docMatchesTest(d, test.code));
  const muDoc = SERVER_QUALITY_DOCS.find((d) => d.category === 'mu' && docMatchesTest(d, test.code));

  const linkedEquipment = useMemo(
    () =>
      equipment
        .filter((e) => e.inUse !== 'N')
        .filter((e) => (e.testTags || e.tests.split('+').map((s) => s.trim())).includes(test.code))
        .map((e) => ({ eq: e, cal: getEquipmentCalStatus(e, undefined, lang) })),
    [equipment, test.code, lang]
  );
  const eqAlerts = linkedEquipment.filter((x) => x.cal.kind === 'bad' || x.cal.kind === 'warn').length;

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer">
        <ArrowLeft className="h-3.5 w-3.5" /> {tx('全部測試', 'All tests')}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-xs font-extrabold text-white">{test.code}</span>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{test.short}</h1>
            {!test.acc && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">Draft</span>}
          </div>
          <div className="mt-1 text-xs text-slate-500">{test.name} · {test.std}</div>
        </div>
        {calcId && onStartCalc && (
          <button type="button" onClick={() => onStartCalc(calcId)} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white shadow-xs hover:bg-brand-deep cursor-pointer">
            <Calculator className="h-4 w-4" /> {tx(`開始計算 ${test.short}`, `Start ${test.short} calculation`)}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Section title={tx('必讀', 'Read first')}>
          <DocRow
            label={tx('STP 標準測試程序', 'Standard Test Procedure')}
            code={`${test.stpDocCode} · ${test.stpRev}`}
            onPreview={test.stpPdfUrl ? () => openPreviewDoc({ title: `${test.stpDocCode} ${test.stpRev} — ${test.short}`, url: test.stpPdfUrl!, fileName: `${test.stpDocCode}.pdf`, subtitle: test.std }) : undefined}
            downloadHref={test.stpPdfUrl ? resolveDocLink(test.stpPdfUrl).downloadUrl || test.stpPdfUrl : undefined}
            missing={test.stpPdfUrl ? undefined : tx('未有 PDF', 'No PDF yet')}
          />
        </Section>

        <Section title={tx('交報告', 'Reporting')}>
          <DocRow
            label={tx('正式報告範本', 'Formal Report Template')}
            code={meta.formalReportFormCode}
            onPreview={() =>
              meta.formalReportFileUrl
                ? openPreviewDoc({ title: `${test.code} — ${meta.formalReportFormCode}`, url: meta.formalReportFileUrl, fileName: `${meta.formalReportFormCode}_Report_template.xlsx` })
                : setReportPreview(true)
            }
            downloadHref={meta.formalReportFileUrl}
          />
        </Section>

        <Section title={tx('現場用', 'On site')}>
          <DocRow
            label={tx('空白 Worksheet', 'Blank Worksheet')}
            code={test.worksheetCode}
            onPreview={test.worksheetUrl || test.worksheetPdfUrl ? () => openPreviewDoc({ title: `${test.code} — ${test.worksheetCode}`, url: test.worksheetPdfUrl || test.worksheetUrl!, fileName: test.worksheetCode }) : undefined}
            onDownload={() => downloadBlankTemplate(test)}
          />
          {(orderForm || test.orderFormUrl) && (
            <DocRow
              label={tx('FQS08 測試委託單', 'FQS08 Test Order Form')}
              code={orderForm?.code}
              onPreview={() => (orderForm ? previewServerDoc(orderForm) : openPreviewDoc({ title: `${test.code} — FQS08`, url: test.orderFormUrl! }))}
              downloadHref={orderForm?.url || test.orderFormUrl}
            />
          )}
          {(dailyRecord || test.dailyRecordUrl) && (
            <DocRow
              label={tx('FQS09 每日現場紀錄', 'FQS09 Daily Site Record')}
              code={dailyRecord?.code}
              onPreview={() => (dailyRecord ? previewServerDoc(dailyRecord) : openPreviewDoc({ title: `${test.code} — FQS09`, url: test.dailyRecordUrl! }))}
              downloadHref={dailyRecord?.url || test.dailyRecordUrl}
            />
          )}
          {(muDoc || test.muTemplateUrl) && (
            <DocRow
              label={tx('MU 不確定度評估表', 'Measurement Uncertainty Sheet')}
              code={muDoc?.code}
              onPreview={() => (muDoc ? previewServerDoc(muDoc) : openPreviewDoc({ title: `${test.code} — MU`, url: test.muTemplateUrl! }))}
              downloadHref={muDoc?.url || test.muTemplateUrl}
            />
          )}
        </Section>

        <Section title={tx('要帶嘅儀器', 'Equipment to bring')}>
          {linkedEquipment.length === 0 ? (
            <div className="py-2.5 text-xs text-slate-500">{test.equipmentTypes.join(' · ')}</div>
          ) : (
            <>
              <div className={`py-2.5 text-sm font-bold ${eqAlerts ? 'text-amber-700' : 'text-emerald-700'}`}>
                {eqAlerts
                  ? tx(`${linkedEquipment.length} 件，其中 ${eqAlerts} 件校準需要注意`, `${linkedEquipment.length} items, ${eqAlerts} need calibration attention`)
                  : tx(`${linkedEquipment.length} 件，校準全部有效`, `${linkedEquipment.length} items, all calibrations valid`)}
              </div>
              {linkedEquipment.map(({ eq, cal }) => (
                <div key={eq.code} className="flex items-center justify-between gap-2 py-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-slate-800">{eq.code}</span>
                    <span className="ml-2 text-slate-500">{eq.name}</span>
                  </div>
                  <span className={`shrink-0 font-bold ${cal.kind === 'bad' ? 'text-rose-600' : cal.kind === 'warn' ? 'text-amber-600' : cal.kind === 'ok' ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {cal.label}
                  </span>
                </div>
              ))}
            </>
          )}
        </Section>
      </div>

      <Collapsible title={tx('測試要點及合資格人員', 'Key checkpoints & qualified staff')}>
        <ol className="list-decimal space-y-1 pl-5 leading-relaxed">
          {test.keyParams.map((k, i) => <li key={i}>{k}</li>)}
        </ol>
        {test.approvedSignatories?.length ? (
          <div className="mt-3"><span className="font-bold text-slate-500">{tx('授權簽署人：', 'Approved signatories: ')}</span>{test.approvedSignatories.join(lang === 'en' ? ', ' : '、')}</div>
        ) : null}
        {test.qualifiedOperators?.length ? (
          <div className="mt-1"><span className="font-bold text-slate-500">{tx('合資格操作員：', 'Qualified operators: ')}</span>{test.qualifiedOperators.join(lang === 'en' ? ', ' : '、')}</div>
        ) : null}
      </Collapsible>

      <Collapsible title={tx('版本紀錄', 'Revision history')}>
        <div className="divide-y divide-slate-100">
          {test.versions.map((v) => (
            <div key={v.ver} className={`flex items-center justify-between gap-2 py-1.5 ${v.status === 'obsolete' ? 'text-slate-400' : ''}`}>
              <span className={`font-mono font-bold ${v.status === 'obsolete' ? 'line-through' : 'text-slate-900'}`}>{v.ver}</span>
              <span className="font-mono">{v.date} · {v.status === 'current' ? tx('現行', 'Current') : tx('已作廢', 'Obsolete')}</span>
            </div>
          ))}
        </div>
      </Collapsible>

      {perms.canManageDocs && (
        <Collapsible title={tx('管理：上傳 STP、附件及 Cal Cert', 'Manage: upload STP, attachments & Cal Certs')}>
          <div className="space-y-3">
            <SharedDocUploadBox
              title={tx(`${test.code} STP 及附件`, `${test.code} STP & attachments`)}
              buttonLabel={tx('上傳 STP 或附件', 'Upload STP or file')}
              docTypeOptions={[
                tx('受控 STP PDF', 'Controlled STP PDF'),
                tx('空白 Worksheet XLSX', 'Blank Worksheet XLSX'),
                tx('FQS08 委託單', 'FQS08 Order Form'),
                tx('FQS09 每日紀錄', 'FQS09 Daily Record'),
                tx('操作指南 PDF', 'Field Guide PDF'),
              ]}
              docs={test.stpFiles || []}
              onUpload={(doc) => uploadStpDocFile(test.code, doc)}
              onPreviewToast={(fn) => pushToast(tx('已開啟文件', 'Opened file'), fn)}
            />
            <CalCertUploadBox
              title={tx(`${test.code} 關聯 Cal Cert`, `${test.code} linked Cal Certs`)}
              certs={test.calCerts || []}
              eqOptions={linkedEquipment.map(({ eq }) => ({ code: eq.code, name: eq.name }))}
              onUpload={(d) => uploadStpCalCert({ stpCode: test.code, fileName: d.fileName, fileSize: d.fileSize, eqCode: d.eqCode, dueDate: d.dueDate, certNo: d.certNo, dataUrl: d.dataUrl })}
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

const GeneralForms: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const docs = SERVER_QUALITY_DOCS.filter((d) => !d.testCode);
  const title = (d: ServerQualityDoc) => (lang === 'en' ? d.titleEn : cleanZh(d.titleZh));
  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer">
        <ArrowLeft className="h-3.5 w-3.5" /> {tx('全部測試', 'All tests')}
      </button>
      <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{tx('通用表格', 'General forms')}</h1>
      <Section title={tx(`${docs.length} 份文件`, `${docs.length} documents`)}>
        <DocRow
          label={tx('FQS50 儀器借還登記表', 'FQS50 Equipment Loan Record')}
          code="FQS50"
          onPreview={() => openPreviewDoc({ title: 'FQS50', url: '/server-docs/forms/FQS50_Loan_of_Equipment_template.doc', fileName: 'FQS50_Loan_of_Equipment_template.doc' })}
          downloadHref="/server-docs/forms/FQS50_Loan_of_Equipment_template.doc"
        />
        {docs.map((d) => (
          <DocRow
            key={d.id}
            label={title(d)}
            code={`${d.code} · ${d.revDate}`}
            onPreview={() => openPreviewDoc({ title: `${d.code} — ${title(d)}`, url: d.url, fileName: d.url.split('/').pop() })}
            downloadHref={d.url}
          />
        ))}
      </Section>
    </div>
  );
};

/** Documents grouped by the test a front-line colleague is about to do. */
export const TestDocsHub: React.FC<{ onStartCalc?: (id: CalcToolId) => void }> = ({ onStartCalc }) => {
  const { tests } = useApp();
  const { tx } = usePrefs();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((t) => `${t.code} ${t.short} ${t.name} ${t.std} ${t.stpDocCode} ${t.worksheetCode}`.toLowerCase().includes(q));
  }, [tests, query]);

  if (selected === GENERAL_KEY) return <GeneralForms onBack={() => setSelected(null)} />;
  const selectedTest = selected ? tests.find((t) => t.code === selected) : null;
  if (selectedTest) return <TestDetail test={selectedTest} onBack={() => setSelected(null)} onStartCalc={onStartCalc} />;

  const generalCount = SERVER_QUALITY_DOCS.filter((d) => !d.testCode).length + 1;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tx('搵測試，例如 Koden、Sonic、C939…', 'Find a test, e.g. Koden, Sonic, C939…')}
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand shadow-xs"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((t) => (
          <button
            key={t.code}
            type="button"
            onClick={() => setSelected(t.code)}
            className="group flex flex-col items-start rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-xs transition hover:border-brand/50 hover:shadow-sm cursor-pointer"
          >
            <div className="flex w-full items-center justify-between">
              <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-xs font-extrabold text-white">{t.code}</span>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-brand" />
            </div>
            <div className="mt-3 text-base font-extrabold text-slate-900">{t.short}</div>
            <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{t.std}</div>
            {!t.acc && <span className="mt-2 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">Draft</span>}
          </button>
        ))}

        {!query && (
          <button
            type="button"
            onClick={() => setSelected(GENERAL_KEY)}
            className="group flex flex-col items-start rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-left transition hover:border-brand/50 hover:bg-white cursor-pointer"
          >
            <div className="flex w-full items-center justify-between">
              <FolderOpen className="h-5 w-5 text-slate-500" />
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-brand" />
            </div>
            <div className="mt-3 text-base font-extrabold text-slate-900">{tx('通用表格', 'General forms')}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">{tx(`FQS50、FQS38、FCC01 等 ${generalCount} 份`, `FQS50, FQS38, FCC01 and more · ${generalCount}`)}</div>
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-10 text-sm text-slate-500">
          <FileText className="h-4 w-4" /> {tx('搵唔到相關測試', 'No matching test')}
        </div>
      )}
    </div>
  );
};
