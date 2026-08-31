import { Plus } from 'lucide-react';
import { useRef } from 'react';

import { prepareBabyPhoto } from '@/lib/baby-photo';

type Props = {
  photoUrl: string | null;
  editable: boolean;
  onChange: (url: string | null) => void;
};

export function BabyPhoto({ photoUrl, editable, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = () => {
    if (!editable) return;
    inputRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await prepareBabyPhoto(file);
      onChange(dataUrl);
    } catch {
      window.alert('Impossible d’utiliser cette image. Essaie une photo JPG ou PNG.');
    }
  };

  return (
    <div className="baby-photo-wrap">
      <button
        type="button"
        className={`baby-photo${editable ? ' editable' : ''}${photoUrl ? ' has-photo' : ''}`}
        onClick={pick}
        disabled={!editable}
        aria-label={photoUrl ? 'Changer la photo' : 'Ajouter une photo'}>
        {photoUrl ? <img src={photoUrl} alt="" /> : editable ? <Plus size={28} strokeWidth={2.5} aria-hidden /> : null}
      </button>
      {editable ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="baby-photo-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              void onFile(file);
              e.target.value = '';
            }}
          />
          {photoUrl ? (
            <button type="button" className="linkish baby-photo-remove" onClick={() => onChange(null)}>
              Retirer la photo
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
