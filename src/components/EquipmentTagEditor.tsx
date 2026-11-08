import React, { useState } from 'react';
import { usePrefs } from '../prefs';
import { Tag, Plus } from 'lucide-react';

export const STANDARD_TEST_TAGS: { code: string; label: string }[] = [
  { code: 'KD', label: 'KD (Koden)' },
  { code: 'SO', label: 'SO (Sonic)' },
  { code: 'FC', label: 'FC (Flow Cone)' },
  { code: 'BL', label: 'BL (Bleeding)' },
  { code: 'PO', label: 'PO (Point Load)' },
  { code: 'PLT', label: 'PLT (Plate Load)' },
  { code: 'VC', label: 'VC (Inclinometer)' },
];

export const EquipmentTagEditor: React.FC<{
  tags: string[];
  onToggle: (tag: string) => void;
}> = ({ tags, onToggle }) => {
  const { tx } = usePrefs();
  const [customTag, setCustomTag] = useState('');

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTag.trim().toUpperCase();
    if (!clean) return;
    if (!tags.includes(clean)) onToggle(clean);
    setCustomTag('');
  };

  return (
    <div className="rounded-xl border border-line bg-ground/70 p-3.5 space-y-2.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-bold text-ink">
          <Tag className="h-3.5 w-3.5 text-brand" />
          {tx('適用 / 共用 Test Tag（點擊即可切換）', 'Shared Test Tags (Click to toggle)')}
        </span>
        <span className="text-[11px] text-ink-faint">{tx('支援跨 Test 共用工具', 'Cross-test shared tool')}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STANDARD_TEST_TAGS.map((t) => {
          const active = tags.includes(t.code);
          return (
            <button
              key={t.code}
              type="button"
              onClick={() => onToggle(t.code)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                active
                  ? 'border-brand bg-brand text-white shadow-2xs'
                  : 'border-line bg-paper text-ink-soft hover:border-brand'
              }`}
            >
              {active ? `✓ ${t.label}` : `+ ${t.label}`}
            </button>
          );
        })}
        {tags
          .filter((tg) => !STANDARD_TEST_TAGS.some((s) => s.code === tg))
          .map((tg) => (
            <button
              key={tg}
              type="button"
              onClick={() => onToggle(tg)}
              className="rounded-full border border-brand bg-brand text-white px-2.5 py-1 text-[11px] font-bold cursor-pointer"
            >
              ✓ {tg} ×
            </button>
          ))}
      </div>
      <form onSubmit={handleAddCustom} className="flex gap-1.5 pt-0.5">
        <input
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          placeholder={tx('新增自訂 Tag（如 COMMON / CORE）...', 'Add custom tag (e.g. COMMON / CORE)...')}
          className="flex-1 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs outline-none focus:border-brand"
        />
        <button type="submit" className="inline-flex items-center gap-1 rounded-lg border border-brand bg-paper px-2.5 py-1 font-bold text-brand-deep hover:bg-brand-wash cursor-pointer">
          <Plus className="h-3 w-3" />{tx('加 Tag', 'Add Tag')}
        </button>
      </form>
    </div>
  );
};
