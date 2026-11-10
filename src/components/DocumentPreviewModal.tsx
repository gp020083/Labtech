import React, { useEffect, useMemo, useState } from 'react';
import { usePrefs } from '../prefs';
import { resolveDocLink, dataUrlToBlobUrl } from '../driveDocs';
import { PdfCanvasViewer } from './PdfCanvasViewer';
import { X, ExternalLink, Download, FileText, FileSpreadsheet, Cloud } from 'lucide-react';

export interface PreviewDocRequest {
  title: string;
  url: string;
  fileName?: string;
  subtitle?: string;
}

export const DocumentPreviewModal: React.FC<{
  doc: PreviewDocRequest | null;
  onClose: () => void;
}> = ({ doc, onClose }) => {
  const { isMobileApp, tx } = usePrefs();
  const [pdfFetchFailed, setPdfFetchFailed] = useState(false);

  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc, onClose]);

  const safeUrl = useMemo(() => {
    if (!doc?.url) return '';
    if (doc.url.startsWith('data:')) return dataUrlToBlobUrl(doc.url);
    return doc.url;
  }, [doc?.url]);

  useEffect(() => {
    return () => {
      if (safeUrl.startsWith('blob:') && doc?.url.startsWith('data:')) {
        URL.revokeObjectURL(safeUrl);
      }
    };
  }, [safeUrl, doc?.url]);

  const resolved = useMemo(
    () => (doc ? resolveDocLink(doc.url.startsWith('data:') ? safeUrl : doc.url, doc.fileName || doc.title) : null),
    [doc, safeUrl]
  );

  // PDFs are rendered in-app with PDF.js (see PdfCanvasViewer) so preview works even when the
  // browser's built-in PDF reader is disabled by policy ("Always download PDF files") or on iOS.
  useEffect(() => {
    setPdfFetchFailed(false);
  }, [doc?.url]);

  if (!doc || !resolved) return null;

  const driveEmbedFallback = resolved.driveId ? `https://drive.google.com/file/d/${resolved.driveId}/preview` : undefined;
  const driveOpenFallback = resolved.driveId ? `https://drive.google.com/file/d/${resolved.driveId}/view` : undefined;
  const pdfSrc = resolved.kind === 'pdf' ? resolved.embedUrl || safeUrl : '';

  const openHref = pdfFetchFailed && driveOpenFallback ? driveOpenFallback : resolved.openTabUrl || safeUrl;
  const pdfDlHref = resolved.pdfCompanionUrl || (resolved.kind === 'pdf' ? pdfSrc : undefined);
  const officeDlHref = resolved.officeCompanionUrl;
  const officeExt = resolved.officeExt;
  const isExcel = officeExt === 'XLSX' || officeExt === 'XLS';
  const officeLabel = isExcel
    ? tx(`下載 Excel (.${officeExt?.toLowerCase()})`, `Download Excel (.${officeExt?.toLowerCase()})`)
    : tx(`下載 Word (.${(officeExt || 'doc').toLowerCase()})`, `Download Word (.${(officeExt || 'doc').toLowerCase()})`);
  const embedSrc = resolved.embedUrl || safeUrl;

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/70 ${isMobileApp ? 'p-0' : 'p-2 sm:p-5'}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`flex flex-col overflow-hidden bg-white shadow-2xl ${isMobileApp ? 'h-[100dvh] w-full max-w-full rounded-none' : 'h-[92vh] w-full max-w-6xl rounded-2xl'}`}>
        <div className="border-b border-slate-200 bg-slate-50 px-3.5 py-2.5 sm:px-4 sm:py-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 break-all text-xs sm:text-sm font-extrabold text-slate-900">{doc.title}</div>
                {doc.subtitle && <div className="truncate text-[11px] text-slate-500">{doc.subtitle}</div>}
              </div>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-xl bg-slate-200/70 p-2 text-slate-700 hover:bg-slate-300 cursor-pointer" title="Close">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {resolved.kind === 'drive' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-[10px] font-bold text-emerald-800 shrink-0">
                <Cloud className="h-3 w-3" /> Drive
              </span>
            )}
            {officeDlHref && (
              <span className="inline-flex items-center rounded-lg bg-brand-wash px-2 py-1 text-[10px] font-extrabold text-brand-deep shrink-0">
                {tx(`選擇下載格式：PDF 或 ${officeExt}`, `Choose Download: PDF or ${officeExt}`)}
              </span>
            )}
            {officeDlHref && (
              <a href={officeDlHref} download className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 shadow-xs">
                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" /> {officeLabel}
              </a>
            )}
            {pdfDlHref && (
              <a
                href={pdfDlHref}
                download={(doc.fileName || doc.title).replace(/\.(xlsx?|docx?)$/i, '') + (/\.(pdf)$/i.test(doc.fileName || doc.title) ? '' : '.pdf')}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-extrabold text-white hover:bg-brand-deep shadow-xs"
              >
                <Download className="h-3.5 w-3.5 shrink-0" /> {tx('下載 PDF (.pdf)', 'Download PDF (.pdf)')}
              </a>
            )}
            {!pdfDlHref && resolved.downloadUrl && (
              <a href={resolved.downloadUrl} download={doc.fileName || true} target={resolved.kind === 'drive' ? '_blank' : undefined} rel="noopener noreferrer" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-extrabold text-white hover:bg-brand-deep">
                <Download className="h-3.5 w-3.5 shrink-0" /> {tx('下載檔案 (.pdf)', 'Download PDF')}
              </a>
            )}
            {openHref && (
              <a href={openHref} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-100">
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-brand" /> {tx('全螢幕開啟 PDF', 'Open PDF in New Tab')}
              </a>
            )}
          </div>
        </div>

        <div className="flex-1 bg-slate-100 relative overflow-hidden">
          {resolved.kind === 'pdf' && !(pdfFetchFailed && driveEmbedFallback) ? (
            <PdfCanvasViewer
              src={pdfSrc}
              onError={() => setPdfFetchFailed(true)}
              labels={{
                loading: tx('正在載入 PDF 文件...', 'Loading PDF document...'),
                failed: tx('無法預覽此 PDF，請使用上方按鈕下載', 'Unable to preview this PDF. Please use the download button above.'),
              }}
            />
          ) : resolved.kind === 'drive' || resolved.kind === 'pdf' ? (
            <iframe src={driveEmbedFallback || embedSrc} title={doc.title} className="h-full w-full border-0 bg-white" allow="autoplay" />
          ) : resolved.kind === 'image' ? (
            <div className="flex h-full w-full items-center justify-center p-3">
              <img src={embedSrc} alt={doc.title} className="max-h-full max-w-full rounded-lg object-contain shadow-md" />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-xs text-slate-600">
              <FileText className="h-12 w-12 text-brand" />
              <div className="text-sm font-extrabold text-slate-900">
                {tx('此檔案格式未能直接預覽，請下載後開啟', 'This file type cannot be previewed. Please download it.')}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {openHref && (
                  <a href={openHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 font-extrabold text-white">
                    <ExternalLink className="h-4 w-4" /> {tx('全螢幕開啟檔案', 'Open Full Screen')}
                  </a>
                )}
                {officeDlHref && (
                  <a href={officeDlHref} download className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 font-extrabold text-white">
                    <FileSpreadsheet className="h-4 w-4" /> {officeLabel}
                  </a>
                )}
                {pdfDlHref && (
                  <a href={pdfDlHref} download className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-extrabold text-slate-800">
                    <Download className="h-4 w-4" /> {tx('下載 PDF', 'Download PDF')}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
