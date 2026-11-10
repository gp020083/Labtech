import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { STATIC_DATA } from '../data/initialState';
import { EquipmentItem } from '../types';
import { nowTimestamp } from '../utils';
import { X, PackageCheck } from 'lucide-react';

export const EquipmentReturnModal: React.FC<{
  item: EquipmentItem | null;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const { user, returnEquipment } = useApp();
  const { lang, tx } = usePrefs();
  const [returnStore, setReturnStore] = useState('Office');
  const [staffId, setStaffId] = useState(user?.staffId || 'BS');
  const [returnedDt, setReturnedDt] = useState(() => nowTimestamp().replace(' ', 'T'));
  const [condition, setCondition] = useState<'good' | 'needs_check' | 'damaged'>('good');
  const [remark, setRemark] = useState('');

  useEffect(() => {
    if (item) {
      setReturnStore(item.store && item.store !== 'Disposed' ? item.store : 'Office');
      setStaffId(item.currentLoan?.borrowerStaffId || user?.staffId || 'BS');
      setReturnedDt(nowTimestamp().replace(' ', 'T'));
      setCondition('good');
      setRemark('');
    }
  }, [item, user?.staffId]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = STATIC_DATA.staff.find((s: any) => s.id === staffId);
    returnEquipment({
      code: item.code,
      returnStore: returnStore.trim() || 'Office',
      returnedBy: staff ? staff.name : user?.name || 'Operator',
      returnedAt: returnedDt.replace('T', ' '),
      condition,
      remark: remark.trim(),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-paper p-5 shadow-xl space-y-3.5 text-xs"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-[#1f7a4d]" />
            <h3 className="text-sm font-bold text-ink">{tx(`登記 Return 交還：${item.code}`, `Return Equipment: ${item.code}`)}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-lg bg-ground p-2.5 text-ink-soft">
          {tx('現時借出 Site：', 'Current Site: ')}<span className="font-bold text-ink">{item.currentLoan?.siteLocation || item.loc}</span>
          （{tx('借用人', 'Borrower')}: {item.currentLoan?.borrowerName || '—'}）
        </div>

        <div>
          <label className="font-semibold text-ink-soft">{tx('交還同事', 'Returned By (Operator)')}</label>
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm">
            {STATIC_DATA.staff.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} {lang === 'zh' && s.zh ? `(${s.zh})` : ''}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="font-semibold text-ink-soft">{tx('Return 入倉位置', 'Return Storage Location')}</label>
            <input required value={returnStore} onChange={(e) => setReturnStore(e.target.value)} placeholder={tx('例如：Office / 粉嶺倉', 'e.g. Office / Fanling Depot')} className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-sm" />
          </div>
          <div>
            <label className="font-semibold text-ink-soft">{tx('交還日期及時間', 'Return Date & Time')}</label>
            <input type="datetime-local" required value={returnedDt} onChange={(e) => setReturnedDt(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs font-mono" />
          </div>
        </div>

        <div>
          <label className="font-semibold text-ink-soft">{tx('交還時 Equipment Condition', 'Equipment Condition on Return')}</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value as any)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="good">{tx('✓ Good 運作正常（可供下次直接 Checkout）', '✓ Good — Ready for next checkout')}</option>
            <option value="needs_check">{tx('⚠ Needs Check 需清潔 / 內部檢查', '⚠ Needs Cleaning / Inspection')}</option>
            <option value="damaged">{tx('✕ Damaged 發現異常 / 送修（自動凍結借用）', '✕ Damaged / Out of Service (Lock Checkout)')}</option>
          </select>
        </div>

        <div>
          <label className="font-semibold text-ink-soft">{tx('Return Remark（選填）', 'Return Remark (Optional)')}</label>
          <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder={tx('已清潔 Probe 並放回原箱...', 'Probe cleaned and packed in case...')} className="mt-1 w-full rounded-lg border border-line px-3 py-1.5 text-sm" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-ink-soft hover:bg-ground cursor-pointer">{tx('取消', 'Cancel')}</button>
          <button type="submit" className="rounded-lg bg-[#1f7a4d] px-4 py-2 font-bold text-white hover:opacity-90 cursor-pointer">{tx('確認 Return 入倉', 'Confirm Return')}</button>
        </div>
      </form>
    </div>
  );
};
