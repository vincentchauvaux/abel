import type { ReactNode } from 'react';

import { LegalFooter } from '@/components/LegalFooter';
import { ModuleHeader } from '@/components/Layout';
import { Card } from '@/components/ui';

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="screen">
      <ModuleHeader title={title} />
      <Card>
        <article className="legal-prose">{children}</article>
      </Card>
      <LegalFooter />
    </div>
  );
}
