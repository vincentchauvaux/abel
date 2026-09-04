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

export function MultiSelectField<T extends string>({
  label,
  values,
  onChange,
  options,
}: {
  label: string;
  values: T[];
  onChange: (values: T[]) => void;
  options: { value: T; label: string }[];
}) {
  const allSelected = options.length > 0 && options.every((o) => values.includes(o.value));
  const summary = allSelected
    ? 'Tout'
    : values.length === 0
      ? 'Aucun'
      : options
          .filter((o) => values.includes(o.value))
          .map((o) => o.label)
          .join(', ');

  const toggle = (value: T) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  const toggleAll = () => {
    onChange(allSelected ? [] : options.map((o) => o.value));
  };

  return (
    <div className="field multi-select-field">
      <span>{label}</span>
      <details className="multi-select">
        <summary>{summary}</summary>
        <div className="multi-select-panel" role="group" aria-label={label}>
          <label className="check-inline">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            Tout
          </label>
          {options.map((opt) => (
            <label key={opt.value} className="check-inline">
              <input type="checkbox" checked={values.includes(opt.value)} onChange={() => toggle(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
