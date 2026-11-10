import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { TestMethodItem } from '../types';
import { downloadBlankTemplate } from '../utils';
import { Badge } from '../components/Badge';
import { DocVaultSubSectionId } from '../components/FieldNavShell';
import { NewStpModal } from '../components/NewStpModal';
import {
  WorksheetTemplatesTable,
  QualityDocsVaultTable,
  FormalReportTemplatesTable,
} from '../components/StpQualityVaultTabs';
import { SERVER_QUALITY_DOCS } from '../data/serverDocsCatalog';
import {
  FileText,
  Plus,
  Search,
  Star,
  Download,
  BookOpen,
  UploadCloud,
  ShieldCheck,
  Eye,
  FolderOpen,
  FileSpreadsheet,
  Award,
  ClipboardList,
  BookCheck,
} from 'lucide-react';

export const StpPage: React.FC<{
  subSection?: DocVaultSubSectionId;
  onChangeSubSection?: (sub: DocVaultSubSectionId) => void;
  onOpenDriveBatch?: () => void;
}> = ({ subSection = 'stp', onChangeSubSection, onOpenDriveBatch }) => {
  const { tests, pinnedStps, togglePinStp, setStpPreviewCode, uploadStpDocFile, openPreviewDoc } = useApp();
  const { tx } = usePrefs();
  const [sectionTab, setSectionTab] = useState<DocVaultSubSectionId>(subSection);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pinned' | 'acc' | 'prep'>('all');
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    setSectionTab(subSection);
  }, [subSection]);

  const handleSelectSection = (next: DocVaultSubSectionId) => {
    setSectionTab(next);
    onChangeSubSection?.(next);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tests.filter((t) => {
      if (filter === 'pinned' && !pinnedStps.includes(t.code)) return false;
      if (filter === 'acc' && !t.acc) return false;
      if (filter === 'prep' && t.acc) return false;
      if (!q) return true;
      const hay = `${t.code} ${t.name} ${t.short} ${t.std} ${t.stpDocCode} ${t.worksheetCode} ${t.keyParams.join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
    return [...list].sort((a, b) => (pinnedStps.includes(a.code) ? 0 : 1) - (pinnedStps.includes(b.code) ? 0 : 1));
  }, [tests, pinnedStps, query, filter]);
  const handleQuickPdfUpload = async (t: TestMethodItem, ev: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = ev.target.files ? (Array.from(ev.target.files) as File[]) : [];
    if (fileList.length === 0) return;
    const readFile = (f: File) =>
      new Promise<{ fileName: string; fileSize: string; dataUrl?: string }>((resolve) => {
        const sizeKb = `${Math.max(1, Math.round(f.size / 1024))} KB`;
        const reader = new FileReader();
        reader.onload = () =>
          resolve({
            fileName: f.name,
            fileSize: sizeKb,
            dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
          });
        reader.onerror = () => resolve({ fileName: f.name, fileSize: sizeKb });
        reader.readAsDataURL(f);
      });
    const results = await Promise.all(fileList.map(readFile));
    results.forEach((res) => {
      uploadStpDocFile(t.code, {
        fileName: res.fileName,
        fileSize: res.fileSize,
        docType: 'Controlled STP PDF',
        dataUrl: res.dataUrl,
      });
    });
    ev.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 sm:px-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
            {tx('受控工作文件及範本庫', 'Controlled Working Documents & Templates')}
          </h1>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenDriveBatch && (
              <button
                type="button"
                onClick={onOpenDriveBatch}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
              >
                <UploadCloud className="h-3.5 w-3.5" /> {tx('批次上傳至 Drive', 'Batch Upload')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-brand-deep cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> {tx('新增 STP 文件', 'Add STP')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
          {([
            ['stp', tx('STP 標準程序', 'STP Procedures'), tests.length, FileText],
            ['worksheets', tx('工作紙範本', 'Worksheets'), tests.length, FileSpreadsheet],
            ['order_forms', tx('測試委託單 FQS08', 'Order Forms FQS08'), SERVER_QUALITY_DOCS.filter((d) => d.category === 'order_form').length, FolderOpen],
            ['daily_records', tx('每日紀錄表 FQS09', 'Daily Records FQS09'), SERVER_QUALITY_DOCS.filter((d) => d.category === 'daily_record').length, ClipboardList],
            ['reports', tx('正式報告範本', 'Report Templates'), tests.length, Award],
            ['quality_forms', tx('品質及校準表', 'Quality Forms'), SERVER_QUALITY_DOCS.filter((d) => d.category !== 'order_form' && d.category !== 'daily_record').length, BookCheck],
          ] as const).map(([id, label, count, Icon]) => {
            const active = sectionTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectSection(id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-extrabold transition cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="leading-tight truncate">{label}</span>
                <span className="ml-0.5 font-mono opacity-80">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
      {sectionTab === 'worksheets' ? (
        <WorksheetTemplatesTable />
      ) : sectionTab === 'order_forms' ? (
        <QualityDocsVaultTable mode="order_forms" />
      ) : sectionTab === 'daily_records' ? (
        <QualityDocsVaultTable mode="daily_records" />
      ) : sectionTab === 'reports' ? (
        <FormalReportTemplatesTable />
      ) : sectionTab === 'quality_forms' ? (
        <QualityDocsVaultTable mode="quality_forms" />
      ) : (
        <>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tx('搜尋 KD / Sonic / Flow Cone / Bleeding / ASTM / STP 編號...', 'Search KD / Sonic / Flow Cone / Bleeding / ASTM / STP...')}
                className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand shadow-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {([
                ['all', tx(`全部 STP (${tests.length})`, `All STPs (${tests.length})`)],
                ['pinned', tx(`常用 (${pinnedStps.length})`, `Pinned (${pinnedStps.length})`)],
                ['acc', tx(`HOKLAS (${tests.filter((t) => t.acc).length})`, `HOKLAS (${tests.filter((t) => t.acc).length})`)],
                ['prep', tx(`Draft (${tests.filter((t) => !t.acc).length})`, `In Prep (${tests.filter((t) => !t.acc).length})`)],
              ] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition cursor-pointer ${filter === k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:hidden divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-xs text-xs">
            {filtered.map((t) => {
              const isPinned = pinnedStps.includes(t.code);
              const pdfCount = t.stpFiles?.length || 0;
              return (
                <div
                  key={t.code}
                  onClick={() => setStpPreviewCode(t.code)}
                  className="p-3.5 space-y-2 hover:bg-slate-50 active:bg-brand-wash/40 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button type="button" onClick={(e) => { e.stopPropagation(); togglePinStp(t.code); }} className={`rounded-lg p-1 cursor-pointer ${isPinned ? 'text-amber-500 bg-amber-50' : 'text-slate-300'}`}>
                        <Star className="h-4 w-4" fill={isPinned ? 'currentColor' : 'none'} />
                      </button>
                      <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white whitespace-nowrap">{t.code}</span>
                      <span className="font-mono font-extrabold text-brand-deep truncate">{t.stpDocCode} ({t.stpRev})</span>
                    </div>
                    <Badge tone={t.acc ? 'ok' : 'warn'}>{t.acc ? 'HOKLAS' : 'Draft'}</Badge>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">{t.name}</div>
                    <div className="text-[11px] text-slate-500">{t.std}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {t.stpPdfUrl && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); openPreviewDoc({ title: `${t.stpDocCode} (${t.stpRev}) — ${t.name}`, url: t.stpPdfUrl!, fileName: `${t.stpDocCode}.pdf`, subtitle: t.std }); }} className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 font-extrabold text-emerald-800 cursor-pointer">
                        <Eye className="h-3.5 w-3.5" /> {tx('預覽 STP', 'Preview')}
                      </button>
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); setStpPreviewCode(t.code); }} className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 font-extrabold text-white cursor-pointer">
                      <BookOpen className="h-3.5 w-3.5" /> {tx(`詳情 / 附件 (${pdfCount})`, `Details (${pdfCount})`)}
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); downloadBlankTemplate(t); }} className="inline-flex items-center gap-1 rounded-xl border border-brand/40 bg-brand-wash/40 px-2.5 py-1.5 font-extrabold text-brand-deep cursor-pointer">
                      <Download className="h-3.5 w-3.5" /> WS
                    </button>
                    <label onClick={(e) => e.stopPropagation()} title={tx('上傳 STP PDF', 'Upload STP PDF')} className="ml-auto inline-flex items-center rounded-xl border border-slate-200 p-1.5 text-slate-500 cursor-pointer">
                      <UploadCloud className="h-3.5 w-3.5" />
                      <input type="file" multiple accept=".pdf,.doc,.docx" onChange={(ev) => handleQuickPdfUpload(t, ev)} className="hidden" />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/85 bg-white shadow-xs">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/90 font-extrabold text-slate-600">
                <tr className="whitespace-nowrap">
                  <th className="w-10 px-3 py-3 text-center"><Star className="mx-auto h-3.5 w-3.5 text-slate-400" /></th>
                  <th className="w-20 px-3 py-3">Code</th>
                  <th className="w-48 px-3 py-3">{tx('STP 編號及版本', 'STP No. & Rev')}</th>
                  <th className="px-3 py-3">{tx('測試項目及參考標準', 'Test Method & Standard')}</th>
                  <th className="px-3 py-3">{tx('核心檢查要點／附件', 'Key Checkpoints / PDF')}</th>
                  <th className="w-28 px-3 py-3">{tx('認可狀態', 'Status')}</th>
                  <th className="px-4 py-3 text-right">{tx('文件操作', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => {
                  const isPinned = pinnedStps.includes(t.code);
                  const pdfCount = t.stpFiles?.length || 0;
                  return (
                    <tr
                      key={t.code}
                      onClick={() => setStpPreviewCode(t.code)}
                      className="hover:bg-brand-wash/40 transition cursor-pointer"
                    >
                      <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => togglePinStp(t.code)} title={tx('置頂常用 STP', 'Pin STP')} className={`rounded-lg p-1.5 transition cursor-pointer ${isPinned ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-slate-500'}`}>
                          <Star className="h-4 w-4" fill={isPinned ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                      <td className="px-3 py-3.5"><span className="inline-block rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white">{t.code}</span></td>
                      <td className="px-3 py-3.5">
                        <div className="font-mono font-extrabold text-brand-deep">{t.stpDocCode}</div>
                        <div className="font-mono text-[11px] text-slate-500">{t.stpRev} · Eff: {t.stpEffectiveDate}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="font-extrabold text-slate-900 hover:text-brand">{t.name}</div>
                        <div className="text-[11px] text-slate-500">{t.std}</div>
                      </td>
                      <td className="px-3 py-3.5 max-w-xs">
                        <div className="text-[11px] text-slate-700 line-clamp-2">{t.keyParams.slice(0, 2).join(' ； ')}</div>
                        {pdfCount > 0 && <div className="mt-1 inline-flex items-center gap-1 rounded bg-brand-wash px-1.5 py-0.5 text-[10px] font-bold text-brand-deep"><FileText className="h-3 w-3" /> {pdfCount} PDF</div>}
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap"><Badge tone={t.acc ? 'ok' : 'warn'}>{t.acc ? 'HOKLAS' : 'Draft'}</Badge></td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-grid grid-cols-[90px_70px_58px_34px] items-center justify-end gap-1.5 whitespace-nowrap">
                          {t.stpPdfUrl ? (
                            <button
                              type="button"
                              onClick={() => openPreviewDoc({ title: `${t.stpDocCode} (${t.stpRev}) — ${t.name}`, url: t.stpPdfUrl!, fileName: `${t.stpDocCode}.pdf`, subtitle: t.std })}
                              title={tx('預覽受控 STP PDF', 'Preview Controlled STP PDF')}
                              className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2 py-1.5 font-extrabold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 shrink-0" /> {tx('預覽 STP', 'Preview')}
                            </button>
                          ) : (
                            <span />
                          )}
                          <button type="button" onClick={() => setStpPreviewCode(t.code)} className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-brand px-2 py-1.5 font-extrabold text-white hover:bg-brand-deep whitespace-nowrap cursor-pointer">
                            <BookOpen className="h-3.5 w-3.5 shrink-0" /> {tx('詳情', 'Details')}
                          </button>
                          <button type="button" onClick={() => downloadBlankTemplate(t)} title={tx('下載空白 Worksheet', 'Download Blank Worksheet')} className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-brand/40 bg-brand-wash/40 px-2 py-1.5 font-extrabold text-brand-deep hover:bg-brand-wash whitespace-nowrap cursor-pointer">
                            <Download className="h-3.5 w-3.5 shrink-0" /> WS
                          </button>
                          <label title={tx('上傳 STP PDF', 'Upload STP PDF')} className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-brand cursor-pointer">
                            <UploadCloud className="h-3.5 w-3.5" />
                            <input type="file" multiple accept=".pdf,.doc,.docx" onChange={(ev) => handleQuickPdfUpload(t, ev)} className="hidden" />
                          </label>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {newOpen && <NewStpModal onClose={() => setNewOpen(false)} />}
    </div>
  );
};
