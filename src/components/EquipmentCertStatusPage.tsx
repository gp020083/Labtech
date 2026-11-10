import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { EquipmentItem } from '../types';
import { getEquipmentCalStatus, getHkTodayIso } from '../utils';
import { getLoanOverdueStatus } from '../utils/limsRules';
import { generateEquipmentQrCode } from '../utils/equipmentQr';
import { resolveDocLink } from '../driveDocs';
import { Badge } from './Badge';
import { CalCertUploadBox } from './CalCertUploadBox';
import { LoanDetailModal } from './LoanDetailModal';
import { EquipmentCheckoutModal } from './EquipmentCheckoutModal';
import { EquipmentReturnModal } from './EquipmentReturnModal';
import {
  QrCode,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Printer,
  Download,
  Eye,
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  MapPin,
  Wrench,
  FileCheck2,
  History,
  RefreshCw,
  ExternalLink,
  CheckSquare,
  ChevronRight,
} from 'lucide-react';

function diffDays(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.slice(0, 10).split('-').map(Number);
  const [y2, m2, d2] = toIso.slice(0, 10).split('-').map(Number);
  if (!y1 || !y2) return 0;
  const t1 = Date.UTC(y1, (m1 || 1) - 1, d1 || 1);
  const t2 = Date.UTC(y2, (m2 || 1) - 1, d2 || 1);
  return Math.round((t2 - t1) / 86400000);
}

