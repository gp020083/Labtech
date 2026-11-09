import React, { useEffect } from 'react';

const collator = new Intl.Collator('zh-Hant-HK', {
  numeric: true,
  sensitivity: 'base',
});

interface TableSortState {
  colIdx: number;
  dir: 'asc' | 'desc';
  headerSig: string;
}

function getHeaderSignature(theadRow: HTMLTableRowElement): string {
  return Array.from(theadRow.cells)
    .map((th) => (th.textContent || '').replace(/[↕↑↓]/g, '').trim())
    .join('|');
}

function extractCellSortValue(row: HTMLTableRowElement, colIdx: number): { empty: boolean; dateKey: string; textKey: string } {
  const cell = row.cells[colIdx];
  if (!cell) return { empty: true, dateKey: '', textKey: '' };

  let raw = (cell.innerText || cell.textContent || '').replace(/\s+/g, ' ').trim();
  if (!raw) {
    const filledSvg = cell.querySelector('svg[fill="currentColor"]');
    if (filledSvg) raw = '1_pinned';
    else if (cell.querySelector('svg')) raw = '0_unpinned';
  }

  const cleaned = raw.replace(/^[—\-–\s]+$/, '');
  if (!cleaned || cleaned === '無' || cleaned === 'N/A') {
    return { empty: true, dateKey: '', textKey: '' };
  }

  const isoMatch = cleaned.match(/\b(20\d{2}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)\b/);
  return {
    empty: false,
    dateKey: isoMatch ? isoMatch[1] : '',
    textKey: cleaned,
  };
}

function updateHeaderIndicators(theadRow: HTMLTableRowElement, activeCol: number, dir: 'asc' | 'desc' | null) {
  Array.from(theadRow.cells).forEach((th, idx) => {
    th.setAttribute('data-sortable-th', 'true');
    th.setAttribute('data-col-idx', String(idx));
    if (!th.getAttribute('title')) {
      th.setAttribute('title', '點擊切換升序 / 降序排列 (Click to sort)');
    }
    th.style.cursor = 'pointer';
    th.style.userSelect = 'none';

    let badge = th.querySelector<HTMLElement>('[data-sort-indicator="true"]');
    if (!badge) {
      badge = document.createElement('span');
      badge.setAttribute('data-sort-indicator', 'true');
      badge.style.display = 'inline-block';
      badge.style.marginLeft = '4px';
      badge.style.fontSize = '10px';
      badge.style.lineHeight = '1';
      badge.style.verticalAlign = 'middle';
      badge.style.transition = 'opacity 0.15s ease, color 0.15s ease';
      th.appendChild(badge);
    }

    if (idx === activeCol && dir) {
      th.setAttribute('data-sort-dir', dir);
      badge.textContent = dir === 'asc' ? '↑' : '↓';
      badge.style.opacity = '1';
      badge.style.color = '#2563eb';
      badge.style.fontWeight = '900';
    } else {
      th.removeAttribute('data-sort-dir');
      badge.textContent = '↕';
      badge.style.opacity = '0.38';
      badge.style.color = 'currentColor';
      badge.style.fontWeight = '700';
    }
  });
}

function sortTableBody(table: HTMLTableElement, colIdx: number, dir: 'asc' | 'desc') {
  const tbody = table.tBodies[0];
  if (!tbody) return;
  const allRows = Array.from(tbody.rows);
  if (allRows.length <= 1) return;

  allRows.forEach((r, i) => {
    if (!r.hasAttribute('data-orig-idx')) {
      r.setAttribute('data-orig-idx', String(i));
    }
  });

  const sortableRows = allRows.filter((r) => !(r.cells.length === 1 && r.cells[0].colSpan > 1));
  if (sortableRows.length <= 1) return;

  const mult = dir === 'asc' ? 1 : -1;
  const theadRow = table.tHead?.rows[0];
  const thText = (theadRow?.cells[colIdx]?.textContent || '').toLowerCase();
  const preferDate = /date|due|time|日期|到期|時間|修訂/.test(thText);

  sortableRows.sort((a, b) => {
    const va = extractCellSortValue(a, colIdx);
    const vb = extractCellSortValue(b, colIdx);
    if (va.empty && vb.empty) return 0;
    if (va.empty) return 1;
    if (vb.empty) return -1;

    if (preferDate && va.dateKey && vb.dateKey && va.dateKey !== vb.dateKey) {
      return collator.compare(va.dateKey, vb.dateKey) * mult;
    }
    const cmp = collator.compare(va.textKey, vb.textKey);
    if (cmp !== 0) return cmp * mult;
    return (Number(a.getAttribute('data-orig-idx') || 0) - Number(b.getAttribute('data-orig-idx') || 0));
  });

  sortableRows.forEach((r) => tbody.appendChild(r));
}

export const GlobalTableSortController: React.FC = () => {
  useEffect(() => {
    const stateMap = new WeakMap<HTMLTableElement, TableSortState>();
    let isMutating = false;

    const enhanceAllTables = () => {
      if (isMutating) return;
      isMutating = true;
      try {
        const tables = document.querySelectorAll<HTMLTableElement>('table');
        tables.forEach((table) => {
          if (table.closest('.hoklas-sheet')) return;
          const theadRow = table.tHead?.rows[0];
          const tbody = table.tBodies[0];
          if (!theadRow || !tbody || theadRow.cells.length === 0) return;

          const sig = getHeaderSignature(theadRow);
          const prev = stateMap.get(table);
          if (prev && prev.headerSig !== sig) {
            stateMap.delete(table);
            updateHeaderIndicators(theadRow, -1, null);
          } else if (prev) {
            updateHeaderIndicators(theadRow, prev.colIdx, prev.dir);
            sortTableBody(table, prev.colIdx, prev.dir);
          } else {
            updateHeaderIndicators(theadRow, -1, null);
          }
        });
      } finally {
        isMutating = false;
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const th = target.closest<HTMLTableCellElement>('thead tr:first-child th');
      if (!th) return;
      const table = th.closest<HTMLTableElement>('table');
      if (!table || table.closest('.hoklas-sheet')) return;
      const theadRow = table.tHead?.rows[0];
      if (!theadRow || th.parentElement !== theadRow) return;

      const colIdx = Array.from(theadRow.cells).indexOf(th);
      if (colIdx < 0) return;

      const prev = stateMap.get(table);
      const nextDir: 'asc' | 'desc' = prev && prev.colIdx === colIdx && prev.dir === 'asc' ? 'desc' : 'asc';
      const sig = getHeaderSignature(theadRow);

      isMutating = true;
      try {
        stateMap.set(table, { colIdx, dir: nextDir, headerSig: sig });
        updateHeaderIndicators(theadRow, colIdx, nextDir);
        sortTableBody(table, colIdx, nextDir);
      } finally {
        isMutating = false;
      }
    };

    enhanceAllTables();
    const observer = new MutationObserver(() => enhanceAllTables());
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', handleClick, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  return null;
};
