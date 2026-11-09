import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { TestMethodItem } from '../types';
import { SERVER_QUALITY_DOCS, FQS49_MATRIX, ServerQualityDoc } from '../data/serverDocsCatalog';
import { getOfficialTemplateMeta } from '../utils/completedWorksheetGenerator';
import { HoklasReportPreview } from './HoklasReportPreview';
import { Badge } from './Badge';
import { Search, Eye, Award, Printer, Users } from 'lucide-react';

export const WorksheetTemplatesTable: React.FC = () => {
  const { tests, jobs, openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const [q, setQ] = useState('');
  const [previewStpCode, setPreviewStpCode] = useState<string | null>(null);

  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return tests
      .map((t) => ({ test: t, meta: getOfficialTemplateMeta(t.code, tests) }))
      .filter(({ test, meta }) => {
        if (!kw) return true;
        return `${test.code} ${test.name} ${test.std} ${meta.worksheetFormCode} ${meta.templateFileCode} ${meta.templateTitleZh}`
          .toLowerCase()
          .includes(kw);
      });
  }, [tests, q]);

  const handleRowPreview = (t: TestMethodItem, meta: ReturnType<typeof getOfficialTemplateMeta>) => {
    const docUrl = t.worksheetUrl || t.worksheetPdfUrl;
    if (docUrl) {
      openPreviewDoc({
        title: `${t.code} — ${meta.worksheetFormCode}`,
        url: docUrl,
        fileName: meta.templateFileCode,
        subtitle: `${meta.templateTitleZh} · ${meta.testStandard}`,
      });
      return;
    }
    setPreviewStpCode(t.code);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx('搜尋工作紙編號 (FST02 / FST03 / FST04 / FST05 / FST06 / PLT)...', 'Search Worksheet code or test name...')}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand shadow-xs"
          />
        </div>
        <div className="text-[11px] font-bold text-slate-500">
          {tx('💡 點擊任何一列即可預覽工作紙 PDF，並於視窗內選擇下載 Excel 或 PDF', '💡 Click any row to preview PDF and choose Excel or PDF download')}
        </div>
      </div>

      <div className="md:hidden divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-xs text-xs">
        {rows.map(({ test, meta }) => (
          <div
            key={test.code}
            onClick={() => handleRowPreview(test, meta)}
            className="p-3.5 space-y-2 hover:bg-slate-50 active:bg-brand-wash/40 cursor-pointer transition"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white">{test.code}</span>
                <span className="font-mono font-extrabold text-brand-deep">{meta.worksheetFormCode}</span>
              </div>
              <Badge tone="brand">{test.code === 'PO' ? 'PDF + XLS' : 'PDF + XLSX'}</Badge>
            </div>
            <div className="font-extrabold text-slate-900">{lang === 'en' ? meta.templateTitleEn : meta.templateTitleZh}</div>
            <div className="font-mono text-[11px] text-slate-500">{meta.templateFileCode} · {meta.testStandard}</div>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRowPreview(test, meta); }}
                className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 font-extrabold text-white cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" /> {tx('預覽 / 選擇下載 (Excel · PDF)', 'Preview / Download')}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPreviewStpCode(test.code); }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-700 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" /> {tx('A4 填寫預覽', 'Interactive A4')}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/85 bg-white shadow-xs">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
            <tr className="whitespace-nowrap">
              <th className="w-20 px-4 py-3">Code</th>
              <th className="w-56 px-3 py-3">{tx('工作紙編號', 'Worksheet Form Code')}</th>
              <th className="px-3 py-3">{tx('工作紙範本名稱及標準', 'Worksheet Title & Standard')}</th>
              <th className="w-28 px-3 py-3">{tx('格式', 'Format')}</th>
              <th className="w-28 px-3 py-3">{tx('認可狀態', 'Status')}</th>
              <th className="px-4 py-3 text-right">{tx('檢視及下載', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ test, meta }) => (
              <tr
                key={test.code}
                onClick={() => handleRowPreview(test, meta)}
                className="hover:bg-brand-wash/40 transition cursor-pointer"
              >
                <td className="px-4 py-3.5">
                  <span className="inline-block rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white">
                    {test.code}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <div className="font-mono font-extrabold text-brand-deep">{meta.worksheetFormCode}</div>
                  <div className="font-mono text-[11px] text-slate-500">{meta.templateFileCode}</div>
                </td>
                <td className="px-3 py-3.5">
                  <div className="font-extrabold text-slate-900">{meta.templateTitleEn}</div>
                  <div className="text-[11px] text-slate-500">{meta.templateTitleZh} · {meta.testStandard}</div>
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap">
                  <Badge tone="brand">{test.code === 'PO' ? 'PDF + XLS' : 'PDF + XLSX'}</Badge>
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap">
                  <Badge tone={meta.accredited ? 'ok' : 'warn'}>{meta.accredited ? 'HOKLAS' : 'Draft'}</Badge>
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRowPreview(test, meta); }}
                      className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 font-extrabold text-white hover:bg-brand-deep cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> {tx('預覽 / 選擇下載', 'Preview / Download')}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPreviewStpCode(test.code); }}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" /> {tx('A4 填寫預覽', 'Interactive A4')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {previewStpCode && (
        <HoklasReportPreview
          record={{
            id: `TPL-${previewStpCode}`,
            jobNo: jobs[0]?.no || 'LT0001',
            stpCode: previewStpCode,
            title: `${previewStpCode} Official Worksheet Template`,
            summary: 'Official Worksheet Template Preview',
            pass: true,
            testedAt: '2026-11-08 09:00',
            operatorName: 'Operator',
          }}
          job={jobs[0] || null}
          initialDocMode="worksheet"
          onClose={() => setPreviewStpCode(null)}
        />
      )}
    </div>
  );
};
export const FormalReportTemplatesTable: React.FC = () => {
  const { tests, jobs, openPreviewDoc } = useApp();
  const { tx } = usePrefs();
  const [q, setQ] = useState('');
  const [previewStpCode, setPreviewStpCode] = useState<string | null>(null);

  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return tests
      .map((t) => ({ test: t, meta: getOfficialTemplateMeta(t.code, tests) }))
      .filter(({ test, meta }) => {
        if (!kw) return true;
        return `${test.code} ${test.name} ${test.std} ${meta.formalReportFormCode} ${meta.formalReportTitleEn} ${meta.formalReportTitleZh}`
          .toLowerCase()
          .includes(kw);
      });
  }, [tests, q]);

  const handleRowClick = (t: TestMethodItem, meta: ReturnType<typeof getOfficialTemplateMeta>) => {
    if (meta.formalReportFileUrl) {
      openPreviewDoc({
        title: `${t.code} — ${meta.formalReportFormCode}`,
        url: meta.formalReportFileUrl,
        fileName: `${meta.formalReportFormCode}_Report_template.xlsx`,
        subtitle: `${meta.formalReportTitleZh} · ${meta.testStandard}`,
      });
      return;
    }
    setPreviewStpCode(t.code);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx('搜尋正式報告範本編號 (FDT-TM3-RT / FDT-PLT-RT / GTT-C939-RT / GTT-C940-RT / RKT-D5731-RT)...', 'Search Formal Report template code or title...')}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand shadow-xs"
          />
        </div>
        <div className="text-[11px] font-bold text-slate-500">
          {tx('💡 點擊任何一列即可預覽正式報告範本，並於視窗內選擇下載 Excel 或 PDF', '💡 Click any row to preview report template and choose Excel or PDF download')}
        </div>
      </div>

      <div className="md:hidden divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-xs text-xs">
        {rows.map(({ test, meta }) => (
          <div
            key={test.code}
            onClick={() => handleRowClick(test, meta)}
            className="p-3.5 space-y-2 hover:bg-slate-50 active:bg-amber-50/40 cursor-pointer transition"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white">{test.code}</span>
                <span className="font-mono font-extrabold text-amber-800">{meta.formalReportFormCode}</span>
              </div>
              <Badge tone="brand">PDF + XLSX</Badge>
            </div>
            <div className="font-extrabold text-slate-900">{meta.formalReportTitleEn}</div>
            <div className="text-[11px] text-slate-500">{meta.formalReportTitleZh}</div>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRowClick(test, meta); }}
                className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 font-extrabold text-white cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" /> {tx('預覽 / 選擇下載 (Excel · PDF)', 'Preview / Download')}
              </button>
              {meta.formalReportFileUrl && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreviewStpCode(test.code); }}
                  className="inline-flex items-center gap-1 rounded-xl border border-amber-400 bg-amber-50 px-2.5 py-1.5 font-bold text-amber-900 cursor-pointer"
                >
                  <Award className="h-3.5 w-3.5" /> {tx('A4 報告預覽', 'A4 Report')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/85 bg-white shadow-xs">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
            <tr className="whitespace-nowrap">
              <th className="w-20 px-4 py-3">Code</th>
              <th className="w-48 px-3 py-3">{tx('報告表格編號及 STP', 'Report Code & STP')}</th>
              <th className="px-3 py-3">{tx('正式報告範本名稱及標準', 'Formal Report Title & Standard')}</th>
              <th className="w-28 px-3 py-3">{tx('格式', 'Format')}</th>
              <th className="w-28 px-3 py-3">{tx('認可類別', 'Accreditation')}</th>
              <th className="px-4 py-3 text-right">{tx('檢視及下載', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ test, meta }) => (
              <tr
                key={test.code}
                onClick={() => handleRowClick(test, meta)}
                className="hover:bg-amber-50/40 transition cursor-pointer"
              >
                <td className="px-4 py-3.5">
                  <span className="inline-block rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white">
                    {test.code}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <div className="font-mono font-extrabold text-amber-800">{meta.formalReportFormCode}</div>
                  <div className="font-mono text-[11px] text-slate-500">{meta.stpDocRef}</div>
                </td>
                <td className="px-3 py-3.5">
                  <div className="font-extrabold text-slate-900">{meta.formalReportTitleEn}</div>
                  <div className="text-[11px] text-slate-500">{meta.formalReportTitleZh} · {meta.testStandard}</div>
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap">
                  <Badge tone="brand">PDF + XLSX</Badge>
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap">
                  <Badge tone={meta.accredited ? 'ok' : 'warn'}>{meta.accredited ? 'HOKLAS 298' : 'Non-HOKLAS'}</Badge>
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRowClick(test, meta); }}
                      className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 font-extrabold text-white hover:bg-brand-deep cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> {tx('預覽 / 選擇下載', 'Preview / Download')}
                    </button>
                    {meta.formalReportFileUrl && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPreviewStpCode(test.code); }}
                        className="inline-flex items-center gap-1 rounded-xl border border-amber-500 bg-amber-50 px-2.5 py-1.5 font-extrabold text-amber-950 hover:bg-amber-100 cursor-pointer"
                      >
                        <Award className="h-3.5 w-3.5 text-amber-700" /> {tx('A4 報告預覽', 'A4 Report')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {previewStpCode && (
        <HoklasReportPreview
          record={{
            id: `RPT-${previewStpCode}`,
            jobNo: jobs[0]?.no || 'LT0001',
            stpCode: previewStpCode,
            title: `${previewStpCode} Official Formal Report Template`,
            summary: 'Official Formal Report Template Preview',
            pass: true,
            testedAt: '2026-11-08 09:00',
            operatorName: 'Operator',
          }}
          job={jobs[0] || null}
          initialDocMode="formal_report"
          onClose={() => setPreviewStpCode(null)}
        />
      )}
    </div>
  );
};
export const QualityDocsVaultTable: React.FC<{
  mode?: 'order_forms' | 'daily_records' | 'quality_forms';
}> = ({ mode = 'order_forms' }) => {
  const { openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const [cat, setCat] = useState<'cal_qc' | 'mu' | 'hoklas_org' | 'fqs49' | 'all_quality'>('cal_qc');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return SERVER_QUALITY_DOCS.filter((d) => {
      if (mode === 'order_forms' && d.category !== 'order_form') return false;
      if (mode === 'daily_records' && d.category !== 'daily_record') return false;
      if (mode === 'quality_forms') {
        if (d.category === 'order_form' || d.category === 'daily_record') return false;
        if (cat !== 'all_quality' && cat !== 'fqs49' && d.category !== cat) return false;
      }
      if (!kw) return true;
      return `${d.code} ${d.titleZh} ${d.titleEn} ${d.testCode || ''} ${d.format}`.toLowerCase().includes(kw);
    });
  }, [mode, cat, q]);

  const qualityCats: [typeof cat, string][] = [
    ['cal_qc', tx('1. 儀器校準、月檢及借還表格 (6)', '1. Cal, Monthly & Loan Forms (6)')],
    ['mu', tx('2. MU 測量不確定度評估表 (4)', '2. MU Uncertainty Sheets (4)')],
    ['hoklas_org', tx('3. HOKLAS 298、架構及工程實績 (7)', '3. HOKLAS 298, Org & Job Refs (7)')],
    ['fqs49', tx(`4. FQS49 授權簽署人矩陣 (${FQS49_MATRIX.length})`, `4. FQS49 Signatories (${FQS49_MATRIX.length})`)],
    ['all_quality', tx('全部體系表格 (17)', 'All Quality Docs (17)')],
  ];

  const handlePreviewRow = (d: ServerQualityDoc) => {
    openPreviewDoc({
      title: `${d.code} — ${lang === 'en' ? d.titleEn : d.titleZh}`,
      url: d.url,
      fileName: `${d.code}.${d.format.toLowerCase()}`,
      subtitle: `Rev: ${d.revDate} · ${d.format}`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              mode === 'order_forms'
                ? tx('搜尋 FQS08 測試委託單編號或測試項目 (KD / SO / FC+BL / PO)...', 'Search FQS08 Test Order Form...')
                : mode === 'daily_records'
                ? tx('搜尋 FQS09 現場每日測試紀錄表編號或測試項目...', 'Search FQS09 Daily Site Record...')
                : tx('搜尋校準時間表 (FQS38)、月檢 (FCC01)、借還表 (FQS50)、MU 或 HOKLAS 證書...', 'Search Cal, Monthly Check, MU or HOKLAS docs...')
            }
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand shadow-xs"
          />
        </div>
        {mode === 'quality_forms' ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {qualityCats.map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setCat(k)}
                className={`rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  cat === k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-[11px] font-bold text-slate-500">
            {mode === 'order_forms'
              ? tx('💡 點擊任何一列即可預覽委託單 PDF，並於視窗內選擇下載 Excel/Word 或 PDF', '💡 Click any row to preview PDF and choose Excel/Word or PDF download')
              : tx('💡 點擊任何一列即可預覽每日紀錄表 PDF，並於視窗內選擇下載 Word 或 PDF', '💡 Click any row to preview PDF and choose Word or PDF download')}
          </div>
        )}
      </div>

      {mode === 'quality_forms' && cat === 'fqs49' ? (
        <PersonnelMatrixTable />
      ) : (
        <>
          <div className="md:hidden divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-xs text-xs">
            {filtered.map((d) => (
              <div
                key={d.id}
                onClick={() => handlePreviewRow(d)}
                className="p-3.5 space-y-2 hover:bg-slate-50 active:bg-brand-wash/40 cursor-pointer transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-extrabold text-brand-deep">{d.code}</span>
                    {d.testCode && <span className="rounded bg-brand-wash px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-brand-deep">{d.testCode}</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-slate-500">{d.revDate}</span>
                    <Badge tone={d.format === 'PDF' ? 'ok' : 'brand'}>{d.format}</Badge>
                  </div>
                </div>
                <div className="font-extrabold text-slate-900 leading-snug">{lang === 'en' ? d.titleEn : d.titleZh}</div>
                <div className="flex items-center gap-2 pt-0.5">
                  <button type="button" onClick={(e) => { e.stopPropagation(); handlePreviewRow(d); }} className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 font-extrabold text-white cursor-pointer">
                    <Eye className="h-3.5 w-3.5" /> {tx('預覽 / 選擇下載', 'Preview / Download')}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/85 bg-white shadow-xs">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
                <tr className="whitespace-nowrap">
                  <th className="w-44 px-4 py-3">{tx('文件編號', 'Code')}</th>
                  <th className="px-3 py-3">
                    {mode === 'order_forms'
                      ? tx('測試委託單範本名稱 (FQS08 Test Order Form)', 'FQS08 Test Order Form Title')
                      : mode === 'daily_records'
                      ? tx('現場每日測試紀錄表名稱 (FQS09 Daily Site Record)', 'FQS09 Daily Site Record Title')
                      : tx('品質體系／校準／MU 文件名稱', 'Quality / Calibration / MU Document Title')}
                  </th>
                  <th className="w-24 px-3 py-3">{tx('關聯項目', 'Test')}</th>
                  <th className="w-28 px-3 py-3">{tx('修訂日期', 'Rev Date')}</th>
                  <th className="w-28 px-3 py-3">{tx('格式', 'Format')}</th>
                  <th className="px-4 py-3 text-right">{tx('檢視及下載', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => handlePreviewRow(d)}
                    className="hover:bg-brand-wash/40 transition cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono font-extrabold text-brand-deep whitespace-nowrap">{d.code}</td>
                    <td className="px-3 py-3 font-bold text-slate-900">{lang === 'en' ? d.titleEn : d.titleZh}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{d.testCode ? <span className="rounded bg-brand-wash px-2 py-0.5 font-mono text-[11px] font-extrabold text-brand-deep whitespace-nowrap">{d.testCode}</span> : <span className="text-slate-400">—</span>}</td>
                    <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">{d.revDate}</td>
                    <td className="px-3 py-3 whitespace-nowrap"><Badge tone={d.format === 'PDF' ? 'ok' : 'brand'}>{d.format}</Badge></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handlePreviewRow(d)}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-xl bg-brand px-3.5 font-extrabold text-white hover:bg-brand-deep cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 shrink-0" /> {tx('預覽 / 選擇下載', 'Preview / Download')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export const PersonnelMatrixTable: React.FC = () => {
  const { openPreviewDoc, setStpPreviewCode } = useApp();
  const { lang, tx } = usePrefs();
  const sep = lang === 'en' ? ', ' : '、';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-700 shrink-0" />
          <div>
            <div className="font-extrabold text-emerald-900">{tx('FQS49 授權簽署人 (Approved Signatories) 及合資格操作員矩陣', 'FQS49 Approved Signatories & Qualified Operators Matrix')}</div>
            <div className="mt-0.5 text-emerald-800">{tx('資料同步自品質文件 FQS49 (2026-03-23) 及 HOKLAS 298 認可範圍證書 (Issue 2026-07-24)。', 'Synced from FQS49 (23 Mar 2026) and HOKLAS 298 Scope of Accreditation (Issue 24 Jul 2026).')}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => openPreviewDoc({ title: tx('HOKLAS 298 認可範圍證書 (Scope of Accreditation)', 'HOKLAS 298 Scope of Accreditation'), url: '/server-docs/forms/HOKLAS298_Scope_of_Accreditation_260727.pdf' })} className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 font-extrabold text-white hover:bg-emerald-800 cursor-pointer">
            <Eye className="h-3.5 w-3.5" /> {tx('預覽 HOKLAS 298 證書', 'Preview HOKLAS 298')}
          </button>
          <button type="button" onClick={() => openPreviewDoc({ title: tx('FQS49 合資格操作員及授權簽署人名單', 'FQS49 List of Qualified Operators & Approved Signatories'), url: '/server-docs/forms/FQS49_List_of_Qualified_Operator_260323.pdf' })} className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-2 font-bold text-emerald-900 hover:bg-emerald-50 cursor-pointer">
            <Eye className="h-3.5 w-3.5" /> {tx('預覽 FQS49 名單', 'Preview FQS49')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200/85 bg-white shadow-xs">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
            <tr className="whitespace-nowrap">
              <th className="w-20 px-4 py-3">Code</th>
              <th className="w-60 px-3 py-3">{tx('測試項目及參考標準', 'Test Item & Standard')}</th>
              <th className="w-28 px-3 py-3">{tx('HOKLAS 狀態', 'Status')}</th>
              <th className="px-3 py-3">{tx('HOKLAS 授權簽署人 (Approved Signatories)', 'Approved Signatories')}</th>
              <th className="px-3 py-3">{tx('合資格操作員 (Qualified Operators)', 'Qualified Operators')}</th>
              <th className="px-4 py-3">{tx('受訓中人員 (In Training)', 'Trainees')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {FQS49_MATRIX.map((r) => (
              <tr
                key={r.code}
                onClick={() => setStpPreviewCode(r.code)}
                className="hover:bg-slate-50/80 transition cursor-pointer"
              >
                <td className="px-4 py-3.5"><span className="inline-block rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white">{r.code}</span></td>
                <td className="px-3 py-3.5"><div className="font-extrabold text-slate-900">{r.testName}</div><div className="text-[11px] text-slate-500">{r.standard}</div></td>
                <td className="px-3 py-3.5"><Badge tone={r.hoklasStatus === 'Accredited' ? 'ok' : 'warn'}>{r.hoklasStatus}</Badge></td>
                <td className="px-3 py-3.5 font-semibold text-emerald-900">{r.signatories.join(sep)}</td>
                <td className="px-3 py-3.5 text-slate-800">{r.qualifiedOperators.length ? r.qualifiedOperators.join(sep) : <span className="text-slate-400">{tx('籌備評核中', 'Assessment in prep')}</span>}</td>
                <td className="px-4 py-3.5 text-slate-500">{r.trainees.length ? r.trainees.join(sep) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
