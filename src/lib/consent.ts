const CONSENT_KEY = 'abel-consent-v1';

export function hasLegalConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === '1';
  } catch {
    return false;
  }
}

export function acceptLegalConsent() {
  localStorage.setItem(CONSENT_KEY, '1');
}

export function clearLegalConsent() {
  localStorage.removeItem(CONSENT_KEY);
}
