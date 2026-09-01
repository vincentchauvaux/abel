type SafariNavigator = Navigator & { standalone?: boolean };

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as SafariNavigator;
  return window.matchMedia('(display-mode: standalone)').matches || Boolean(nav.standalone);
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/** Aide iOS uniquement : pas de bouton d’install factice. */
export function shouldShowIosInstallHint(): boolean {
  return isIosDevice() && !isStandaloneDisplay();
}

/** Enregistre le SW en prod. Ne force pas skipWaiting (évite de recharger pendant une tétée). */
export function registerPwa() {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;
  const swUrl = `${import.meta.env.BASE_URL}sw.js`;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(swUrl, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: 'none',
    });
  });
}
