/** Affichage uniquement — pas un avis médical. */
export type TemperatureLevel = 'ok' | 'warn' | 'alert';

export function temperatureLevel(celsius: number): TemperatureLevel {
  if (celsius < 36 || celsius >= 38) return 'alert';
  if (celsius < 36.5 || celsius >= 37.5) return 'warn';
  return 'ok';
}

export function formatTemperature(celsius: number): string {
  return String(celsius).replace('.', ',');
}

export function temperatureLevelClass(celsius: number): string {
  return `temp-value temp-${temperatureLevel(celsius)}`;
}
