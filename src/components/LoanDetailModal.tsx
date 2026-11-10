import React from 'react';
import { EquipmentItem, EquipmentLoanRecord } from '../types';
import { usePrefs } from '../prefs';
import { Badge } from './Badge';
import { X, MapPin, User, Calendar, Clock, FileText, CheckCircle2, Wrench } from 'lucide-react';

export interface LoanDetailModalProps {
  loan: EquipmentLoanRecord | null;
  equipment?: EquipmentItem | null;
  onClose: () => void;
  onOpenReturn?: () => void;
  onOpenEquipment?: () => void;
}

export const LoanDetailModal: React.FC<LoanDetailModalProps> = ({
  loan,
  equipment,
  onClose,
  onOpenReturn,
  onOpenEquipment,
}) => {
  const { tx } = usePrefs();
  if (!loan) return null;

  const condTone =
    loan.returnCondition === 'damaged' ? 'bad' : loan.returnCondition === 'needs_check' ? 'warn' : 'ok';
  const condLabel =
    loan.returnCondition === 'damaged'
      ? tx('異常送修', 'Damaged')
      : loan.returnCondition === 'needs_check'
      ? tx('待檢查', 'Needs Check')
      : tx('正常良好', 'Good');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-[1px] p-0 sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={loan.returnedAt ? 'ok' : 'brand'}>
                {loan.returnedAt ? tx('✓ 已交還 Returned', '✓ Returned') : tx('📍 借出中 On Loan', '📍 On Loan')}
              </Badge>
              <span className="font-mono text-[11px] font-bold text-slate-400">{loan.id}</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 break-words">
              {tx('借出／交還完整紀錄詳情', 'Loan & Return Record Details')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200/80 p-2 text-slate-700 hover:bg-slate-300 shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500">
              <Wrench className="h-3.5 w-3.5 text-brand" /> {tx('器材資料 Equipment Info', 'Equipment Info')}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-slate-900 px-2.5 py-0.5 font-mono text-xs font-extrabold text-white">
                {loan.equipmentCode}
              </span>
              <span className="text-sm font-extrabold text-slate-900 break-words">
                {equipment?.name || loan.equipmentCode}
              </span>
            </div>
            {equipment && (
              <div className="font-mono text-[11px] text-slate-600 break-words">
                {equipment.maker} · {equipment.model} ｜ S/N: {equipment.serial} ｜ Cal Due: {equipment.certDue || equipment.due}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-brand/25 bg-brand-wash/35 p-3.5 space-y-2.5">
            <div className="font-extrabold text-brand-deep">
              📤 {tx('借出資料 Checkout Details', 'Checkout Details')}
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <User className="mt-0.5 h-4 w-4 text-brand shrink-0" />
                <div className="min-w-0 flex-1 break-words">
                  <div className="text-[11px] text-slate-500">{tx('借用同事 Borrower', 'Borrower')}</div>
                  <div className="font-extrabold text-slate-900">
                    {loan.borrowerName}
                    {loan.borrowerStaffId ? ` (${loan.borrowerStaffId})` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-brand shrink-0" />
                <div className="min-w-0 flex-1 break-words">
                  <div className="text-[11px] text-slate-500">{tx('目的地地盤及工程編號 Site & Job No.', 'Destination Site & Job No.')}</div>
                  <div className="font-extrabold text-brand-deep">{loan.siteLocation}</div>
                  {loan.jobNo && <div className="font-mono text-[11px] font-bold text-slate-600">Job / Site ID: {loan.jobNo}</div>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-brand/15">
                <div className="flex items-start gap-1.5">
                  <Clock className="mt-0.5 h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <div>
                    <div className="text-[11px] text-slate-500">{tx('借出時間 Checkout Time', 'Checkout Time')}</div>
                    <div className="font-mono font-bold text-slate-900">{loan.checkoutAt}</div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <Calendar className="mt-0.5 h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <div>
                    <div className="text-[11px] text-slate-500">{tx('預計歸還日期 Expected Return', 'Expected Return')}</div>
                    <div className="font-mono font-bold text-slate-900">{loan.expectedReturn}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white/90 border border-brand/15 p-3 space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                <FileText className="h-3.5 w-3.5" /> {tx('借出備註 Checkout Remark', 'Checkout Remark')}
              </div>
              <div className="text-xs font-medium text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
                {loan.remark || tx('（無填寫借出備註）', '(No checkout remark)')}
              </div>
            </div>
          </div>

          {loan.returnedAt ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 font-extrabold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {tx('交還資料 Return Details', 'Return Details')}
                </span>
                {loan.returnCondition && <Badge tone={condTone}>{condLabel}</Badge>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <div className="text-[11px] text-slate-500">{tx('交還時間 Returned Time', 'Returned Time')}</div>
                  <div className="font-mono font-bold text-emerald-900 break-words">{loan.returnedAt}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">{tx('交還經手人及入倉位置 Store & Staff', 'Returned By & Store')}</div>
                  <div className="font-bold text-slate-900 break-words">
                    {loan.returnedBy ? `${loan.returnedBy} · ` : ''}
                    {loan.returnStore || equipment?.store || 'Office'}
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-white/90 border border-emerald-200/70 p-3 space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                  <FileText className="h-3.5 w-3.5" /> {tx('交還備註 Return Remark', 'Return Remark')}
                </div>
                <div className="text-xs font-medium text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
                  {loan.returnRemark || tx('（無填寫交還備註）', '(No return remark)')}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-amber-900 font-semibold">
              📍 {tx('此器材目前仍在外借中，尚未登記交還入倉。', 'This equipment is currently on loan and has not been returned yet.')}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 pb-safe sm:px-5">
          {onOpenEquipment && (
            <button
              type="button"
              onClick={onOpenEquipment}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              {tx('查看器材檔案', 'Equipment Profile')}
            </button>
          )}
          {!loan.returnedAt && onOpenReturn && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReturn();
              }}
              className="flex-1 sm:flex-initial rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 cursor-pointer"
            >
              📥 {tx('立即登記交還', 'Return Now')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 cursor-pointer"
          >
            {tx('關閉 Close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};
