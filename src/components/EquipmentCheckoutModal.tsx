import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { STATIC_DATA } from '../data/initialState';
import { EquipmentItem } from '../types';
import { nowTimestamp, REF_TODAY } from '../utils';
import { evaluateCheckoutCompliance } from '../utils/limsRules';
import { X, PackagePlus, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

function defaultExpectedReturnIso(baseIso: string): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, (d || 1) + 7));
  return dt.toISOString().slice(0, 10);
}

export const EquipmentCheckoutModal: React.FC<{
  item: EquipmentItem | null;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const { user, jobs, checkoutEquipment } = useApp();
  const { lang, tx } = usePrefs();
  const [staffId, setStaffId] = useState(user?.staffId || 'BS');
  const [jobNo, setJobNo] = useState('LT0002');
  const [customSite, setCustomSite] = useState('');
  const [checkoutDt, setCheckoutDt] = useState(() => nowTimestamp().replace(' ', 'T'));
  const [expectedReturn, setExpectedReturn] = useState(() => defaultExpectedReturnIso(REF_TODAY));
  const [remark, setRemark] = useState('');
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  useEffect(() => {
    if (item) {
      setCheckoutDt(nowTimestamp().replace(' ', 'T'));
      setExpectedReturn(defaultExpectedReturnIso(REF_TODAY));
      setRemark('');
      setOverrideConfirmed(false);
    }
  }, [item]);

  const compliance = useMemo(
    () => (item ? evaluateCheckoutCompliance(item, expectedReturn, REF_TODAY) : null),
    [item, expectedReturn]
  );

  if (!item || !compliance) return null;

  const canSubmit = !compliance.requiresOverride || (overrideConfirmed && remark.trim().length >= 4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const staff = STATIC_DATA.staff.find((s: any) => s.id === staffId);
    const job = jobs.find((j) => j.no === jobNo);
    const siteLocation =
      customSite.trim() ||
      (job ? `${job.shortName} (${job.companyProjNo})` : '地盤現場');

    const finalRemark = compliance.requiresOverride
      ? `[HOKLAS Override] ${remark.trim()}`
      : remark.trim();

    checkoutEquipment({
      code: item.code,
      borrowerStaffId: staffId,
      borrowerName: staff ? staff.name : user?.name || 'Operator',
      jobNo,
      siteLocation,
      checkoutAt: checkoutDt.replace('T', ' '),
      expectedReturn,
      remark: finalRemark,
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
            <PackagePlus className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-bold text-ink">{tx(`登記 Checkout 借出：${item.code}`, `Checkout Equipment: ${item.code}`)}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-ink-soft">{item.name}（S/N: {item.serial}）</div>

        <div
          className={`rounded-xl border p-3 space-y-1.5 ${
            compliance.level === 'blocked'
              ? 'border-rose-300 bg-rose-50 text-rose-900'
              : compliance.level === 'warn'
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-1.5 font-extrabold">
            {compliance.level === 'blocked' ? (
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
            ) : compliance.level === 'warn' ? (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            <span>{lang === 'en' ? compliance.titleEn : compliance.titleZh}</span>
          </div>
          <p className="text-[11px] leading-relaxed">{lang === 'en' ? compliance.detailEn : compliance.detailZh}</p>
          {compliance.requiresOverride && (
            <label className="mt-1.5 flex items-start gap-2 rounded-lg bg-white/80 p-2 text-[11px] font-bold text-rose-800 cursor-pointer border border-rose-200">
              <input
                type="checkbox"
                checked={overrideConfirmed}
                onChange={(e) => setOverrideConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-rose-300 text-rose-600"
              />
              <span>
                {tx(
                  '本人確認此器材僅作內部比對／維修送檢（不可用於簽發 HOKLAS 認可報告），並已於下方 Remark 註明原因',
                  'I confirm this instrument is for internal check / external calibration only (NOT for HOKLAS accredited testing) and have stated the reason in Remark below'
                )}
              </span>
            </label>
          )}
        </div>

        <div>
          <label className="font-semibold text-ink-soft">{tx('借用同事 (Operator)', 'Borrower (Operator)')}</label>
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm">
            {STATIC_DATA.staff.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} {lang === 'zh' && s.zh ? `(${s.zh})` : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold text-ink-soft">{tx('借出目的地 Site', 'Destination Site')}</label>
          <select value={jobNo} onChange={(e) => setJobNo(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm">
            {jobs.map((j) => (
              <option key={j.no} value={j.no}>{j.no} | {j.companyProjNo} ({j.shortName})</option>
            ))}
            <option value="">{tx('其他地點（於下方填寫）', 'Other Location (specify below)')}</option>
          </select>
        </div>

        <div>
          <label className="font-semibold text-ink-soft">{tx('具體 Location（選填）', 'Specific Location (Opt.)')}</label>
          <input value={customSite} onChange={(e) => setCustomSite(e.target.value)} placeholder={tx('如：大坑西 / 粉嶺倉', 'e.g. Tai Hang Sai / Depot')} className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="font-semibold text-ink-soft">{tx('借出日期及時間', 'Checkout Date & Time')}</label>
            <input type="datetime-local" required value={checkoutDt} onChange={(e) => setCheckoutDt(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs font-mono" />
          </div>
          <div>
            <label className="font-semibold text-ink-soft">{tx('預計 Return 日期', 'Expected Return Date')}</label>
            <input type="date" required value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-xs font-mono" />
          </div>
        </div>

        <div>
          <label className="font-semibold text-ink-soft">
            {compliance.requiresOverride
              ? tx('特批借出原因 Remark（必填 *）', 'Override Reason Remark (Required *)')
              : tx('Remark（配件 / Probe Cable 狀況）', 'Remark (Accessories / Cable)')}
          </label>
          <input
            required={compliance.requiresOverride}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={
              compliance.requiresOverride
                ? tx('必填：如「送交標準校正中心外校」或「粉嶺倉內部比對」', 'Required: e.g. Send out for external calibration / Lab verification')
                : tx('例如：連 100m Probe 線及 Battery Box', 'e.g. With 100m probe cable & battery box')
            }
            className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm ${
              compliance.requiresOverride ? 'border-rose-300 bg-rose-50/30' : 'border-line'
            }`}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-ink-soft hover:bg-ground cursor-pointer">{tx('取消', 'Cancel')}</button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`rounded-lg px-4 py-2 font-bold text-white transition ${
              canSubmit ? 'bg-brand hover:bg-brand-deep cursor-pointer' : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {compliance.requiresOverride ? tx('特批確認借出', 'Override & Checkout') : tx('確認 Checkout', 'Confirm Checkout')}
          </button>
        </div>
      </form>
    </div>
  );
};

