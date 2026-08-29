import { ModuleHeader } from '@/components/Layout';
import { SmartEntryForm } from '@/components/SmartEntryForm';
import { Card } from '@/components/ui';

export function ManualPage() {
  return (
    <div className="screen">
      <ModuleHeader title="Entrée manuelle" />
      <Card>
        <h2>Noter n’importe quel outil</h2>
        <SmartEntryForm />
      </Card>
    </div>
  );
}
