import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { X, FileText } from 'lucide-react';

export const NewStpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { addStpItem, uploadStpDocFile } = useApp();
  const { tx } = usePrefs();
  const backdropRef = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [std, setStd] = useState('');
  const [stpDocCode, setStpDocCode] = useState('LAB-STP-010');
  const [stpRev, setStpRev] = useState('Rev. 1');
  const [worksheetCode, setWorksheetCode] = useState('WS-GEN-01');
  const [acc, setAcc] = useState(true);
  const [keyPointsRaw, setKeyPointsRaw] = useState(
    tx(
      '測試前核對器材有效 Cal Cert 及到期日\n按受控 STP 步驟記錄讀數及環境參數',
      'Verify valid Cal Cert & expiry date of instruments prior to testing\nRecord readings and ambient parameters per controlled STP'
    )
  );
  const [pendingFile, setPendingFile] = useState<{ fileName: string; fileSize: string; dataUrl?: string } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const target = backdropRef.current;
      if (!target) return;
      const backdrops = Array.from(
        document.querySelectorAll<HTMLElement>('[data-modal-backdrop="true"]:not([data-auth-gate="true"])')
      );
      const getZ = (el: HTMLElement) => {
        const attrZ = Number(el.dataset.modalZ);
        if (!Number.isNaN(attrZ) && attrZ > 0) return attrZ;
        const computed = Number.parseInt(window.getComputedStyle(el).zIndex, 10);
        return Number.isNaN(computed) ? 0 : computed;
      };
      let topEl = backdrops[0];
      let topZ = topEl ? getZ(topEl) : 0;
      for (let i = 1; i < backdrops.length; i++) {
        const z = getZ(backdrops[i]);
        if (z >= topZ) {
          topEl = backdrops[i];
          topZ = z;
        }
      }
      if (!topEl || topEl === target) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [onClose]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingFile({
        fileName: f.name,
        fileSize: `${Math.max(1, Math.round(f.size / 1024))} KB`,
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
    };
    reader.readAsDataURL(f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    addStpItem({
      code: cleanCode,
      name: name.trim(),
      short: name.trim().slice(0, 18),
      std: std.trim() || 'In-house / HOKLAS Standard',
      stp: `${stpDocCode.trim()} (${stpRev.trim()})`,
      stpDocCode: stpDocCode.trim(),
      stpRev: stpRev.trim(),
      stpEffectiveDate: '2026-11-06',
      worksheetCode: worksheetCode.trim(),
      acc,
      cost: null,
      keyParams: keyPointsRaw.split('\n').map((s) => s.trim()).filter(Boolean),
      equipmentTypes: [tx('指定有效校驗器材', 'Calibrated Testing Equipment')],
      versions: [{ ver: stpRev.trim(), date: '2026-11-06', status: 'current', note: tx('最新受控生效版本', 'Latest controlled effective edition') }],
      calCerts: [],
      stpFiles: [],
    });
    if (pendingFile) {
      uploadStpDocFile(cleanCode, { ...pendingFile, docType: tx('受控 STP PDF', 'Controlled STP PDF') });
    }
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={backdropRef}
      data-modal-backdrop="true"
      data-modal-z="85"
      className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/45 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl space-y-3 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900"><FileText className="h-4 w-4 text-brand" />{tx('新增受控 STP 文件', 'Add Controlled STP Document')}</div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><label className="font-bold text-slate-600">{tx('Test Code *', 'Test Code *')}</label><input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. UPV" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono uppercase" /></div>
          <div><label className="font-bold text-slate-600">{tx('STP No. *', 'STP Doc No. *')}</label><input required value={stpDocCode} onChange={(e) => setStpDocCode(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono" /></div>
          <div><label className="font-bold text-slate-600">Rev. *</label><input required value={stpRev} onChange={(e) => setStpRev(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono" /></div>
        </div>
        <div><label className="font-bold text-slate-600">{tx('Test 名稱 *', 'Test Title *')}</label><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ultrasonic Pulse Velocity Test" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
        <div className="grid grid-cols-2 gap-2.5">
          <div><label className="font-bold text-slate-600">{tx('參考 Standard', 'Reference Standard')}</label><input value={std} onChange={(e) => setStd(e.target.value)} placeholder="CS1 / ASTM..." className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm" /></div>
          <div><label className="font-bold text-slate-600">{tx('Worksheet 編號', 'Worksheet Code')}</label><input value={worksheetCode} onChange={(e) => setWorksheetCode(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-mono" /></div>
        </div>
        <div><label className="font-bold text-slate-600">{tx('核心檢查要點 Key Checkpoints · 每行一項', 'Field Key Checkpoints · 1 per line')}</label><textarea rows={3} value={keyPointsRaw} onChange={(e) => setKeyPointsRaw(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs" /></div>
        <div className="flex items-center justify-between rounded-xl border border-dashed border-brand/40 bg-brand-wash/30 p-3">
          <span className="font-semibold text-slate-700">{pendingFile ? `${tx('已選檔案', 'Selected')}: ${pendingFile.fileName}` : tx('可一併上傳受控 STP PDF 供同事查閱下載', 'Attach STP PDF for instant download')}</span>
          <label className="rounded-lg bg-brand px-3 py-1.5 font-bold text-white cursor-pointer shrink-0">{tx('選擇檔案', 'Choose File')}<input type="file" accept=".pdf" onChange={handleFile} className="hidden" /></label>
        </div>
        <label className="flex items-center gap-2 font-semibold text-slate-700"><input type="checkbox" checked={acc} onChange={(e) => setAcc(e.target.checked)} /> {tx('HOKLAS Accredited 認可項目', 'HOKLAS Accredited Test')}</label>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer">{tx('取消', 'Cancel')}</button>
          <button type="submit" className="rounded-xl bg-brand px-5 py-2 font-bold text-white hover:bg-brand-deep cursor-pointer">{tx('Publish 受控 STP', 'Publish Controlled STP')}</button>
        </div>
      </form>
    </div>,
    document.body
  );
};
