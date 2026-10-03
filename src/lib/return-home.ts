import type { NavigateFunction } from 'react-router-dom';

/** Retour au dashboard après une entrée enregistrée, avec le cadre vert. */
export function returnHome(navigate: NavigateFunction) {
  navigate('/', { state: { savedAt: Date.now() } });
}
