export type GoogleUser = {
  sub: string;
  email: string;
  name: string;
  picture: string;
};

const STORAGE_KEY = 'abel-google-user';
const TOKEN_KEY = 'abel-google-token';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
export const SYNC_URL = (import.meta.env.VITE_SYNC_URL || 'https://mimom.be/api').replace(
  /\/$/,
  '',
);
export const GOOGLE_CLIENT_CONSOLE_URL = 'https://console.cloud.google.com/auth/clients';
export const GOOGLE_CREDENTIALS_URL = 'https://console.cloud.google.com/apis/credentials';

function notifyAuth() {
  window.dispatchEvent(new Event('abel-auth'));
}

function isGoogleIdToken(token: string): boolean {
  return token.split('.').length === 3;
}

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

function payloadExp(credential: string): number | null {
  try {
    const payload = credential.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function writeGoogleSession(user: GoogleUser, credential: string) {
  writeGoogleUser(user);
  localStorage.setItem(TOKEN_KEY, credential);
  notifyAuth();
}

export function clearAuthToken() {
  if (!localStorage.getItem(TOKEN_KEY)) return;
  localStorage.removeItem(TOKEN_KEY);
  notifyAuth();
}

export function readGoogleToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (!isGoogleIdToken(token)) return token;
  const exp = payloadExp(token);
  if (exp && exp < Date.now() + 30_000) {
    localStorage.removeItem(TOKEN_KEY);
    notifyAuth();
    return null;
  }
  return token;
}

/** Échange un jeton Google (1 h) contre une session Abel (90 jours, renouvelée à l’usage). */
export async function exchangeGoogleSession(credential: string): Promise<boolean> {
  if (!credential || !navigator.onLine) return false;
  try {
    const res = await fetch(`${SYNC_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { token?: string };
    if (!body.token) return false;
    localStorage.setItem(TOKEN_KEY, body.token);
    notifyAuth();
    return true;
  } catch {
    return false;
  }
}

export async function completeGoogleSignIn(user: GoogleUser, credential: string): Promise<void> {
  writeGoogleSession(user, credential);
  await exchangeGoogleSession(credential);
}

/** Si le stockage contient encore un JWT Google, le convertit en session Abel. */
export async function ensureAbelSession(): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || !isGoogleIdToken(token)) return;
  const exp = payloadExp(token);
  if (exp && exp < Date.now() + 30_000) {
    localStorage.removeItem(TOKEN_KEY);
    notifyAuth();
    return;
  }
  await exchangeGoogleSession(token);
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

let gsiInitialized = false;
let gsiCallback: ((user: GoogleUser, credential: string) => void) | null = null;

export async function renderGoogleButton(
  host: HTMLElement,
  onUser: (user: GoogleUser, credential: string) => void,
): Promise<void> {
  if (!GOOGLE_CLIENT_ID) return;
  await loadGis();
  if (!window.google?.accounts.id) return;
  gsiCallback = onUser;
  if (host.dataset.abelGsi === '1' && host.childElementCount > 0) return;
  host.replaceChildren();
  host.dataset.abelGsi = '1';
  if (!gsiInitialized) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        gsiCallback?.(decodeJwt(response.credential), response.credential);
      },
    });
    gsiInitialized = true;
  }
  window.google.accounts.id.renderButton(host, {
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    locale: 'fr',
    width: Math.min(320, host.clientWidth || 280),
  });
}

export function signOutGoogle() {
  const token = localStorage.getItem(TOKEN_KEY);
  writeGoogleUser(null);
  localStorage.removeItem(TOKEN_KEY);
  notifyAuth();
  window.google?.accounts.id.disableAutoSelect();
  if (token && navigator.onLine) {
    void fetch(`${SYNC_URL}/session`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
}
