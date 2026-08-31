import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui';

type Props = {
  id: string;
  title: string;
  open: boolean;
  onToggle: (id: string) => void;
  action?: ReactNode;
  children: ReactNode;
};

export function AccordionSection({ id, title, open, onToggle, action, children }: Props) {
  return (
    <Card>
      <div className="accordion-head">
        <button type="button" className="accordion-trigger" onClick={() => onToggle(id)} aria-expanded={open}>
          <h2>{title}</h2>
          <ChevronDown size={20} className={`accordion-chevron${open ? ' open' : ''}`} aria-hidden />
        </button>
        {action ? <div className="accordion-action">{action}</div> : null}
      </div>
      {open ? <div className="accordion-body">{children}</div> : null}
    </Card>
  );
}
