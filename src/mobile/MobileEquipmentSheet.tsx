import React, { useState } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { EquipmentItem } from '../types';
import { getEquipmentCalStatus } from '../utils';
import { resolveDocLink } from '../driveDocs';
import { Badge } from '../components/Badge';
import { LoanDetailModal } from '../components/LoanDetailModal';
import { X, RefreshCw, Eye, Download, UploadCloud, CheckSquare, ChevronRight } from 'lucide-react';

const ALL_TAGS = ['KD', 'SO', 'FC', 'BL', 'PO', 'PLT', 'VC', 'COMMON'];

export const MobileEquipmentSheet: React.FC<{
  item: EquipmentItem | null;
  onClose: () => void;
  onOpenCheckout: () => void;
  onOpenReturn: () => void;
}> = ({ item, onClose, onOpenCheckout, onOpenReturn }) => {
  const { loans, syncEquipmentCertToDue, toggleEquipmentTag, uploadEquipmentCalCert, openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const [certNo, setCertNo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  if (!item) return null;
  const cal = getEquipmentCalStatus(item, undefined, lang);
  const itemLoans = loans.filter((l) => l.equipmentCode === item.code);
  const selectedLoan = selectedLoanId ? itemLoans.find((l) => l.id === selectedLoanId) || null : null;
  const currentTags = item.testTags || item.tests.split('+').map((s) => s.trim()).filter(Boolean);

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
    <div className="fixed inset-0 z-50 flex flex-col bg-white h-[100dvh] w-full max-w-full overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-xs font-extrabold text-white">{item.code}</span>
            <Badge tone={cal.kind}>{cal.label}</Badge>
          </div>
          <div className="mt-1 text-sm font-extrabold text-slate-900">{item.name}</div>
          <div className="text-[11px] text-slate-500 break-words">{item.maker} · {item.model} ｜ S/N: {item.serial}</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-200/70 p-2 text-slate-700 shrink-0 cursor-pointer"><X className="h-5 w-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-10 space-y-3.5 text-xs">
        <div className="rounded-2xl border border-brand/25 bg-brand-wash/40 p-3.5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-slate-500">{tx('校準有效至', 'Cal Valid Until')}</span><div className="font-mono font-extrabold text-slate-900">{item.certDue || item.due}</div></div>
            <div><span className="text-slate-500">{tx('現時狀態', 'Current Status')}</span><div className="font-extrabold text-slate-900">{item.currentLoan ? `📍 ${item.currentLoan.siteLocation}` : `🏠 ${item.loc || item.store}`}</div></div>
          </div>
          {item.monthlyCheck && (
            <button type="button" onClick={() => openPreviewDoc({ title: tx('FCC01 (2026) 每月內檢紀錄', 'FCC01 (2026) Monthly Verification Check'), url: '/server-docs/forms/FCC01_Monthly_Check_Record_2026.pdf', fileName: 'FCC01_Monthly_Check_Record_2026.pdf' })} className="flex w-full items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 font-bold text-indigo-800 cursor-pointer">
              <span className="inline-flex items-center gap-1"><CheckSquare className="h-3.5 w-3.5" /> {tx('FCC01 每月內檢器材', 'FCC01 Monthly Check')}</span>
              <span className="underline">{tx('預覽', 'View')}</span>
            </button>
          )}
          {cal.mismatch && (
            <button type="button" onClick={() => syncEquipmentCertToDue(item.code)} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2 font-extrabold text-white cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" /> {tx(`同步到期日 (${item.certDue})`, `Sync Due Date (${item.certDue})`)}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {item.currentLoan ? (
            <button type="button" onClick={onOpenReturn} className="col-span-2 rounded-2xl bg-emerald-600 py-3 text-sm font-extrabold text-white shadow-xs cursor-pointer">📥 {tx('登記交還入倉 (Return)', 'Return to Store')}</button>
          ) : (
            <button type="button" onClick={onOpenCheckout} className="col-span-2 rounded-2xl bg-brand py-3 text-sm font-extrabold text-white shadow-xs cursor-pointer">📤 {tx('登記借出至地盤 (Checkout)', 'Checkout to Site')}</button>
          )}
          {item.certUrl && (
            <>
              <button type="button" onClick={() => openPreviewDoc({ title: `${item.code} — ${item.certFile || 'Cal Cert'}`, url: item.certUrl!, fileName: item.certFile, subtitle: `${item.name} · Due: ${item.certDue || item.due}` })} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 font-extrabold text-emerald-800 cursor-pointer">
                <Eye className="h-4 w-4" /> {tx('預覽最新 Cert', 'Preview Cert')}
              </button>
              <a href={resolveDocLink(item.certUrl, item.certFile).downloadUrl || item.certUrl} download={item.certFile || `${item.code}_CalCert.pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 font-extrabold text-slate-700">
                <Download className="h-4 w-4" /> {tx('下載 PDF', 'Download PDF')}
              </a>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
          <div className="font-extrabold text-slate-800">{tx('🏷️ 適用測試標籤（點擊切換）', '🏷️ Test Tags (Tap to toggle)')}</div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TAGS.map((tg) => {
              const on = currentTags.includes(tg);
              return (
                <button key={tg} type="button" onClick={() => toggleEquipmentTag(item.code, tg)} className={`rounded-xl px-2.5 py-1.5 font-mono text-[11px] font-extrabold cursor-pointer ${on ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                  {on ? `✓ ${tg}` : `+ ${tg}`}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5">
          <div className="font-extrabold text-slate-800">{tx(`📄 上傳及歷屆 Cal Cert (${item.calCerts?.length || 0})`, `📄 Upload & Cal Certs (${item.calCerts?.length || 0})`)}</div>
          <div className="grid grid-cols-2 gap-2">
            <input value={certNo} onChange={(e) => setCertNo(e.target.value)} placeholder={tx('證書編號 (選填)', 'Cert No. (Opt)')} className="w-full min-w-0 rounded-xl border border-slate-200 px-2.5 py-2 text-xs" />
            <input type="date" value={dueDate || item.certDue || item.due} onChange={(e) => setDueDate(e.target.value)} className="w-full min-w-0 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-mono" />
          </div>
          <label className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 font-extrabold text-white cursor-pointer">
            <UploadCloud className="h-4 w-4" /> {tx('選擇並上傳 Cal Cert PDF', 'Select & Upload Cal Cert')}
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleCertUpload} className="hidden" />
          </label>
          {(item.calCerts || []).map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-slate-900">{c.fileName}</div>
                <div className="text-[10px] text-slate-500">Due: {c.dueDate || '—'} · {c.uploadedBy}</div>
              </div>
              {c.dataUrl && (
                <button type="button" onClick={() => openPreviewDoc({ title: `${item.code} — ${c.fileName}`, url: c.dataUrl!, fileName: c.fileName })} className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 font-extrabold text-brand-deep shrink-0 cursor-pointer">
                  {tx('預覽', 'View')}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-extrabold text-slate-800">{tx(`🕘 借還紀錄 (${itemLoans.length})`, `🕘 Loan History (${itemLoans.length})`)}</div>
            {itemLoans.length > 0 && <span className="text-[11px] font-bold text-brand">{tx('點擊查看詳情 ›', 'Tap for details ›')}</span>}
          </div>
          {itemLoans.length === 0 ? (
            <div className="py-3 text-center text-slate-400">{tx('暫無借出／交還紀錄', 'No loan history yet')}</div>
          ) : (
            [...itemLoans].sort((a, b) => b.checkoutAt.localeCompare(a.checkoutAt)).map((ln) => (
              <button
                key={ln.id}
                type="button"
                onClick={() => setSelectedLoanId(ln.id)}
                className="w-full text-left rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-brand-wash/40 active:bg-brand-wash/70 p-3 space-y-1 transition cursor-pointer"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-bold text-slate-900 truncate min-w-0">{ln.borrowerName} → {ln.siteLocation}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge tone={ln.returnedAt ? 'ok' : 'brand'}>{ln.returnedAt ? tx('已交還', 'Returned') : tx('借出中', 'On Loan')}</Badge>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <div className="font-mono text-[10px] text-slate-500">{tx('借出：', 'Out: ')}{ln.checkoutAt} · {tx('預計：', 'Due: ')}{ln.expectedReturn}</div>
                {ln.returnedAt && <div className="font-mono text-[10px] text-emerald-700 font-semibold">{tx('交還：', 'In: ')}{ln.returnedAt} ({ln.returnStore || item.store})</div>}
                {(ln.remark || ln.returnRemark) && (
                  <div className="text-[11px] text-slate-600 truncate">📝 {ln.remark || ln.returnRemark}</div>
                )}
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
  );
};
