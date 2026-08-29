export type Horoscope = {
  sign: string;
  symbol: string;
  line: string;
  chinese: string;
};

const WESTERN: { sign: string; symbol: string; from: [number, number]; line: string }[] = [
  { sign: 'Capricorne', symbol: '♑', from: [12, 22], line: 'Calme et tenace — une belle constance pour les routines.' },
  { sign: 'Verseau', symbol: '♒', from: [1, 20], line: 'Curieux et lumineux — toujours un peu en avance sur l’heure.' },
  { sign: 'Poissons', symbol: '♓', from: [2, 19], line: 'Doux et rêveur — les câlins passent avant tout.' },
  { sign: 'Bélier', symbol: '♈', from: [3, 21], line: 'Tonique et décidé — les tétées n’attendent pas.' },
  { sign: 'Taureau', symbol: '♉', from: [4, 20], line: 'Gourmand et posé — le confort avant l’exploit.' },
  { sign: 'Gémeaux', symbol: '♊', from: [5, 21], line: 'Vif et bavard — deux bras, deux conversations.' },
  { sign: 'Cancer', symbol: '♋', from: [6, 21], line: 'Câlin et intuitif — le nid avant le monde.' },
  { sign: 'Lion', symbol: '♌', from: [7, 23], line: 'Rayonnant — une présence qui réchauffe la pièce.' },
  { sign: 'Vierge', symbol: '♍', from: [8, 23], line: 'Attentif au détail — chaque heure a sa place.' },
  { sign: 'Balance', symbol: '♎', from: [9, 23], line: 'Harmonieux — gauche et droit, à tour de rôle.' },
  { sign: 'Scorpion', symbol: '♏', from: [10, 23], line: 'Intense et loyal — une sieste, ou rien.' },
  { sign: 'Sagittaire', symbol: '♐', from: [11, 22], line: 'Aventurier — déjà tourné vers le prochain repas.' },
];

const CHINESE = [
  'Rat',
  'Bœuf',
  'Tigre',
  'Lapin',
  'Dragon',
  'Serpent',
  'Cheval',
  'Chèvre',
  'Singe',
  'Coq',
  'Chien',
  'Cochon',
];

export function horoscopeFor(bornOn: string): Horoscope {
  const birth = new Date(`${bornOn}T12:00:00`);
  const month = birth.getMonth() + 1;
  const day = birth.getDate();
  const md = month * 100 + day;
  let chosen = WESTERN[0];
  for (let i = 0; i < WESTERN.length; i++) {
    const next = WESTERN[(i + 1) % WESTERN.length];
    const start = WESTERN[i].from[0] * 100 + WESTERN[i].from[1];
    const end = next.from[0] * 100 + next.from[1];
    if (start < end) {
      if (md >= start && md < end) {
        chosen = WESTERN[i];
        break;
      }
    } else if (md >= start || md < end) {
      chosen = WESTERN[i];
      break;
    }
  }
  const chinese = CHINESE[((birth.getFullYear() - 4) % 12 + 12) % 12];
  return {
    sign: chosen.sign,
    symbol: chosen.symbol,
    line: chosen.line,
    chinese,
  };
}
