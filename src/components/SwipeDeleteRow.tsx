import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

const ACTION_W = 96;
const OPEN_THRESHOLD = 40;

type Props = {
  children: ReactNode;
  onDelete: () => void | Promise<void>;
  /** Libellé accessible (ex. « ce biberon »). */
  label?: string;
};

/**
 * Swipe gauche → corbeille ; 1er tap = Confirmer (fond rouge), 2e tap = supprimer.
 * Comme l’éditeur journal : 2 gestes pour éviter les fausses manips.
 */
export function SwipeDeleteRow({ children, onDelete, label = 'cette entrée' }: Props) {
  const [offset, setOffset] = useState(0);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const axis = useRef<'h' | 'v' | null>(null);
  const suppressClick = useRef(false);
  const dragging = useRef(false);
  const open = offset < -OPEN_THRESHOLD / 2;

  useEffect(() => {
    if (!open) setArmed(false);
  }, [open]);

  const close = () => {
    setOffset(0);
    setArmed(false);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (busy || e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startOffset.current = offset;
    axis.current = null;
    dragging.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (busy || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!axis.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axis.current = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
    }
    if (axis.current === 'v') return;
    dragging.current = true;
    const next = Math.min(0, Math.max(-ACTION_W, startOffset.current + dx));
    setOffset(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (axis.current === 'v') {
      axis.current = null;
      return;
    }
    if (dragging.current || axis.current === 'h') suppressClick.current = true;
    const shouldOpen = offset < -OPEN_THRESHOLD;
    setOffset(shouldOpen ? -ACTION_W : 0);
    if (!shouldOpen) setArmed(false);
    axis.current = null;
    dragging.current = false;
  };

  const onContentClick = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
      return;
    }
    if (open) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  const onActionClick = async () => {
    if (busy) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
      close();
    }
  };

  return (
    <div className={`swipe-delete${open ? ' is-open' : ''}${armed ? ' is-armed' : ''}`}>
      <div className="swipe-delete-actions" aria-hidden={!open}>
        <button
          type="button"
          className={`swipe-delete-btn${armed ? ' is-armed' : ''}`}
          disabled={busy || !open}
          tabIndex={open ? 0 : -1}
          aria-label={armed ? `Confirmer la suppression de ${label}` : `Supprimer ${label}`}
          onClick={() => void onActionClick()}>
          <Trash2 size={18} strokeWidth={2.2} aria-hidden />
          <span>{armed ? 'Confirmer' : 'Supprimer'}</span>
        </button>
      </div>
      <div
        className="swipe-delete-content"
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onContentClick}>
        {children}
      </div>
    </div>
  );
}
