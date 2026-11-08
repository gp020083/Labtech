import React from 'react';
import { EquipmentItem } from '../types';
import { usePrefs } from '../prefs';
import { getEquipmentCalStatus } from '../utils';
import { getLoanOverdueStatus } from '../utils/limsRules';
import { Badge } from './Badge';
import { FileCheck2, UploadCloud, History, Eye } from 'lucide-react';

export interface EquipmentMobileListProps {
  items: EquipmentItem[];
  loanCountMap: Map<string, number>;
  onOpenDetail: (code: string) => void;
  onOpenCheckout: (eq: EquipmentItem) => void;
  onOpenReturn: (eq: EquipmentItem) => void;
  onOpenHistory: (code: string) => void;
  onPreviewCert: (eq: EquipmentItem) => void;
  onQuickUpload: (eq: EquipmentItem, ev: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EquipmentMobileList: React.FC<EquipmentMobileListProps> = ({
  items, loanCountMap, onOpenDetail, onOpenCheckout, onOpenReturn, onOpenHistory, onPreviewCert, onQuickUpload,
}) => {
  const { lang, tx } = usePrefs();
  if (items.length === 0) {
    return (
      <div className="md:hidden rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-xs font-semibold text-slate-400">
        {tx('沒有符合篩選條件的器材', 'No matching equipment found')}
      </div>
    );
  }
  return (
    <div className="md:hidden divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      {items.map((eq) => {
        const cal = getEquipmentCalStatus(eq, undefined, lang);
        const ov = getLoanOverdueStatus(eq, undefined, lang);
        const tags = eq.testTags || eq.tests.split('+').map((s) => s.trim()).filter(Boolean);
        return (
          <div key={eq.code} className="p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white whitespace-nowrap">{eq.code}</span>
                {tags.map((tg) => <span key={tg} className="rounded bg-brand-wash px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-brand-deep">{tg}</span>)}
                {eq.monthlyCheck && <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700">FCC01</span>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge tone={cal.kind}>{cal.label}</Badge>
                <span className="font-mono text-[11px] text-slate-500">{eq.certDue || eq.due}</span>
              </div>
            </div>

            <div onClick={() => onOpenDetail(eq.code)} className="cursor-pointer">
              <div className="text-sm font-extrabold text-slate-900 leading-snug">{eq.name}</div>
              <div className="mt-0.5 font-mono text-[11px] text-slate-500 break-words">{eq.maker} · {eq.model} ｜ S/N {eq.serial}</div>
            </div>

            <div className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px]">
              {eq.currentLoan ? (
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-bold text-brand-deep">📍 {eq.currentLoan.siteLocation}</span>
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span>{eq.currentLoan.borrowerName} · {tx('預計歸還', 'Due')} {eq.currentLoan.expectedReturn}</span>
                    {ov.isOverdue && (
                      <span className="rounded bg-rose-100 border border-rose-300 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-rose-700">
                        🚨 {ov.label}
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <span className="font-semibold text-emerald-700">🏠 {tx('現存位置：', 'In Lab: ')}{eq.loc || eq.store || 'Lab'}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {eq.currentLoan ? (
                <button type="button" onClick={() => onOpenReturn(eq)} className="rounded-xl bg-emerald-600 px-3 py-1.5 font-extrabold text-white whitespace-nowrap cursor-pointer">{tx('交還', 'Return')}</button>
              ) : (
                <button type="button" onClick={() => onOpenCheckout(eq)} className="rounded-xl bg-brand px-3 py-1.5 font-extrabold text-white whitespace-nowrap cursor-pointer">{tx('借出', 'Checkout')}</button>
              )}
              {eq.certUrl && (
                <button type="button" onClick={() => onPreviewCert(eq)} className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 font-extrabold text-emerald-800 cursor-pointer">
                  <Eye className="h-3.5 w-3.5" /> {tx('預覽 Cert', 'Cert')}
                </button>
              )}
              <button type="button" onClick={() => onOpenHistory(eq.code)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-700 cursor-pointer">
                <History className="h-3.5 w-3.5 text-slate-500" /> {tx('紀錄', 'Logs')}{loanCountMap.get(eq.code) ? ` (${loanCountMap.get(eq.code)})` : ''}
              </button>
              <button type="button" onClick={() => onOpenDetail(eq.code)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-700 cursor-pointer">
                <FileCheck2 className="h-3.5 w-3.5 text-brand" /> {tx('詳情', 'Info')}
              </button>
              <label title={tx('上傳 Cal Cert', 'Upload Cal Cert')} className="ml-auto inline-flex items-center rounded-xl border border-slate-200 p-1.5 text-slate-600 cursor-pointer">
                <UploadCloud className="h-3.5 w-3.5" />
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(ev) => onQuickUpload(eq, ev)} className="hidden" />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
};
