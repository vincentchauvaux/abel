import { ChevronDown, GripVertical } from 'lucide-react';
import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

import type { DashSectionId } from '@/lib/dash-layout';

type Props = {
  id: DashSectionId;
  title: string;
  collapsed: boolean;
  onToggle: (id: DashSectionId) => void;
  onMove: (from: DashSectionId, over: DashSectionId) => void;
  action?: ReactNode;
  children: ReactNode;
};

const DRAG_ATTR = 'data-dash-section';

export function DashSection({ id, title, collapsed, onToggle, onMove, action, children }: Props) {
  const dragging = useRef(false);
  const lastOver = useRef<DashSectionId | null>(null);

  const onGripPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!collapsed) return;
    event.preventDefault();
    dragging.current = true;
    lastOver.current = id;
    event.currentTarget.classList.add('is-dragging');
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onGripPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;
    const node = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find((el) => el instanceof HTMLElement && el.hasAttribute(DRAG_ATTR)) as HTMLElement | undefined;
    const over = node?.getAttribute(DRAG_ATTR) as DashSectionId | null;
    if (!over || over === lastOver.current) return;
    lastOver.current = over;
    onMove(id, over);
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    lastOver.current = null;
    event.currentTarget.classList.remove('is-dragging');
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className={`dash-block${collapsed ? ' is-collapsed' : ''}`} data-dash-section={id}>
      <div className="dash-block-head">
        {collapsed ? (
          <button
            type="button"
            className="dash-block-grip"
            aria-label={`Déplacer ${title}`}
            onPointerDown={onGripPointerDown}
            onPointerMove={onGripPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}>
            <GripVertical size={18} aria-hidden />
          </button>
        ) : (
          <span className="dash-block-grip-spacer" aria-hidden />
        )}
        <button
          type="button"
          className="dash-block-toggle"
          aria-expanded={!collapsed}
          onClick={() => onToggle(id)}>
          <span className="dash-section">{title}</span>
          <ChevronDown size={18} className={`accordion-chevron${collapsed ? '' : ' open'}`} aria-hidden />
        </button>
        {action ? <div className="dash-block-action">{action}</div> : null}
      </div>
      {collapsed ? null : <div className="dash-block-body">{children}</div>}
    </section>
  );
}
