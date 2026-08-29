export type GoogleUser = {
  sub: string;
  email: string;
  name: string;
  picture: string;
};

const STORAGE_KEY = 'abel-google-user';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
export const GOOGLE_CLIENT_CONSOLE_URL = 'https://console.cloud.google.com/auth/clients';
export const GOOGLE_CREDENTIALS_URL = 'https://console.cloud.google.com/apis/credentials';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; text?: string; width?: number; locale?: string },
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

function decodeJwt(credential: string): GoogleUser {
  const payload = credential.split('.')[1];
  const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  };
  return {
    sub: json.sub,
    email: json.email ?? '',
    name: json.name ?? json.email ?? 'Compte Google',
    picture: json.picture ?? '',
  };
}

export function readGoogleUser(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GoogleUser) : null;
  } catch {
    return null;
  }
}

export function writeGoogleUser(user: GoogleUser | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}

function loadGis(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-abel-gis]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GIS')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.abelGis = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('GIS'));
    document.head.appendChild(script);
  });
}

export async function renderGoogleButton(
  host: HTMLElement,
  onUser: (user: GoogleUser) => void,
): Promise<void> {
  if (!GOOGLE_CLIENT_ID) return;
  await loadGis();
  if (!window.google?.accounts.id) return;
  host.replaceChildren();
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => onUser(decodeJwt(response.credential)),
  });
  window.google.accounts.id.renderButton(host, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    locale: 'fr',
    width: Math.min(320, host.clientWidth || 280),
  });
}

export function signOutGoogle() {
  writeGoogleUser(null);
  window.google?.accounts.id.disableAutoSelect();
}
