import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { EquipmentItem } from '../types';
import { getEquipmentCalStatus } from '../utils';
import { matchEquipmentByQrOrQuery } from '../utils/limsProcessTools';
import {
  generateEquipmentQrCode,
  buildEquipmentCertStatusPath,
  navigateToEquipmentCertPage,
} from '../utils/equipmentQr';
import { Badge } from './Badge';
import {
  QrCode,
  Printer,
  Search,
  Camera,
  X,
  Eye,
  FileCheck2,
  ArrowRightLeft,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const EquipmentQrSvg: React.FC<{
  code: string;
  due?: string;
  size?: number;
  onClick?: () => void;
}> = ({ code, size = 92, onClick }) => {
  const qr = useMemo(() => generateEquipmentQrCode(code, { sizePx: size, marginModules: 2 }), [code, size]);
  const n = qr.moduleCount;
  const margin = 2;
  const total = n + margin * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      onClick={onClick}
      shapeRendering="crispEdges"
      className={`rounded-lg border border-slate-200 bg-white p-1 shrink-0 ${
        onClick ? 'cursor-pointer hover:border-brand transition' : ''
      }`}
      role="img"
      aria-label={`QR Code for ${code} (${qr.path})`}
    >
      <title>{`${code} → ${qr.url}`}</title>
      <rect width={total} height={total} fill="#ffffff" />
      {qr.matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c + margin}
              y={r + margin}
              width={1}
              height={1}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  );
};

