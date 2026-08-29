import { useEffect, useState } from 'react';

import { Button, Card } from '@/components/ui';
import { renameBaby } from '@/db/api';
import { useDb } from '@/db/DbProvider';

export function ProfilePage() {
  const { baby } = useDb();
  const [name, setName] = useState(baby?.name ?? '');

  useEffect(() => {
    if (baby?.name) setName(baby.name);
  }, [baby?.name]);

  return (
    <div className="screen">
      <h1>Profil</h1>
      <Card>
        <h2>Prénom du bébé</h2>
        <label className="field">
          <span>Nom</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => baby && renameBaby(baby.id, name)}
          />
        </label>
        <Button onClick={() => baby && renameBaby(baby.id, name)}>Enregistrer</Button>
      </Card>
      <Card>
        <p className="muted">
          Les données restent dans ce navigateur (même hors ligne). Un compte et une sync viendront plus tard
          sur le VPS.
        </p>
      </Card>
    </div>
  );
}
