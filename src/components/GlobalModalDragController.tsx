import React, { useEffect } from 'react';

const INTERACTIVE_SELECTOR =
  'button, input, select, textarea, a, label, [role="button"], [contenteditable="true"], [data-no-drag]';

function markDraggableModals() {
  const backdrops = document.querySelectorAll<HTMLElement>('div.fixed.inset-0');
  backdrops.forEach((backdrop) => {
    // Skip if the fixed inset-0 container itself is a full-screen mobile sheet
    if (
      backdrop.classList.contains('h-[100dvh]') &&
      backdrop.classList.contains('bg-white')
    ) {
      return;
    }
    const dialog = backdrop.firstElementChild as HTMLElement | null;
    if (!dialog) return;
    if (dialog.tagName === 'DIV' || dialog.tagName === 'FORM') {
      if (backdrop.getAttribute('data-modal-backdrop') !== 'true') {
        backdrop.setAttribute('data-modal-backdrop', 'true');
      }
      if (dialog.getAttribute('data-draggable-dialog') !== 'true') {
        dialog.setAttribute('data-draggable-dialog', 'true');
      }
    }
  });
}

/** Dragging is a desktop-only affordance; on phones/touch it would block scrolling and can push windows off-screen. */
function isDragAllowed(e: PointerEvent | MouseEvent): boolean {
  if (window.innerWidth < 768) return false;
  if ('pointerType' in e && (e as PointerEvent).pointerType === 'touch') return false;
  return true;
}

function isDragHandleRegion(dialog: HTMLElement, target: HTMLElement, clientY: number): boolean {
  if (target.closest(INTERACTIVE_SELECTOR)) return false;
  const rect = dialog.getBoundingClientRect();
  // Top ::before drag strip or top 42px of the dialog
  if (clientY - rect.top <= 42) return true;
  // Or inside the modal's top header bar (first child element)
  const firstChild = dialog.firstElementChild;
  if (firstChild && firstChild.contains(target)) return true;
  return false;
}
export const GlobalModalDragController: React.FC = () => {
  useEffect(() => {
    const offsets = new WeakMap<HTMLElement, { x: number; y: number }>();
    let activeDialog: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;
    let moved = false;
    let suppressNextClickUntil = 0;

    markDraggableModals();
    const observer = new MutationObserver(() => markDraggableModals());
    observer.observe(document.body, { childList: true, subtree: true });

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (!isDragAllowed(e)) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const dialog = target.closest<HTMLElement>('[data-draggable-dialog="true"]');
      if (!dialog) return;
      if (!isDragHandleRegion(dialog, target, e.clientY)) return;

      const current = offsets.get(dialog) || { x: 0, y: 0 };
      activeDialog = dialog;
      startX = e.clientX;
      startY = e.clientY;
      origX = current.x;
      origY = current.y;
      moved = false;
      dialog.setAttribute('data-dragging', 'true');
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activeDialog) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) > 3) moved = true;
      const maxX = Math.max(window.innerWidth * 0.75, 320);
      const maxY = Math.max(window.innerHeight * 0.75, 260);
      const nextX = Math.max(-maxX, Math.min(maxX, origX + dx));
      const nextY = Math.max(-maxY, Math.min(maxY, origY + dy));
      offsets.set(activeDialog, { x: nextX, y: nextY });
      activeDialog.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
    };

    const onPointerUp = () => {
      if (!activeDialog) return;
      activeDialog.removeAttribute('data-dragging');
      if (moved) {
        suppressNextClickUntil = Date.now() + 120;
      }
      activeDialog = null;
    };

    const onDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !isDragAllowed(e)) return;
      const dialog = target.closest<HTMLElement>('[data-draggable-dialog="true"]');
      if (!dialog) return;
      if (!isDragHandleRegion(dialog, target, e.clientY)) return;
      offsets.set(dialog, { x: 0, y: 0 });
      dialog.style.transform = '';
    };

    const onClickCapture = (e: MouseEvent) => {
      if (Date.now() < suppressNextClickUntil) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
    window.addEventListener('dblclick', onDblClick, true);
    window.addEventListener('click', onClickCapture, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
      window.removeEventListener('dblclick', onDblClick, true);
      window.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  return null;
};
