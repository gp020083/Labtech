import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Loader2, AlertTriangle } from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * In-app PDF renderer built on PDF.js.
 *
 * Why: company-managed Edge / Chrome can enforce "Always download PDF files",
 * and iOS Safari only shows page 1 of a PDF inside an <iframe>. Rendering the
 * pages to <canvas> ourselves makes preview work regardless of browser policy.
 * PDF.js is loaded lazily so it never bloats the main bundle.
 */

type PdfJsLib = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
let pdfjsPromise: Promise<PdfJsLib> | null = null;

function loadPdfJs(): Promise<PdfJsLib> {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    });
    pdfjsPromise.catch(() => {
      pdfjsPromise = null;
    });
  }
  return pdfjsPromise;
}

async function readPdfBytes(src: string): Promise<Uint8Array> {
  const res = await fetch(src, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('text/html')) throw new Error('Received HTML instead of PDF');
  const bytes = new Uint8Array(await res.arrayBuffer());
  const magic = String.fromCharCode(...bytes.slice(0, 5));
  if (!magic.startsWith('%PDF')) throw new Error('Missing %PDF header');
  return bytes;
}

const MAX_CANVAS_PIXELS = 12_000_000; // stays under iOS Safari canvas limits

const PdfPage: React.FC<{
  pdf: PDFDocumentProxy;
  pageNumber: number;
  cssWidth: number;
  fallbackRatio: number;
}> = ({ pdf, pageNumber, cssWidth, fallbackRatio }) => {
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [ratio, setRatio] = useState(fallbackRatio);

  useEffect(() => {
    const el = holderRef.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '800px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || cssWidth <= 0) return;
    let task: RenderTask | null = null;
    let cancelled = false;

    (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const cssScale = cssWidth / base.width;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixels = base.width * cssScale * dpr * base.height * cssScale * dpr;
      if (pixels > MAX_CANVAS_PIXELS) dpr *= Math.sqrt(MAX_CANVAS_PIXELS / pixels);
      const viewport = page.getViewport({ scale: cssScale * dpr });
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = page.render({ canvasContext: ctx, viewport });
      await task.promise.catch(() => undefined);
    })().catch(() => undefined);

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, pageNumber, cssWidth, visible]);

  return (
    <div
      ref={holderRef}
      className="relative mx-auto bg-white shadow-md ring-1 ring-slate-200"
      style={{ width: cssWidth, height: cssWidth * ratio }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      <span className="absolute bottom-1.5 right-2 rounded bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
        {pageNumber} / {pdf.numPages}
      </span>
    </div>
  );
};

export const PdfCanvasViewer: React.FC<{
  src: string;
  onError?: (err: Error) => void;
  labels?: { loading: string; failed: string };
}> = ({ src, onError, labels }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [firstRatio, setFirstRatio] = useState(1.414);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    setPdf(null);
    setError(null);
    setZoom(1);

    (async () => {
      const [lib, data] = await Promise.all([loadPdfJs(), readPdfBytes(src)]);
      const doc = await lib.getDocument({ data, isEvalSupported: false }).promise;
      loaded = doc;
      if (cancelled) {
        doc.destroy();
        return;
      }
      const first = await doc.getPage(1);
      const vp = first.getViewport({ scale: 1 });
      if (!cancelled) {
        setFirstRatio(vp.height / vp.width);
        setPdf(doc);
      }
    })().catch((err: Error) => {
      if (cancelled) return;
      setError(err?.message || 'PDF load failed');
      onErrorRef.current?.(err);
    });

    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [src]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const fitWidth = Math.max(0, Math.min(containerWidth - 24, 1100));
  const pageWidth = Math.round(fitWidth * zoom);

  return (
    <div className="flex h-full flex-col">
      {pdf && (
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
          <span className="tabular-nums">{pdf.numPages} 頁</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="rounded-lg p-1.5 hover:bg-slate-100 cursor-pointer" aria-label="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="rounded-lg p-1.5 hover:bg-slate-100 cursor-pointer" aria-label="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setZoom(1)} className="rounded-lg p-1.5 hover:bg-slate-100 cursor-pointer" aria-label="Fit width">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-auto bg-slate-100 py-3">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-xs text-slate-600">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div className="text-sm font-extrabold text-slate-900">{labels?.failed || 'Unable to render this PDF'}</div>
            <div className="text-[11px] text-slate-400">{error}</div>
          </div>
        ) : !pdf || pageWidth <= 0 ? (
          <div className="flex h-full items-center justify-center gap-2 text-xs font-bold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> {labels?.loading || 'Loading PDF...'}
          </div>
        ) : (
          <div className="space-y-3 px-3" style={{ minWidth: pageWidth + 24 }}>
            {Array.from({ length: pdf.numPages }, (_, i) => (
              <PdfPage key={i} pdf={pdf} pageNumber={i + 1} cssWidth={pageWidth} fallbackRatio={firstRatio} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfCanvasViewer;
