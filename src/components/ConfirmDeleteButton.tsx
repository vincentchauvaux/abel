import { useEffect, useState, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

type Props = {
  onConfirm: () => void | Promise<void>;
  idleLabel?: ReactNode;
  confirmLabel?: ReactNode;
  disabled?: boolean;
  /** Classes de base (défaut : bouton journal). */
  className?: string;
  /** Change pour désarmer (ex. id de la photo / ligne). */
  resetKey?: string | number | null;
  'aria-label'?: string;
  showTrashOnConfirm?: boolean;
};

/**
 * Suppression en 2 taps : 1er = armer (fond rouge léger), 2e = confirmer.
 * Même DA que l’éditeur journal / l’album.
 */
export function ConfirmDeleteButton({
  onConfirm,
  idleLabel = 'Supprimer',
  confirmLabel = 'Confirmer',
  disabled = false,
  className = 'btn btn-delete',
  resetKey,
  'aria-label': ariaLabel,
  showTrashOnConfirm = true,
}: Props) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setArmed(false);
  }, [resetKey]);

  const idleAria =
    ariaLabel ?? (typeof idleLabel === 'string' ? idleLabel : 'Supprimer');

  return (
    <button
      type="button"
      className={`${className}${armed ? ' is-armed' : ''}`}
      disabled={disabled || busy}
      aria-label={armed ? 'Confirmer la suppression' : idleAria}
      onClick={(event) => {
        event.stopPropagation();
        if (busy || disabled) return;
        if (!armed) {
          setArmed(true);
          return;
        }
        setBusy(true);
        void Promise.resolve(onConfirm()).finally(() => {
          setBusy(false);
          setArmed(false);
        });
      }}>
      {armed ? (
        showTrashOnConfirm ? (
          <>
            <Trash2 size={18} strokeWidth={2.2} aria-hidden />
            {confirmLabel}
          </>
        ) : (
          confirmLabel
        )
      ) : (
        idleLabel
      )}
    </button>
  );
}
