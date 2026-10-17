import { useRef, useState } from 'react';

type OnceOptions = {
  /** Après succès, libère le verrou (ex. reste sur la page). Sinon reste verrouillé (navigation). */
  releaseOnSuccess?: boolean;
};

/**
 * Empêche un double appui pendant une action lente (ex. Pipi ×2 → 2 entrées).
 * Le verrou ref est synchrone ; `busy` désactive les boutons dès le 1er tap.
 */
export function useOnceLock() {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, options?: OnceOptions) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await action();
      if (options?.releaseOnSuccess) {
        locked.current = false;
        setBusy(false);
      }
    } catch (error) {
      locked.current = false;
      setBusy(false);
      throw error;
    }
  };

  return { busy, run };
}
