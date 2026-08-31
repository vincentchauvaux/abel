import type { ReactNode } from 'react';

export function Card({ children }: { children: ReactNode }) {
  return <section className="card">{children}</section>;
}

export function Button({
  children,
  onClick,
  disabled,
  tone = 'primary',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'accent' | 'danger' | 'muted' | 'success';
  type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`btn btn-${tone}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`chip ${selected ? 'on' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode = 'decimal',
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: 'decimal' | 'numeric' | 'text';
  multiline?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
        />
      )}
    </label>
  );
}
