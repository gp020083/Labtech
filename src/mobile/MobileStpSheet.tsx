import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { resolveDocLink } from '../driveDocs';
import { FORMAL_REPORT_PDF_URLS } from '../data/serverDocsCatalog';
import { Badge } from '../components/Badge';
import { X, Eye, Download, UploadCloud, AlertOctagon, Users } from 'lucide-react';

function isTopmostModalBackdrop(target: HTMLElement | null): boolean {
  if (!target) return false;
  const backdrops = Array.from(
    document.querySelectorAll<HTMLElement>('[data-modal-backdrop="true"]:not([data-auth-gate="true"])')
  );
  if (backdrops.length === 0) return true;
  const getZ = (el: HTMLElement) => {
    const attrZ = Number(el.dataset.modalZ);
    if (!Number.isNaN(attrZ) && attrZ > 0) return attrZ;
    const computed = Number.parseInt(window.getComputedStyle(el).zIndex, 10);
    return Number.isNaN(computed) ? 0 : computed;
  };
  let topEl = backdrops[0];
  let topZ = getZ(topEl);
  for (let i = 1; i < backdrops.length; i++) {
    const z = getZ(backdrops[i]);
    if (z >= topZ) {
      topEl = backdrops[i];
      topZ = z;
    }
  }
  return topEl === target;
}