export const EquipmentCertStatusPage: React.FC<{
  equipmentCode: string;
  onSelectEquipment: (code: string) => void;
  onClose: () => void;
}> = ({ equipmentCode, onSelectEquipment, onClose }) => {
  const {
    equipment,
    loans,
    syncEquipmentCertToDue,
    uploadEquipmentCalCert,
    openPreviewDoc,
    pushToast,
  } = useApp();
  const { lang, tx } = usePrefs();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<EquipmentItem | null>(null);
  const [returnItem, setReturnItem] = useState<EquipmentItem | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  const inUseEquipment = useMemo(() => equipment.filter((e) => e.inUse !== 'N'), [equipment]);

  const item = useMemo(() => {
    const upper = (equipmentCode || '').trim().toUpperCase();
    return (
      equipment.find((e) => e.code.toUpperCase() === upper) ||
      inUseEquipment[0] ||
      null
    );
  }, [equipment, inUseEquipment, equipmentCode]);

  const qrResult = useMemo(() => {
    if (!item) return null;
    return generateEquipmentQrCode(item, { sizePx: 220, marginModules: 2 });
  }, [item]);

  if (!item || !qrResult) return null;

  const refToday = getHkTodayIso();
  const cal = getEquipmentCalStatus(item, refToday, lang);
  const overdueStatus = getLoanOverdueStatus(item, refToday, lang);
  const effectiveDue = (item.certDue || item.due || '').slice(0, 10);
  const daysRemaining = effectiveDue ? diffDays(refToday, effectiveDue) : 0;
  const tags = item.testTags || item.tests.split('+').map((s) => s.trim()).filter(Boolean);
  const itemLoans = loans.filter((l) => l.equipmentCode === item.code);
  const selectedLoan = selectedLoanId ? itemLoans.find((l) => l.id === selectedLoanId) || null : null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrResult.url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = qrResult.url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedUrl(true);
    pushToast(
      tx('已複製器材專屬校準狀態網址', 'Copied equipment calibration status URL'),
      qrResult.path
    );
    setTimeout(() => setCopiedUrl(false), 2200);
  };

  const handleDownloadQrSvg = () => {
    const blob = new Blob([qrResult.svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.code}_QR_CertStatus.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushToast(
      tx('已下載器材 QR Code SVG', 'Downloaded Equipment QR Code SVG'),
      `${item.code}_QR_CertStatus.svg`
    );
  };

  const statusToneConfig =
    cal.kind === 'ok'
      ? {
          bg: 'bg-emerald-950 text-white border-emerald-700',
          pill: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
          icon: ShieldCheck,
          titleZh: 'HOKLAS 校準證書有效 (CALIBRATION VALID)',
          titleEn: 'HOKLAS CALIBRATION CERTIFICATION VALID',
        }
      : cal.kind === 'warn'
      ? {
          bg: 'bg-amber-950 text-white border-amber-700',
          pill: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
          icon: AlertTriangle,
          titleZh: '校準即將到期 — 請安排續校 (EXPIRING SOON)',
          titleEn: 'CALIBRATION EXPIRING SOON — SCHEDULE RENEWAL',
        }
      : {
          bg: 'bg-rose-950 text-white border-rose-700',
          pill: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
          icon: XCircle,
          titleZh: '校準證書已逾期 — 嚴禁未經特批用於現場試驗 (CALIBRATION EXPIRED)',
          titleEn: 'CALIBRATION EXPIRED — DO NOT USE WITHOUT HOKLAS OVERRIDE',
        };

  const StatusIcon = statusToneConfig.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-2 sm:p-4 overflow-y-auto print:bg-white print:p-0"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto flex max-h-[94vh] w-full max-w-5xl flex-col rounded-3xl bg-slate-50 shadow-2xl border border-slate-200 overflow-hidden print:max-h-none print:rounded-none print:border-none print:bg-white print:shadow-none">
        {/* Top Action & Route Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-4 py-3 text-white print:hidden">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-extrabold text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              {tx('返回器材清單', 'Back to Registry')}
            </button>

            <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-1.5 font-mono text-xs text-emerald-400">
              <QrCode className="h-3.5 w-3.5 shrink-0 text-brand" />
              <span className="truncate">{qrResult.path}</span>
            </div>

            <select
              value={item.code}
              onChange={(e) => onSelectEquipment(e.target.value)}
              aria-label="Switch Equipment"
              className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-extrabold text-white outline-none focus:border-brand cursor-pointer"
            >
              {inUseEquipment.map((eq) => (
                <option key={eq.code} value={eq.code}>
                  {eq.code} — {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-slate-700 cursor-pointer whitespace-nowrap"
            >
              {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedUrl ? tx('已複製網址', 'Copied URL') : tx('複製專屬網址', 'Copy Direct URL')}
            </button>
            <button
              type="button"
              onClick={handleDownloadQrSvg}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-slate-700 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              {tx('下載 QR SVG', 'QR SVG')}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-brand-deep cursor-pointer whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" />
              {tx('列印狀態頁', 'Print Status')}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs print:p-2 print:overflow-visible">
          {/* Calibration Certification Status Hero Banner */}
          <div className={`rounded-3xl border p-5 shadow-md ${statusToneConfig.bg}`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold ${statusToneConfig.pill}`}>
                    <StatusIcon className="h-4 w-4" />
                    {lang === 'en' ? statusToneConfig.titleEn : statusToneConfig.titleZh}
                  </span>
                  <span className="rounded-lg bg-white/10 px-2.5 py-1 font-mono text-[11px] font-bold text-white/90">
                    HOKLAS Reg. No. 298 · FQS38 / FQS50
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline gap-3 pt-1">
                  <span className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {item.code}
                  </span>
                  <h1 className="text-lg sm:text-xl font-extrabold text-white/95">
                    {item.name}
                  </h1>
                </div>

                <div className="font-mono text-xs text-white/80">
                  {tx('製造商及型號：', 'Maker & Model: ')}
                  <strong className="text-white">{item.maker || '—'} · {item.model || '—'}</strong>
                  {' ｜ '}
                  {tx('機身序號 S/N：', 'Serial No.: ')}
                  <strong className="text-white">{item.serial || '—'}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0">
                <div className="rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                    {tx('校準有效至 Cal Due', 'Cal Valid Until')}
                  </div>
                  <div className="mt-0.5 font-mono text-base sm:text-lg font-black text-white tabular-nums">
                    {item.certDue || item.due || '—'}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                    {tx('剩餘有效日數', 'Days Remaining')}
                  </div>
                  <div className="mt-0.5 font-mono text-base sm:text-lg font-black text-white tabular-nums">
                    {effectiveDue
                      ? daysRemaining >= 0
                        ? tx(`尚餘 ${daysRemaining} 日`, `${daysRemaining} days left`)
                        : tx(`已逾期 ${Math.abs(daysRemaining)} 日`, `${Math.abs(daysRemaining)}d overdue`)
                      : '—'}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                    {tx('上次校準 Last Cal', 'Last Calibrated')}
                  </div>
                  <div className="mt-0.5 font-mono text-base sm:text-lg font-black text-white tabular-nums">
                    {item.last || '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main 2-Column Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 8 Columns: Details, Custody, Calibration Certificates & History */}
            <div className="lg:col-span-8 space-y-4">
              {/* Custody & Technical Details Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-brand" />
                    <h2 className="text-sm font-extrabold text-slate-900">
                      {tx('儀器技術檔案及即時借還狀態', 'Equipment Specification & Live Custody Status')}
                    </h2>
                  </div>
                  <Badge tone={cal.kind}>{cal.label}</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <div className="text-[11px] font-bold text-slate-500">{tx('儀器編號 Code', 'Equipment Code')}</div>
                    <div className="mt-0.5 font-mono text-sm font-black text-slate-900">{item.code}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <div className="text-[11px] font-bold text-slate-500">{tx('適用測試項目', 'Accredited Tests')}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-brand-wash px-2 py-0.5 font-mono text-[11px] font-extrabold text-brand-deep"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <div className="text-[11px] font-bold text-slate-500">{tx('常設存放位置', 'Default Storage')}</div>
                    <div className="mt-0.5 font-mono text-sm font-extrabold text-slate-900">
                      {item.loc || item.store || 'Office / Lab'}
                    </div>
                  </div>
                </div>

                {/* Live Custody Status */}
                <div
                  className={`rounded-2xl border p-4 ${
                    item.currentLoan
                      ? 'border-brand/30 bg-brand-wash/40'
                      : 'border-emerald-200 bg-emerald-50/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-brand" />
                          {item.currentLoan
                            ? tx(`📍 現正借出至工地：${item.currentLoan.siteLocation}`, `📍 On Site Loan: ${item.currentLoan.siteLocation}`)
                            : tx(`🏠 在庫可借用：${item.loc || item.store || 'Lab'}`, `🏠 Available in Lab: ${item.loc || item.store || 'Lab'}`)}
                        </span>
                        {overdueStatus.isOverdue && (
                          <span className="rounded-md bg-rose-100 border border-rose-300 px-2 py-0.5 font-mono text-[10px] font-extrabold text-rose-700">
                            🚨 {overdueStatus.label}
                          </span>
                        )}
                      </div>
                      {item.currentLoan && (
                        <div className="font-mono text-[11px] text-slate-600">
                          {tx('借用同事：', 'Borrower: ')}
                          <strong>{item.currentLoan.borrowerName}</strong>
                          {item.currentLoan.jobNo ? ` ｜ Job: ${item.currentLoan.jobNo}` : ''}
                          {' ｜ '}
                          {tx('借出日期：', 'Checkout: ')}{item.currentLoan.checkoutAt}
                          {' ｜ '}
                          {tx('預計歸還：', 'Expected Return: ')}{item.currentLoan.expectedReturn}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 print:hidden">
                      {item.currentLoan ? (
                        <button
                          type="button"
                          onClick={() => setReturnItem(item)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {tx('辦理 Return 交還入倉', 'Return Equipment')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCheckoutItem(item)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-extrabold text-white hover:bg-brand-deep cursor-pointer whitespace-nowrap"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                          {tx('辦理 Checkout 借出工地', 'Checkout to Site')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {item.monthlyCheck && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2.5 text-[11px] text-indigo-900">
                    <span className="inline-flex items-center gap-1.5 font-bold">
                      <CheckSquare className="h-4 w-4 text-indigo-700" />
                      {tx(
                        '此器材屬 FCC01 每月內部核查項目（由儀器協調員按月執行核查）',
                        'Subject to FCC01 Monthly Internal Verification Check'
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        openPreviewDoc({
                          title: tx('FCC01 (2026) 每月內檢紀錄', 'FCC01 (2026) Monthly Verification Check Record'),
                          url: '/server-docs/forms/FCC01_Monthly_Check_Record_2026.pdf',
                          fileName: 'FCC01_Monthly_Check_Record_2026.pdf',
                        })
                      }
                      className="font-extrabold text-indigo-700 hover:underline cursor-pointer print:hidden"
                    >
                      {tx('檢視 2026 FCC01 月檢表 ›', 'Preview 2026 FCC01 ›')}
                    </button>
                  </div>
                )}

                {cal.mismatch && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
                    <span>
                      {tx(
                        `⚠️ 系統登記 Due Date 與最新證書日期 不一致`,
                        `⚠️ Register Due Date (${item.due}) differs from latest Cal Cert (${item.certDue})`
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => syncEquipmentCertToDue(item.code)}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-3 py-1.5 font-extrabold text-white cursor-pointer shrink-0 print:hidden"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {tx('同步日期', 'Sync Date')}
                    </button>
                  </div>
                )}
              </div>

              {/* Active Calibration Certificate Verification Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-emerald-700" />
                    <h2 className="text-sm font-extrabold text-slate-900">
                      {tx('官方校準證書認證檔案', 'Official Calibration Certification Record')}
                    </h2>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-emerald-700">
                    {item.certUrl || (item.calCerts && item.calCerts.length > 0)
                      ? tx('✓ 已連結電子證書', '✓ Digital Cert Linked')
                      : tx('待上傳證書', 'Pending Cert Upload')}
                  </span>
                </div>

                {item.certUrl ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="space-y-1 min-w-0">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                        {tx('現時生效之最新校準證書', 'Active Calibration Certificate')}
                      </div>
                      <div className="font-mono text-xs font-extrabold text-slate-900 truncate">
                        {item.certFile || `${item.code}_Calibration_Certificate.pdf`}
                      </div>
                      <div className="font-mono text-[11px] text-slate-600">
                        {tx('校準有效期限 Cal Due：', 'Valid Until: ')}
                        <strong className="text-emerald-800">{item.certDue || item.due}</strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
                      <button
                        type="button"
                        onClick={() =>
                          openPreviewDoc({
                            title: `${item.code} — ${item.certFile || 'Cal Cert'}`,
                            url: item.certUrl!,
                            fileName: item.certFile,
                            subtitle: `${item.name} (S/N: ${item.serial}) · Cal Due: ${item.certDue || item.due}`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-800 cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                        {tx('預覽校準證書 PDF', 'Preview Cal Cert PDF')}
                      </button>
                      <a
                        href={resolveDocLink(item.certUrl, item.certFile).downloadUrl || item.certUrl}
                        download={item.certFile || `${item.code}_CalCert.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50"
                      >
                        <Download className="h-4 w-4" />
                        {tx('下載 PDF', 'Download PDF')}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
                    {tx('此儀器暫未綁定預設 PDF 連結，可於下方直接上傳最新校準證書。', 'No default Cal Cert PDF linked yet. You can upload the latest certificate below.')}
                  </div>
                )}

                <div className="print:hidden">
                  <CalCertUploadBox
                    title={tx('📄 歷次校準證書紀錄及上傳新證書', '📄 Calibration Certificate History & Upload')}
                    certs={item.calCerts || []}
                    defaultDueDate={item.certDue || item.due}
                    onUpload={(d) =>
                      uploadEquipmentCalCert({
                        code: item.code,
                        fileName: d.fileName,
                        fileSize: d.fileSize,
                        dueDate: d.dueDate,
                        certNo: d.certNo,
                        dataUrl: d.dataUrl,
                      })
                    }
                    onPreviewToast={(fn) => pushToast(tx('已開啟 Cal Cert 預覽', 'Opened Cal Cert preview'), fn)}
                  />
                </div>
              </div>

              {/* Loan History Audit Trail */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-brand" />
                    <h2 className="text-sm font-extrabold text-slate-900">
                      {tx(`FQS50 借出／交還歷史紀錄 (${itemLoans.length})`, `FQS50 Checkout / Return History (${itemLoans.length})`)}
                    </h2>
                  </div>
                </div>

                {itemLoans.length === 0 ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center text-slate-400">
                    {tx('暫無此器材的借出／交還紀錄', 'No loan history recorded for this instrument yet')}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                    {[...itemLoans]
                      .sort((a, b) => b.checkoutAt.localeCompare(a.checkoutAt))
                      .slice(0, 6)
                      .map((ln) => (
                        <button
                          key={ln.id}
                          type="button"
                          onClick={() => setSelectedLoanId(ln.id)}
                          className="w-full text-left p-3 hover:bg-slate-50 transition flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="font-bold text-slate-900 truncate">
                              {ln.borrowerName} → 📍 {ln.siteLocation} {ln.jobNo ? `(${ln.jobNo})` : ''}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {tx('借出：', 'Out: ')}{ln.checkoutAt} ｜ {tx('預計歸還：', 'Due: ')}{ln.expectedReturn}
                              {ln.returnedAt ? ` ｜ ${tx('已交還：', 'Returned: ')}${ln.returnedAt}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge tone={ln.returnedAt ? 'ok' : 'brand'}>
                              {ln.returnedAt ? tx('已交還', 'Returned') : tx('借出中', 'On Loan')}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 Columns: Scannable ISO QR Code Card & Direct Link Metadata */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-3xl border-2 border-slate-900 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div>
                    <div className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-brand-deep">
                      LABTECH · HOKLAS 298
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {tx('專屬校準認證 QR 標籤', 'Equipment Calibration QR')}
                    </div>
                  </div>
                  <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white">
                    {item.code}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <img
                    src={qrResult.svgDataUrl}
                    alt={`QR Code for ${item.code}`}
                    width={200}
                    height={200}
                    className="h-48 w-48 rounded-xl border border-slate-300 bg-white p-2 shadow-2xs"
                  />
                  <div className="mt-2.5 text-center space-y-0.5">
                    <div className="font-mono text-sm font-black text-slate-900">{item.code}</div>
                    <div className="text-[11px] font-bold text-slate-600">{item.name}</div>
                    <div className="font-mono text-[10px] font-extrabold text-emerald-800">
                      CAL DUE: {item.certDue || item.due || '—'}
                    </div>
                  </div>
                </div>

                {/* Encoded URL Path Details */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      {tx('QR 編碼專屬路徑', 'Encoded URL Path')}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-500">
                      ISO QR v{qrResult.version} ({qrResult.moduleCount}×{qrResult.moduleCount})
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs font-extrabold text-brand-deep break-all">
                    {qrResult.path}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 break-all">
                    {qrResult.url}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-extrabold text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    {copiedUrl ? <Check className="h-4 w-4 text-emerald-600" /> : <ExternalLink className="h-4 w-4 text-brand" />}
                    {copiedUrl ? tx('已複製連結', 'Copied!') : tx('複製專屬連結', 'Copy Link')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadQrSvg}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    {tx('下載 QR SVG', 'Save SVG')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EquipmentCheckoutModal item={checkoutItem} onClose={() => setCheckoutItem(null)} />
      <EquipmentReturnModal item={returnItem} onClose={() => setReturnItem(null)} />
      <LoanDetailModal
        loan={selectedLoan}
        equipment={item}
        onClose={() => setSelectedLoanId(null)}
        onOpenReturn={!selectedLoan?.returnedAt ? () => { setSelectedLoanId(null); setReturnItem(item); } : undefined}
      />
    </div>,
    document.body
  );
};
