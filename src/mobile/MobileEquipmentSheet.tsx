import React, { useState } from 'react';
import { usePermissions } from '../permissions';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { EquipmentItem } from '../types';
import { getEquipmentCalStatus } from '../utils';
import { resolveDocLink } from '../driveDocs';
import { navigateToEquipmentCertPage } from '../utils/equipmentQr';
import { Badge } from '../components/Badge';
import { LoanDetailModal } from '../components/LoanDetailModal';
import {
  X,
  RefreshCw,
  Eye,
  Download,
  UploadCloud,
  CheckSquare,
  ChevronRight,
  ArrowLeftRight,
  ExternalLink,
} from 'lucide-react';

const ALL_TAGS = ['KD', 'SO', 'FC', 'BL', 'PO', 'PLT', 'VC', 'COMMON'];

export const MobileEquipmentSheet: React.FC<{
  item: EquipmentItem | null;
  onClose: () => void;
  onOpenCheckout: () => void;
  onOpenReturn: () => void;
}> = ({ item, onClose, onOpenCheckout, onOpenReturn }) => {
  const { loans, syncEquipmentCertToDue, toggleEquipmentTag, uploadEquipmentCalCert, openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const perms = usePermissions();
  const [certNo, setCertNo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  if (!item) return null;

  const cal = getEquipmentCalStatus(item, undefined, lang);
  const itemLoans = loans.filter((l) => l.equipmentCode === item.code);
  const selectedLoan = selectedLoanId ? itemLoans.find((l) => l.id === selectedLoanId) || null : null;
  const currentTags = item.testTags || item.tests.split('+').map((s) => s.trim()).filter(Boolean);
  const primaryCertUrl = item.certUrl || item.calCerts?.find((c) => c.dataUrl)?.dataUrl;
  const primaryCertFile = item.certFile || item.calCerts?.[0]?.fileName || `${item.code}_CalCert.pdf`;

  const handleCertUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      uploadEquipmentCalCert({
        code: item.code,
        fileName: f.name,
        fileSize: `${Math.max(1, Math.round(f.size / 1024))} KB`,
        dueDate: dueDate || item.certDue || item.due,
        certNo: certNo.trim() || undefined,
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
      setCertNo('');
      ev.target.value = '';
    };
    reader.readAsDataURL(f);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92dvh] w-full max-w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl">
        {/* Bottom Sheet Handle & Header */}
        <div className="border-b border-slate-200 bg-white px-4 pt-2.5 pb-3">
          <div className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-slate-300" />
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-slate-900 px-2.5 py-0.5 font-mono text-xs font-extrabold text-white">
                  {item.code}
                </span>
                <Badge tone={cal.kind}>{cal.label}</Badge>
              </div>
              <div className="text-base font-extrabold text-slate-900 leading-snug">{item.name}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={tx('關閉', 'Close')}
              className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Sheet Body */}
        <div className="flex-1 overflow-y-auto p-4 pb-10 space-y-3.5 text-xs">
          {/* Crisp Key-Value Grid */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500">{tx('製造商', 'Maker')}</div>
                <div className="mt-0.5 font-bold text-slate-900 truncate">{item.maker || '—'}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500">{tx('型號及 S/N', 'Model & S/N')}</div>
                <div className="mt-0.5 font-mono font-bold text-slate-900 truncate">
                  {item.model || '—'} · {item.serial || '—'}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500">{tx('校準到期日', 'Cal Due')}</div>
                <div className="mt-0.5 font-mono font-extrabold text-slate-900 tabular-nums">
                  {item.certDue || item.due || '—'}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500">{tx('目前位置', 'Location')}</div>
                <div className="mt-0.5 font-bold text-slate-900 truncate">
                  {item.currentLoan ? item.currentLoan.siteLocation : item.loc || item.store || 'Office'}
                </div>
              </div>
            </div>

            {item.currentLoan && (
              <div className="border-t border-slate-200/80 pt-2.5 flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-slate-600 truncate">
                  {tx('借用人 · ', 'Borrower · ')}
                  <span className="font-bold text-slate-900">{item.currentLoan.borrowerName}</span>
                </span>
                <span className="font-mono font-bold text-brand-deep tabular-nums shrink-0">
                  {tx('還期', 'Due')} {item.currentLoan.expectedReturn}
                </span>
              </div>
            )}

            {item.monthlyCheck && (
              <button
                type="button"
                onClick={() =>
                  openPreviewDoc({
                    title: tx('FCC01 每月內檢紀錄 · 2026', 'FCC01 Monthly Check Record · 2026'),
                    url: '/server-docs/forms/FCC01_Monthly_Check_Record_2026.pdf',
                    fileName: 'FCC01_Monthly_Check_Record_2026.pdf',
                  })
                }
                className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-3 font-bold text-sky-800 cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 shrink-0" />
                  {tx('FCC01 每月內檢項目', 'FCC01 Monthly Verification')}
                </span>
                <span className="font-extrabold">{tx('預覽紀錄 ›', 'Preview ›')}</span>
              </button>
            )}

            {cal.mismatch && (
              <button
                type="button"
                onClick={() => syncEquipmentCertToDue(item.code)}
                className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 font-extrabold text-white cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 shrink-0" />
                {tx(`同步證書到期日 · ${item.certDue}`, `Sync Due Date · ${item.certDue}`)}
              </button>
            )}
          </div>

          {/* Primary 44px Action Buttons */}
          <div className="space-y-2">
            {primaryCertUrl && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openPreviewDoc({
                      title: `${item.code} — ${primaryCertFile}`,
                      url: primaryCertUrl,
                      fileName: primaryCertFile,
                      subtitle: `${item.name} · S/N ${item.serial} · Cal Due ${item.certDue || item.due}`,
                    })
                  }
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 text-xs font-extrabold text-emerald-800 active:bg-emerald-100 cursor-pointer"
                >
                  <Eye className="h-4 w-4 shrink-0" />
                  <span>{tx('預覽校準證書 PDF', 'Preview Cal Cert PDF')}</span>
                </button>
                <a
                  href={resolveDocLink(primaryCertUrl, primaryCertFile).downloadUrl || primaryCertUrl}
                  download={primaryCertFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={tx('下載 PDF', 'Download PDF')}
                  className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {item.currentLoan ? (
                <button
                  type="button"
                  onClick={onOpenReturn}
                  className="col-span-2 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-4 text-sm font-extrabold text-white shadow-xs active:bg-emerald-700 cursor-pointer"
                >
                  <ArrowLeftRight className="h-4 w-4 shrink-0" />
                  <span>{tx('登記歸還入倉', 'Return to Store')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenCheckout}
                  className="col-span-2 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-brand px-4 text-sm font-extrabold text-white shadow-xs active:bg-brand-deep cursor-pointer"
                >
                  <ArrowLeftRight className="h-4 w-4 shrink-0" />
                  <span>{tx('登記借出至地盤', 'Checkout to Site')}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigateToEquipmentCertPage(item.code);
              }}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-700 active:bg-slate-50 cursor-pointer"
            >
              <ExternalLink className="h-4 w-4 text-brand shrink-0" />
              <span>{tx('開啟校準認證狀態頁及 QR', 'Open Calibration Status & QR')}</span>
            </button>
          </div>

          {/* Applicable Test Tags */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5">
            <div className="font-extrabold text-slate-800">
              {tx('適用測試標籤 · 點擊切換', 'Applicable Test Tags')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map((tg) => {
                const on = currentTags.includes(tg);
                return (
                  <button
                    key={tg}
                    type="button"
                    onClick={() => toggleEquipmentTag(item.code, tg)}
                    className={`inline-flex min-h-[40px] items-center justify-center rounded-xl px-3 font-mono text-xs font-extrabold transition cursor-pointer ${
                      on
                        ? 'bg-brand text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {on ? `✓ ${tg}` : `+ ${tg}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upload New Certificate & History */}
          {perms.canManageEquipment && (
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800">
                  {tx('上傳新證書及歷屆紀錄', 'Upload & Certificate History')}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600 tabular-nums">
                  {item.calCerts?.length || 0}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={certNo}
                  onChange={(e) => setCertNo(e.target.value)}
                  placeholder={tx('證書編號 · 選填', 'Cert No. · Optional')}
                  className="min-h-[44px] w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-brand"
                />
                <input
                  type="date"
                  value={dueDate || item.certDue || item.due}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="min-h-[44px] w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs tabular-nums outline-none focus:border-brand"
                />
              </div>
              <label className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-4 font-extrabold text-white active:bg-slate-800 cursor-pointer">
                <UploadCloud className="h-4 w-4 shrink-0" />
                <span>{tx('上傳新證書', 'Upload New Certificate')}</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleCertUpload}
                  className="hidden"
                />
              </label>

              {(item.calCerts || []).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-slate-900">{c.fileName}</div>
                    <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                      Cal Due · {c.dueDate || '—'}
                    </div>
                  </div>
                  {c.dataUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        openPreviewDoc({
                          title: `${item.code} — ${c.fileName}`,
                          url: c.dataUrl!,
                          fileName: c.fileName,
                        })
                      }
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 font-extrabold text-brand-deep shrink-0 cursor-pointer"
                    >
                      {tx('預覽', 'View')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Loan History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800">
                {tx('借還紀錄', 'Loan History')}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600 tabular-nums">
                {itemLoans.length}
              </span>
            </div>
            {itemLoans.length === 0 ? (
              <div className="py-3 text-center text-slate-400">
                {tx('暫無借出及歸還紀錄', 'No loan history yet')}
              </div>
            ) : (
              [...itemLoans]
                .sort((a, b) => b.checkoutAt.localeCompare(a.checkoutAt))
                .map((ln) => (
                  <button
                    key={ln.id}
                    type="button"
                    onClick={() => setSelectedLoanId(ln.id)}
                    className="w-full min-h-[48px] text-left rounded-xl border border-slate-200/80 bg-slate-50 active:bg-brand-wash/50 p-3 space-y-1 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-slate-900 truncate min-w-0">
                        {ln.borrowerName} · {ln.siteLocation}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge tone={ln.returnedAt ? 'ok' : 'brand'}>
                          {ln.returnedAt ? tx('已歸還', 'Returned') : tx('借出中', 'On Loan')}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                      {tx('借出', 'Out')} {ln.checkoutAt} ·{' '}
                      {ln.returnedAt
                        ? `${tx('歸還', 'In')} ${ln.returnedAt}`
                        : `${tx('還期', 'Due')} ${ln.expectedReturn}`}
                    </div>
                  </button>
                ))
            )}
          </div>
        </div>

        <LoanDetailModal
          loan={selectedLoan}
          equipment={item}
          onClose={() => setSelectedLoanId(null)}
          onOpenReturn={!selectedLoan?.returnedAt ? onOpenReturn : undefined}
        />
      </div>
    </div>
  );
};