export const MobileStpSheet: React.FC = () => {
  const { stpPreviewCode, setStpPreviewCode, tests, uploadStpDocFile, openPreviewDoc, pushToast } = useApp();
  const { lang, tx } = usePrefs();
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stpPreviewCode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isTopmostModalBackdrop(backdropRef.current)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setStpPreviewCode(null);
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [stpPreviewCode, setStpPreviewCode]);

  if (!stpPreviewCode || typeof document === 'undefined') return null;
  const test = tests.find((t) => t.code === stpPreviewCode) || tests[0];
  const files = test.stpFiles || [];
  const docTypes = ['ALL', ...Array.from(new Set(files.map((f) => f.docType).filter(Boolean) as string[]))];
  const visibleFiles = docTypeFilter === 'ALL' ? files : files.filter((f) => f.docType === docTypeFilter);

  const stpPdfHref = test.stpPdfUrl ? resolveDocLink(test.stpPdfUrl).downloadUrl || test.stpPdfUrl : undefined;
  const wsPdfHref = test.worksheetPdfUrl || (test.worksheetUrl ? resolveDocLink(test.worksheetUrl).downloadUrl || test.worksheetUrl : undefined);
  const reportPdfHref = FORMAL_REPORT_PDF_URLS[test.code];
  const orderFormPdfHref = test.orderFormUrl ? resolveDocLink(test.orderFormUrl).downloadUrl || test.orderFormUrl : undefined;
  const dailyRecordPdfHref = test.dailyRecordUrl ? resolveDocLink(test.dailyRecordUrl).downloadUrl || test.dailyRecordUrl : undefined;
  const muPdfHref = test.muTemplateUrl ? resolveDocLink(test.muTemplateUrl).downloadUrl || test.muTemplateUrl : undefined;

  const handleUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const targetType = docTypeFilter === 'ALL' ? tx('現場完成紀錄 / 相片', 'Completed Field Record / Photo') : docTypeFilter;
      uploadStpDocFile(test.code, {
        fileName: f.name,
        fileSize: `${Math.max(1, Math.round(f.size / 1024))} KB`,
        docType: targetType,
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
      pushToast(tx('已上傳現場紀錄或相片', 'Uploaded field record / photo'), f.name);
      ev.target.value = '';
    };
    reader.readAsDataURL(f);
  };

  return createPortal(
    <div
      ref={backdropRef}
      data-modal-backdrop="true"
      data-modal-z="75"
      className="fixed inset-0 z-[75] flex flex-col justify-end bg-black/45"
      onMouseDown={(e) => e.target === e.currentTarget && setStpPreviewCode(null)}
    >
      <div className="flex max-h-[92dvh] w-full max-w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-slate-50 px-4 pt-2.5 pb-3">
          <div className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-slate-300" />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={test.acc ? 'ok' : 'warn'}>{test.acc ? 'HOKLAS 298' : tx('籌備認證', 'Pending HOKLAS')}</Badge>
                <span className="font-mono text-xs font-extrabold text-brand-deep">{test.stpDocCode} · {test.stpRev}</span>
                <Badge tone="ok">PDF</Badge>
              </div>
              <div className="mt-1 text-sm font-extrabold text-slate-900">{test.code} — {test.name}</div>
              <div className="text-[11px] text-slate-500">{test.std} · Eff: {test.stpEffectiveDate}</div>
            </div>
            <button
              type="button"
              onClick={() => setStpPreviewCode(null)}
              aria-label={tx('關閉', 'Close')}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-slate-200/70 p-2 text-slate-700 shrink-0 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 p-3 text-rose-800">
          <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="text-[11px] font-semibold leading-snug">
            {tx(
              `僅提供最新生效受控 PDF 版本 ${test.stpDocCode} ${test.stpRev}；所有舊版已封存作廢。`,
              `Serves current controlled PDF revision ${test.stpDocCode} ${test.stpRev} only; obsolete versions are locked.`
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {stpPdfHref && (
            <>
              <button
                type="button"
                onClick={() =>
                  openPreviewDoc({
                    title: `${test.stpDocCode} ${test.stpRev}`,
                    url: stpPdfHref,
                    fileName: `${test.stpDocCode}.pdf`,
                    subtitle: test.std,
                  })
                }
                className="col-span-2 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand px-3 py-3 text-sm font-extrabold text-white shadow-xs cursor-pointer"
              >
                <Eye className="h-4 w-4" /> {tx(`預覽受控 STP PDF · ${test.stpDocCode}`, `Preview Controlled STP PDF · ${test.stpDocCode}`)}
              </button>
              <a
                href={stpPdfHref}
                download={`${test.stpDocCode}.pdf`}
                className="min-h-[44px] inline-flex items-center justify-center gap-1 rounded-xl border border-brand/40 bg-white px-2.5 py-2.5 font-extrabold text-brand-deep"
              >
                <Download className="h-3.5 w-3.5" /> {tx('下載 STP PDF', 'Download STP PDF')}
              </a>
            </>
          )}
          {wsPdfHref && (
            <a
              href={wsPdfHref}
              download={wsPdfHref.split('/').pop() || `${test.code}_Worksheet.pdf`}
              className="min-h-[44px] inline-flex items-center justify-center gap-1 rounded-xl border border-brand/40 bg-brand-wash/50 px-2.5 py-2.5 font-extrabold text-brand-deep"
            >
              <Download className="h-3.5 w-3.5" /> {tx('下載空白 Worksheet PDF', 'Worksheet PDF')}
            </a>
          )}
          {wsPdfHref && (
            <button
              type="button"
              onClick={() =>
                openPreviewDoc({
                  title: `${test.code} — Worksheet`,
                  url: wsPdfHref,
                  fileName: wsPdfHref.split('/').pop() || `${test.code}_Worksheet.pdf`,
                })
              }
              className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 font-bold text-slate-700 cursor-pointer"
            >
              {tx('預覽空白 Worksheet', 'Preview Worksheet')}
            </button>
          )}
          {reportPdfHref && (
            <button
              type="button"
              onClick={() =>
                openPreviewDoc({
                  title: `${test.code} — Formal Report Template`,
                  url: reportPdfHref,
                  fileName: reportPdfHref.split('/').pop(),
                })
              }
              className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 font-bold text-slate-700 cursor-pointer"
            >
              {tx('預覽正式報告 PDF', 'Formal Report PDF')}
            </button>
          )}
          {orderFormPdfHref && (
            <button
              type="button"
              onClick={() => openPreviewDoc({ title: `${test.code} — FQS08`, url: orderFormPdfHref })}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 font-bold text-slate-700 cursor-pointer"
            >
              {tx('預覽 FQS08 委託單', 'FQS08 Order Form')}
            </button>
          )}
          {dailyRecordPdfHref && (
            <button
              type="button"
              onClick={() => openPreviewDoc({ title: `${test.code} — FQS09`, url: dailyRecordPdfHref })}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 font-bold text-slate-700 cursor-pointer"
            >
              {tx('預覽 FQS09 每日紀錄', 'FQS09 Daily Record')}
            </button>
          )}
          {muPdfHref && (
            <button
              type="button"
              onClick={() => openPreviewDoc({ title: `${test.code} — MU`, url: muPdfHref })}
              className="col-span-2 min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 font-bold text-slate-700 cursor-pointer"
            >
              {test.code === 'PLT'
                ? tx('預覽 750kPa 反力架結構驗算 PDF', 'Preview 750kPa Setup Check PDF')
                : tx('預覽 MU 測量不確定度表 PDF', 'Preview MU Uncertainty PDF')}
            </button>
          )}
        </div>

        {(test.approvedSignatories?.length || test.qualifiedOperators?.length) ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 font-extrabold text-emerald-900">
                <Users className="h-4 w-4 text-emerald-700" /> {tx('FQS49 授權人員', 'FQS49 Personnel')}
              </span>
              <button
                type="button"
                onClick={() => openPreviewDoc({ title: 'FQS49', url: '/server-docs/forms/FQS49_List_of_Qualified_Operator_260323.pdf' })}
                className="font-bold text-emerald-800 underline cursor-pointer"
              >
                PDF
              </button>
            </div>
            {test.approvedSignatories?.length ? (
              <div>
                <span className="font-bold text-slate-600">{tx('授權簽署人：', 'Signatories: ')}</span>
                <span className="font-semibold text-slate-900">{test.approvedSignatories.join(lang === 'en' ? ', ' : '、')}</span>
              </div>
            ) : null}
            {test.qualifiedOperators?.length ? (
              <div>
                <span className="font-bold text-slate-600">{tx('合資格操作員：', 'Operators: ')}</span>
                <span className="text-slate-800">{test.qualifiedOperators.join(lang === 'en' ? ', ' : '、')}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
          <div className="font-extrabold text-slate-900">{tx('現行 STP 核心檢查要點', 'Key Checkpoints')}</div>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-700 leading-relaxed">
            {test.keyParams.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
            <span className="font-bold">{tx('必備校準器材：', 'Required Gear: ')}</span>
            {test.equipmentTypes.join(' · ')}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-slate-900">
              {tx(`關聯 PDF 及現場紀錄 · ${files.length}`, `PDFs & Field Records · ${files.length}`)}
            </span>
            <label className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 font-extrabold text-white cursor-pointer">
              <UploadCloud className="h-4 w-4" />
              <span>{tx('上傳已完成紀錄表 / 相片', 'Upload Record / Photo')}</span>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,image/*" onChange={handleUpload} className="hidden" />
            </label>
          </div>
          {docTypes.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 pr-4">
              {docTypes.map((dt) => (
                <button
                  key={dt}
                  type="button"
                  onClick={() => setDocTypeFilter(dt)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold shrink-0 cursor-pointer ${
                    docTypeFilter === dt ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {dt === 'ALL' ? tx('全部類別', 'All') : dt.replace(/\(PDF.*?\)/gi, 'PDF')}
                </button>
              ))}
              <div className="w-2 shrink-0" aria-hidden="true" />
            </div>
          )}
          {visibleFiles.map((f) => {
            const pdfUrl = f.dataUrl ? resolveDocLink(f.dataUrl).downloadUrl || f.dataUrl : undefined;
            return (
              <div key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-slate-900">{f.fileName.replace(/\(PDF\s*\+\s*(XLSX?|DOCX?)\)/gi, 'PDF')}</div>
                  <div className="text-[10px] text-slate-500">
                    {(f.docType || 'PDF').replace(/PDF\s*\+\s*(XLSX?|DOCX?)/gi, 'PDF')} · {(f.fileSize || 'PDF').replace(/PDF\s*\+\s*(XLSX?|DOCX?)/gi, 'PDF')}
                  </div>
                </div>
                {pdfUrl && (
                  <button
                    type="button"
                    onClick={() => openPreviewDoc({ title: f.fileName, url: pdfUrl, fileName: f.fileName })}
                    className="min-h-[40px] rounded-lg bg-white border border-slate-200 px-3 py-1.5 font-extrabold text-brand-deep shrink-0 cursor-pointer"
                  >
                    {tx('預覽 PDF', 'PDF')}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5">
          <div className="font-extrabold text-slate-700">{tx('受控版本紀錄 — 舊版已封存', 'Controlled Revision History')}</div>
          {test.versions.map((v) => (
            <div key={v.ver} className="flex items-center justify-between gap-2 rounded-xl bg-white p-2.5 border border-slate-100">
              <div className="min-w-0 flex-1">
                <div className={`font-mono font-bold ${v.status === 'obsolete' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                  {v.ver}
                </div>
                {v.note && <div className="text-[10px] text-slate-500">{v.note}</div>}
              </div>
              <Badge tone={v.status === 'current' ? 'ok' : 'bad'}>
                {v.status === 'current' ? tx('現行', 'Current') : tx('作廢', 'Obsolete')}
              </Badge>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
