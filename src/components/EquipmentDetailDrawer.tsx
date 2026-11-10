import React, { useState } from 'react';
import { usePermissions } from '../permissions';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { EquipmentItem } from '../types';
import { getEquipmentCalStatus } from '../utils';
import { resolveDocLink } from '../driveDocs';
import { Badge } from './Badge';
import { CalCertUploadBox } from './CalCertUploadBox';
import { EquipmentTagEditor } from './EquipmentTagEditor';
import { LoanDetailModal } from './LoanDetailModal';
import { EquipmentQrSvg } from './EquipmentQrModal';
import { buildEquipmentCertStatusPath, navigateToEquipmentCertPage } from '../utils/equipmentQr';
import { X, RefreshCw, FileCheck2, Eye, Download, CheckSquare, ChevronRight, ExternalLink } from 'lucide-react';

export const EquipmentDetailDrawer: React.FC<{
  item: EquipmentItem | null;
  onClose: () => void;
  onOpenCheckout: () => void;
  onOpenReturn: () => void;
}> = ({ item, onClose, onOpenCheckout, onOpenReturn }) => {
  const { loans, syncEquipmentCertToDue, toggleEquipmentTag, uploadEquipmentCalCert, openPreviewDoc, pushToast } = useApp();
  const { lang, tx } = usePrefs();
  const perms = usePermissions();
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  if (!item) return null;

  const cal = getEquipmentCalStatus(item, undefined, lang);
  const itemLoans = loans.filter((l) => l.equipmentCode === item.code);
  const selectedLoan = selectedLoanId ? itemLoans.find((l) => l.id === selectedLoanId) || null : null;
  const currentTags = item.testTags || item.tests.split('+').map((s) => s.trim()).filter(Boolean);
  const directPath = buildEquipmentCertStatusPath(item.code);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/35"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full w-full max-w-lg flex-col bg-paper shadow-xl">
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold text-ink">{item.code}</span>
              <Badge tone={cal.kind}>{cal.label}</Badge>
            </div>
            <div className="mt-0.5 text-sm font-bold text-ink">{item.name}</div>
            <div className="text-xs text-ink-soft">{item.maker} · {item.model} (S/N: {item.serial})</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-ground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="rounded-xl border border-brand/30 bg-brand-wash/40 p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="font-bold text-brand-deep">{tx('器材校準及存放狀態摘要', 'Calibration & Status Summary')}</div>
                <div className="grid grid-cols-1 gap-1 pt-0.5">
                  <div>{tx('Cal Due Date：', 'Cal Valid Until: ')}<span className="font-mono font-bold text-ink">{item.certDue || item.due}</span></div>
                  <div>{tx('現時狀態：', 'Status: ')}<span className="font-semibold text-ink">{item.currentLoan ? tx(`借出中（${item.currentLoan.siteLocation}）`, `On Loan (${item.currentLoan.siteLocation})`) : tx(`在庫（${item.loc}）`, `In Store (${item.loc})`)}</span></div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigateToEquipmentCertPage(item.code);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-brand/30 bg-white px-2.5 py-1 font-mono text-[11px] font-extrabold text-brand-deep hover:bg-brand-wash cursor-pointer"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  {tx('開啟專屬校準認證狀態頁', 'Open Cert Status Page')} ({directPath})
                </button>
              </div>
              <EquipmentQrSvg
                code={item.code}
                due={item.certDue || item.due}
                size={76}
                onClick={() => {
                  onClose();
                  navigateToEquipmentCertPage(item.code);
                }}
              />
            </div>
            {item.monthlyCheck && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1.5 text-[11px] text-indigo-900">
                <span className="inline-flex items-center gap-1 font-bold">
                  <CheckSquare className="h-3.5 w-3.5 text-indigo-700" />
                  {tx('屬 FCC01 每月內部核查器材（由儀器協調員每月檢查）', 'FCC01 Monthly Internal Verification Item')}
                </span>
                <button
                  type="button"
                  onClick={() => openPreviewDoc({ title: tx('FCC01 (2026) 每月內檢紀錄', 'FCC01 (2026) Monthly Verification Check Record'), url: '/server-docs/forms/FCC01_Monthly_Check_Record_2026.pdf', fileName: 'FCC01_Monthly_Check_Record_2026.pdf' })}
                  className="font-extrabold text-indigo-700 hover:underline cursor-pointer"
                >
                  {tx('預覽 2026 月檢紀錄', 'Preview 2026 FCC01')}
                </button>
              </div>
            )}
            {item.certUrl ? (
              <div className="mt-1 flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => openPreviewDoc({ title: `${item.code} — ${item.certFile || 'Cal Cert'}`, url: item.certUrl!, fileName: item.certFile, subtitle: `${item.name} · Cal Due: ${item.certDue || item.due}` })}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-brand-deep cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {tx('預覽最新 Cal Cert', 'Preview Latest Cal Cert')}
                </button>
                <a
                  href={resolveDocLink(item.certUrl, item.certFile).downloadUrl || item.certUrl}
                  download={item.certFile || `${item.code}_CalCert.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-brand/40 bg-white px-2.5 py-1.5 text-[11px] font-bold text-brand-deep hover:bg-brand-wash"
                >
                  <Download className="h-3.5 w-3.5" />
                  {tx('下載 PDF', 'Download PDF')}
                </a>
              </div>
            ) : item.certFile ? (
              <button
                type="button"
                onClick={() => pushToast(tx('已開啟 Cal Cert 預覽', 'Opened Cal Cert preview'), item.certFile)}
                className="mt-1 inline-flex items-center gap-1 font-bold text-brand hover:underline cursor-pointer"
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                {tx('檢視最新 Cal Cert', 'Open Latest Cal Cert')} ({item.certFile.slice(0, 36)})
              </button>
            ) : null}
          </div>

          {cal.mismatch && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#a35f00]/30 bg-[#fdf2df] p-3 text-[#a35f00]">
              <span>{tx(`清單 Due Date (${item.due}) 與最新 Cal Cert (${item.certDue}) 不一致！`, `Register Due Date (${item.due}) differs from Cal Cert (${item.certDue})!`)}</span>
              <button
                type="button"
                onClick={() => syncEquipmentCertToDue(item.code)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#a35f00] px-2.5 py-1 font-bold text-white cursor-pointer shrink-0"
              >
                <RefreshCw className="h-3 w-3" />{tx('一鍵 Sync 日期', 'Sync Due Date')}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            {item.currentLoan ? (
              <button type="button" onClick={onOpenReturn} className="flex-1 rounded-lg bg-[#1f7a4d] py-2 font-bold text-white cursor-pointer">
                📥 {tx('登記 Return 交還入倉', 'Return to Store')}
              </button>
            ) : (
              <button type="button" onClick={onOpenCheckout} className="flex-1 rounded-lg bg-brand py-2 font-bold text-white cursor-pointer">
                📤 {tx('登記 Checkout 借出至 Site', 'Checkout to Site')}
              </button>
            )}
          </div>

          <EquipmentTagEditor
            tags={currentTags}
            onToggle={(tag) => toggleEquipmentTag(item.code, tag)}
          />

          {perms.canManageEquipment && (<CalCertUploadBox
            title={tx('📄 工具 Cal Cert 上傳及紀錄', '📄 Calibration Certificates (Cal Cert)')}
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
          />)}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-bold text-ink">{tx(`借出／交還紀錄 History (${itemLoans.length})`, `Checkout / Return History (${itemLoans.length})`)}</h4>
              {itemLoans.length > 0 && <span className="text-[11px] font-semibold text-brand">{tx('點擊紀錄查看完整詳情 ›', 'Tap record for full details ›')}</span>}
            </div>
            <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
              {itemLoans.length === 0 ? (
                <div className="p-4 text-center text-ink-faint">{tx('暫無借出／交還紀錄', 'No checkout / return history yet')}</div>
              ) : (
                [...itemLoans].sort((a, b) => b.checkoutAt.localeCompare(a.checkoutAt)).map((ln) => (
                  <button
                    key={ln.id}
                    type="button"
                    onClick={() => setSelectedLoanId(ln.id)}
                    className="w-full text-left p-3 space-y-1 bg-white hover:bg-brand-wash/40 active:bg-brand-wash/70 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink min-w-0 truncate">{ln.borrowerName} → 📍 {ln.siteLocation}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge tone={ln.returnedAt ? 'ok' : 'brand'}>{ln.returnedAt ? tx('已交還 Returned', 'Returned') : tx('借出中 On Loan', 'On Loan')}</Badge>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                    <div className="font-mono text-[11px] text-ink-faint">
                      {tx('借出：', 'Checkout: ')}{ln.checkoutAt} ｜ {tx('預計歸還：', 'Expected: ')}{ln.expectedReturn}
                    </div>
                    {ln.returnedAt && (
                      <div className="font-mono text-[11px] text-emerald-700 font-semibold">
                        {tx('交還：', 'Returned: ')}{ln.returnedAt}{ln.returnedBy ? ` (${ln.returnedBy})` : ''} · {tx('入倉：', 'Store: ')}{ln.returnStore || item.store}
                      </div>
                    )}
                    {ln.remark && <div className="text-[11px] text-ink-soft truncate">{tx('借出備註：', 'Checkout Note: ')}{ln.remark}</div>}
                    {ln.returnRemark && <div className="text-[11px] text-emerald-800 truncate">{tx('交還備註：', 'Return Note: ')}{ln.returnRemark}</div>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <LoanDetailModal
        loan={selectedLoan}
        equipment={item}
        onClose={() => setSelectedLoanId(null)}
        onOpenReturn={!selectedLoan?.returnedAt ? onOpenReturn : undefined}
      />
    </div>
  );
};
