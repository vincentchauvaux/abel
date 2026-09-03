import { useRef, useState, type PointerEvent } from 'react';

const DRAG_PX = 8;

export type SegmentedOption<T extends string> = {
  key: T;
  label: string;
  ariaLabel?: string;
};

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  className?: string;
  size?: 'md' | 'lg';
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  size = 'md',
}: Props<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; dragging: boolean } | null>(null);
  const ignoreClick = useRef(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const selected = Math.max(0, options.findIndex((opt) => opt.key === value));
  const index = dragIndex ?? selected;

  const slotFromX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const pad = 4;
    const inner = Math.max(1, rect.width - pad * 2);
    const count = options.length;
    const slot = inner / count;
    const x = Math.min(Math.max(clientX - rect.left - pad, 0), inner);
    return Math.min(count - 1, Math.max(0, (x - slot / 2) / slot));
  };

  const commit = (clientX: number) => {
    const i = Math.round(slotFromX(clientX));
    const next = options[i]?.key;
    if (next && next !== value) onChange(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, dragging: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.dragging && Math.abs(event.clientX - drag.startX) < DRAG_PX) return;
    drag.dragging = true;
    ignoreClick.current = true;
    setDragIndex(slotFromX(event.clientX));
  };

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const wasDragging = drag.dragging;
    dragRef.current = null;
    setDragIndex(null);
    if (wasDragging) commit(event.clientX);
  };

  const onClick = (key: T) => {
    if (ignoreClick.current) {
      ignoreClick.current = false;
      return;
    }
    if (key !== value) onChange(key);
  };

  return (
    <div
      className={`segmented${size === 'lg' ? ' segmented-lg' : ''}${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={ariaLabel}>
      <div
        ref={trackRef}
        className={`segmented-track${dragIndex != null ? ' dragging' : ''}`}
        style={{ '--index': index, '--count': options.length } as React.CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}>
        <div className="segmented-thumb" aria-hidden />
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`segmented-btn ${value === opt.key ? 'on' : ''}`}
            onClick={() => onClick(opt.key)}
            aria-label={opt.ariaLabel}
            aria-pressed={value === opt.key}
            title={opt.ariaLabel}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