export const EquipmentQrModal: React.FC<{
  initialMode?: 'lookup' | 'labels';
  initialCode?: string | null;
  onClose: () => void;
  onOpenCheckout: (eq: EquipmentItem) => void;
  onOpenReturn: (eq: EquipmentItem) => void;
  onOpenDetail: (code: string) => void;
}> = ({
  initialMode = 'lookup',
  initialCode = null,
  onClose,
  onOpenCheckout,
  onOpenReturn,
  onOpenDetail,
}) => {
  const { equipment, openPreviewDoc, pushToast } = useApp();
  const { lang, tx } = usePrefs();
  const [mode, setMode] = useState<'lookup' | 'labels'>(initialCode ? 'labels' : initialMode);
  const [scanInput, setScanInput] = useState<string>(initialCode || '');
  const [labelTagFilter, setLabelTagFilter] = useState<string>('ALL');
  const [onlySelectedCode, setOnlySelectedCode] = useState<string | null>(initialCode);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatusMsg, setCameraStatusMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const inUseEquipment = useMemo(() => equipment.filter((e) => e.inUse !== 'N'), [equipment]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCameraScan = async () => {
    setCameraStatusMsg(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatusMsg(
        tx(
          '此瀏覽器環境不支援直接開啟鏡頭，請直接輸入器材編號或網址路徑（如 /equipment/LT-KM-04/cert）',
          'Camera API unavailable in this environment; please enter equipment code or URL path below.'
        )
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraStatusMsg(
        tx(
          '無法存取相機鏡頭（或未授權），請直接輸入器材代號如 KM-04 / FC-01 快速查找',
          'Camera permission denied or no camera detected. Type code e.g. KM-04 / FC-01 below.'
        )
      );
    }
  };

  const matchedLookupItems = useMemo(() => {
    if (!scanInput.trim()) return inUseEquipment.slice(0, 6);
    return matchEquipmentByQrOrQuery(inUseEquipment, scanInput);
  }, [inUseEquipment, scanInput]);

  const labelItems = useMemo(() => {
    if (onlySelectedCode) {
      return inUseEquipment.filter((e) => e.code === onlySelectedCode);
    }
    if (labelTagFilter === 'ALL') return inUseEquipment;
    return inUseEquipment.filter((e) => {
      const tags = e.testTags || e.tests.split('+').map((s) => s.trim()).filter(Boolean);
      return tags.includes(labelTagFilter);
    });
  }, [inUseEquipment, labelTagFilter, onlySelectedCode]);

  const quickCodes = ['LT-KM-04', 'LT-SO-01', 'LT-FC-01', 'LT-PL-01', 'LT-PLT-01', 'LT-IN-01'];

  const handlePrintLabels = () => {
    window.print();
  };

  const handleOpenCertPage = (code: string) => {
    stopCamera();
    onClose();
    navigateToEquipmentCertPage(code);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-2 sm:p-4 overflow-y-auto print:bg-white print:p-0"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
    >
      <div className="my-auto flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden print:max-h-none print:rounded-none print:border-none print:shadow-none">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-900 px-4 py-3.5 text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
              <QrCode className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold">
                {tx('🏷️ 器材 QR Code 標籤列印及快速掃描借還中心', '🏷️ Equipment QR Code Labels & Quick Scan Lookup')}
              </h2>
              <p className="text-[11px] text-slate-300">
                {tx(
                  `全部 ${inUseEquipment.length} 件儀器 QR 均編碼直達專屬校準狀態網址 (/equipment/:code/cert)`,
                  `All ${inUseEquipment.length} QR codes encode direct URL paths (/equipment/:code/cert) to detail & cal cert status pages`
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-800 p-1 text-xs font-extrabold">
              <button
                type="button"
                onClick={() => setMode('lookup')}
                className={`rounded-lg px-3 py-1.5 transition cursor-pointer whitespace-nowrap ${
                  mode === 'lookup' ? 'bg-brand text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {tx('📷 快速掃描／代號借還', '📷 Quick Scan / Lookup')}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setMode('labels');
                }}
                className={`rounded-lg px-3 py-1.5 transition cursor-pointer whitespace-nowrap ${
                  mode === 'labels' ? 'bg-brand text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {tx(`🏷️ A4 標籤貼紙 (${labelItems.length})`, `🏷️ QR Labels (${labelItems.length})`)}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {mode === 'lookup' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
            {/* Search / Scan Input Bar */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand" />
                  <input
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder={tx(
                      '掃描 QR 網址 (/equipment/LT-KM-04/cert) 或輸入器材編號／簡碼／S/N...',
                      'Scan QR URL (/equipment/LT-KM-04/cert) or type Equipment Code / S/N...'
                    )}
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm font-mono font-bold text-slate-900 outline-none focus:border-brand"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => (cameraActive ? stopCamera() : startCameraScan())}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold cursor-pointer whitespace-nowrap ${
                    cameraActive
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  {cameraActive ? tx('關閉相機鏡頭', 'Stop Camera') : tx('開啟手機相機掃描', 'Open Camera Scanner')}
                </button>
              </div>

              {cameraActive && (
                <div className="rounded-2xl border border-brand/40 bg-slate-950 p-3 text-white space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-400">📷 請將鏡頭對準器材上的 Labtech QR 標籤</span>
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        pushToast(
                          tx('已識別 QR 網址，跳轉至專屬校準狀態頁', 'QR URL recognized, opening Calibration Status Page'),
                          '/equipment/LT-KM-04/cert'
                        );
                        handleOpenCertPage('LT-KM-04');
                      }}
                      className="rounded-lg bg-brand px-2.5 py-1 text-[11px] font-extrabold text-white cursor-pointer"
                    >
                      {tx('模擬掃描 /equipment/LT-KM-04/cert', 'Simulate Scan /equipment/LT-KM-04/cert')}
                    </button>
                  </div>
                  <video ref={videoRef} autoPlay playsInline muted className="h-44 w-full rounded-xl object-cover bg-slate-900" />
                </div>
              )}

              {cameraStatusMsg && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
                  💡 {cameraStatusMsg}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-brand" />
                  {tx('常用儀器一鍵快選：', 'Quick Select:')}
                </span>
                {quickCodes.map((qc) => (
                  <button
                    key={qc}
                    type="button"
                    onClick={() => setScanInput(qc)}
                    className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-extrabold transition cursor-pointer ${
                      scanInput.toUpperCase() === qc
                        ? 'border-brand bg-brand text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand/50'
                    }`}
                  >
                    {qc}
                  </button>
                ))}
                {scanInput && (
                  <button
                    type="button"
                    onClick={() => setScanInput('')}
                    className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    {tx('清除', 'Clear')}
                  </button>
                )}
              </div>
            </div>

            {/* Matched Equipment Action Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900">
                  {scanInput.trim()
                    ? tx(`匹配結果 (${matchedLookupItems.length} 件)`, `Matched Instruments (${matchedLookupItems.length})`)
                    : tx('精選常用儀器（輸入編號可搜尋全部 51 件）', 'Featured Instruments (Type code to search all 51)')}
                </span>
              </div>

              {matchedLookupItems.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-400">
                  {tx(`找不到與「${scanInput}」相符的器材`, `No equipment matched "${scanInput}"`)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matchedLookupItems.slice(0, 8).map((eq) => {
                    const cal = getEquipmentCalStatus(eq, undefined, lang);
                    const tags = eq.testTags || eq.tests.split('+').map((s) => s.trim()).filter(Boolean);
                    const directPath = buildEquipmentCertStatusPath(eq.code);
                    return (
                      <div
                        key={eq.code}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-lg bg-slate-900 px-2.5 py-0.5 font-mono text-xs font-extrabold text-white">
                                {eq.code}
                              </span>
                              {tags.map((tg) => (
                                <span
                                  key={tg}
                                  className="rounded bg-brand-wash px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-brand-deep"
                                >
                                  {tg}
                                </span>
                              ))}
                              <Badge tone={cal.kind}>{cal.label}</Badge>
                            </div>
                            <div className="text-sm font-extrabold text-slate-900 truncate">{eq.name}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {eq.maker} · {eq.model} ｜ S/N: {eq.serial}
                            </div>
                            <div className="font-mono text-[11px] text-slate-600">
                              Cal Due: <strong className="text-emerald-800 tabular-nums">{eq.certDue || eq.due}</strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenCertPage(eq.code)}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-brand-wash px-2 py-0.5 font-mono text-[10px] font-extrabold text-brand-deep transition cursor-pointer"
                              title={tx('開啟此器材專屬詳情及校準認證狀態頁', 'Open unique detail & calibration certification status page')}
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              {directPath}
                            </button>
                            <div className="pt-0.5">
                              {eq.currentLoan ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-brand-wash px-2 py-0.5 text-[11px] font-bold text-brand-deep">
                                  📍 {eq.currentLoan.siteLocation} ({eq.currentLoan.borrowerName})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                  🏠 {tx('在庫可借用：', 'In Lab: ')}
                                  {eq.loc || eq.store || 'Lab'}
                                </span>
                              )}
                            </div>
                          </div>

                          <EquipmentQrSvg
                            code={eq.code}
                            due={eq.certDue || eq.due}
                            size={82}
                            onClick={() => handleOpenCertPage(eq.code)}
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
                          {eq.currentLoan ? (
                            <button
                              type="button"
                              onClick={() => {
                                stopCamera();
                                onClose();
                                onOpenReturn(eq);
                              }}
                              className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-2 font-extrabold text-white hover:bg-emerald-700 cursor-pointer whitespace-nowrap"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> {tx('立即交還', 'Return')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                stopCamera();
                                onClose();
                                onOpenCheckout(eq);
                              }}
                              className="inline-flex items-center justify-center gap-1 rounded-xl bg-brand px-2.5 py-2 font-extrabold text-white hover:bg-brand-deep cursor-pointer whitespace-nowrap"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" /> {tx('立即借出', 'Checkout')}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenCertPage(eq.code)}
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-2 font-extrabold text-emerald-800 hover:bg-emerald-100 cursor-pointer whitespace-nowrap"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> {tx('校準狀態頁', 'Cert Page')}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              stopCamera();
                              onClose();
                              onOpenDetail(eq.code);
                            }}
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                          >
                            <FileCheck2 className="h-3.5 w-3.5 text-brand" /> {tx('抽屜檔案', 'Drawer')}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOnlySelectedCode(eq.code);
                              setMode('labels');
                            }}
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                          >
                            <QrCode className="h-3.5 w-3.5 text-slate-700" /> {tx('列印標籤', 'Print QR')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Mode 2: A4 Printable QR Code Sticker Sheet */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs print:p-0 print:overflow-visible">
            {/* Filter & Print Bar (Hidden in Print) */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 print:hidden">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['ALL', 'KD', 'SO', 'FC', 'BL', 'PO', 'PLT', 'VC'] as const).map((tg) => (
                  <button
                    key={tg}
                    type="button"
                    onClick={() => {
                      setOnlySelectedCode(null);
                      setLabelTagFilter(tg);
                    }}
                    className={`rounded-xl px-3 py-1.5 font-mono text-xs font-extrabold cursor-pointer ${
                      !onlySelectedCode && labelTagFilter === tg
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tg === 'ALL' ? tx(`全部儀器 (${inUseEquipment.length})`, `ALL (${inUseEquipment.length})`) : tg}
                  </button>
                ))}
                {onlySelectedCode && (
                  <button
                    type="button"
                    onClick={() => setOnlySelectedCode(null)}
                    className="rounded-xl bg-brand-wash border border-brand/30 px-3 py-1.5 font-mono text-xs font-extrabold text-brand-deep cursor-pointer"
                  >
                    {tx(`只顯示 ${onlySelectedCode} (點擊顯示全部)`, `Showing ${onlySelectedCode} (Show All)`)}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handlePrintLabels}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-deep cursor-pointer whitespace-nowrap"
              >
                <Printer className="h-4 w-4" />
                {tx(`🖨️ 一鍵列印 A4 貼紙排版 (${labelItems.length} 張)`, `🖨️ Print A4 Sticker Sheet (${labelItems.length})`)}
              </button>
            </div>

            {/* A4 3-Column Sticker Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
              {labelItems.map((eq) => {
                const tags = eq.testTags || eq.tests.split('+').map((s) => s.trim()).filter(Boolean);
                const directPath = buildEquipmentCertStatusPath(eq.code);
                return (
                  <div
                    key={eq.code}
                    className="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-800 bg-white p-3.5 shadow-2xs print:rounded-lg print:p-2.5 print:shadow-none break-inside-avoid"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1 border-b border-slate-200 pb-1">
                        <span className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-brand-deep">
                          LABTECH · HOKLAS 298
                        </span>
                        <span className="font-mono text-[10px] font-bold text-slate-500">
                          {tags.join('/')}
                        </span>
                      </div>
                      <div className="font-mono text-base font-black text-slate-900 tracking-tight">
                        {eq.code}
                      </div>
                      <div className="text-[11px] font-extrabold text-slate-800 truncate" title={eq.name}>
                        {eq.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 truncate">
                        S/N: {eq.serial || '—'}
                      </div>
                      <div className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-emerald-900 tabular-nums">
                        CAL DUE: {eq.certDue || eq.due || '—'}
                      </div>
                      <div
                        onClick={() => handleOpenCertPage(eq.code)}
                        className="font-mono text-[9px] font-bold text-brand-deep hover:underline truncate cursor-pointer"
                        title={directPath}
                      >
                        {directPath}
                      </div>
                    </div>

                    <EquipmentQrSvg
                      code={eq.code}
                      due={eq.certDue || eq.due}
                      size={84}
                      onClick={() => handleOpenCertPage(eq.code)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

