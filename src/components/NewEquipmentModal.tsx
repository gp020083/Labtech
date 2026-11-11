import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { X, Wrench } from 'lucide-react';

const TAG_OPTIONS = ['KD', 'SO', 'FC', 'BL', 'PO', 'PLT', 'VC'];

function isTopmostModalBackdrop(target: HTMLElement | null): boolean {
  if (!target) return false;
  const backdrops = Array.from(
    document.querySelectorAll<HTMLElement>('[data-modal-backdrop="true"]:not([data-auth-gate="true"])')
  );
  if (backdrops.length === 0) return true;
  const getZ = (el: HTMLElement) => {
    const attrZ = Number(el.dataset.modalZ);
    if (!Number.isNaN(attrZ) && attrZ > 0) return attrZ;
    const computed = Number.parseInt(window.getComputedStyle(el).zIndex, 10);
    return Number.isNaN(computed) ? 0 : computed;
  };
  let topEl = backdrops[0];
  let topZ = getZ(topEl);
  for (let i = 1; i < backdrops.length; i++) {
    const z = getZ(backdrops[i]);
    if (z >= topZ) {
      topEl = backdrops[i];
      topZ = z;
    }
  }
  return topEl === target;
}

export const NewEquipmentModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { addEquipment } = useApp();
  const { tx } = usePrefs();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [maker, setMaker] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [due, setDue] = useState('2027-06-30');
  const [store, setStore] = useState('Fanling Lab Store A');
  const [tags, setTags] = useState<string[]>(['KD']);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isTopmostModalBackdrop(backdropRef.current)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addEquipment({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      maker: maker.trim() || 'Labtech',
      model: model.trim() || 'Standard',
      serial: serial.trim() || 'N/A',
      inUse: 'Y',
      tests: tags.join(' + ') || '—',
      testTags: tags,
      req: '12 個月校驗',
      last: '2026-11-06',
      due,
      certDue: due,
      store: store.trim(),
      loc: store.trim(),
      remark: '',
      calCerts: [],
      currentLoan: null,
    });
    onClose();
  };

  return createPortal(
    <div
      ref={backdropRef}
      data-modal-backdrop="true"
      data-modal-z="76"
      className="fixed inset-0 z-[76] flex items-center justify-center bg-slate-900/45 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-3 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900"><Wrench className="h-4 w-4 text-brand" />{tx('新增測試 Equipment / Tool', 'Add Testing Equipment / Tool')}</div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div><label className="font-bold text-slate-600">{tx('Equipment Code *', 'Equipment Code *')}</label><input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="EQ-SO-09" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono uppercase" /></div>
          <div><label className="font-bold text-slate-600">{tx('Cal Due Date *', 'Cal Due Date *')}</label><input type="date" required value={due} onChange={(e) => setDue(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
        </div>
        <div><label className="font-bold text-slate-600">{tx('Equipment Name *', 'Equipment Name *')}</label><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Sonic Logging Probe / 100m Steel Tape" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
        <div className="grid grid-cols-3 gap-2">
          <div><label className="font-bold text-slate-600">{tx('Maker 牌子', 'Maker')}</label><input value={maker} onChange={(e) => setMaker(e.target.value)} placeholder="Koden" className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm" /></div>
          <div><label className="font-bold text-slate-600">{tx('Model 型號', 'Model')}</label><input value={model} onChange={(e) => setModel(e.target.value)} placeholder="DM-604" className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm" /></div>
          <div><label className="font-bold text-slate-600">Serial S/N</label><input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="88312" className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm font-mono" /></div>
        </div>
        <div><label className="font-bold text-slate-600">{tx('預設存放 Store 倉位', 'Default Store Location')}</label><input value={store} onChange={(e) => setStore(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm" /></div>
        <div>
          <label className="font-bold text-slate-600">{tx('適用 Test Tags · 可多選共用', 'Shared Test Tags · Multi-select')}</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TAG_OPTIONS.map((t) => (
              <button key={t} type="button" onClick={() => toggleTag(t)} className={`rounded-lg border px-2.5 py-1 font-mono font-bold cursor-pointer ${tags.includes(t) ? 'border-brand bg-brand-wash text-brand-deep' : 'border-slate-200 text-slate-500'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer">{tx('取消', 'Cancel')}</button>
          <button type="submit" className="rounded-xl bg-brand px-4 py-2 font-bold text-white hover:bg-brand-deep cursor-pointer">{tx('Save 新增器材', 'Create Equipment')}</button>
        </div>
      </form>
    </div>,
    document.body
  );
};
