export type Horoscope = {
  sign: string;
  signEn: string;
  symbol: string;
  line: string;
  animal: string;
  element: string;
  western: string;
  chinese: string;
};

const WESTERN: {
  sign: string;
  signEn: string;
  symbol: string;
  from: [number, number];
  line: string;
  western: string;
}[] = [
  {
    sign: 'Capricorne',
    signEn: 'capricorn',
    symbol: '♑',
    from: [12, 22],
    line: 'Calme et tenace — une belle constance pour les routines.',
    western:
      'Dans la tradition occidentale, le Capricorne est lié à la constance et au besoin de cadre. On imagine souvent un bébé rassuré par des horaires stables, la chaleur et le calme — une lecture d’humeur, pas un diagnostic.',
  },
  {
    sign: 'Verseau',
    signEn: 'aquarius',
    symbol: '♒',
    from: [1, 20],
    line: 'Curieux et lumineux — toujours un peu en avance sur l’heure.',
    western:
      'Le Verseau, côté occidental, évoque la curiosité et l’air. On associe parfois ce signe à un bébé qui s’éveille par le regard, la lumière et le changement de pièce — pour le plaisir du récit, sans avis médical.',
  },
  {
    sign: 'Poissons',
    signEn: 'pisces',
    symbol: '♓',
    from: [2, 19],
    line: 'Doux et rêveur — les câlins passent avant tout.',
    western:
      'Les Poissons sont liés à l’eau et à la douceur. La tradition parle d’un petit très sensible à l’ambiance, aux bras et au bercement. Ce n’est pas une indication de santé, seulement une image du jour.',
  },
  {
    sign: 'Bélier',
    signEn: 'aries',
    symbol: '♈',
    from: [3, 21],
    line: 'Tonique et décidé — les tétées n’attendent pas.',
    western:
      'Le Bélier, feu du printemps, est décrit comme vif et impatient. On raconte un bébé qui passe vite du sommeil à l’appétit. Une métaphore de tempérament, pas une consigne de soins.',
  },
  {
    sign: 'Taureau',
    signEn: 'taurus',
    symbol: '♉',
    from: [4, 20],
    line: 'Gourmand et posé — le confort avant l’exploit.',
    western:
      'Le Taureau aime le confort, le lait et le nid. La lecture occidentale insiste sur la lenteur et le plaisir des repas. Abel n’en tire aucun conseil médical : c’est une histoire de signe.',
  },
  {
    sign: 'Gémeaux',
    signEn: 'gemini',
    symbol: '♊',
    from: [5, 21],
    line: 'Vif et bavard — deux bras, deux conversations.',
    western:
      'Les Gémeaux sont associés à l’air, à la parole et au mouvement. On imagine un bébé qui s’anime aux voix et aux visages. Divertissement astrologique uniquement.',
  },
  {
    sign: 'Cancer',
    signEn: 'cancer',
    symbol: '♋',
    from: [6, 21],
    line: 'Câlin et intuitif — le nid avant le monde.',
    western:
      'Le Cancer, signe d’eau, parle de cocon, de nuit et de peau contre peau. La tradition occidentale y voit un besoin de continuité avec maman. Ce n’est pas un avis de pédiatre.',
  },
  {
    sign: 'Lion',
    signEn: 'leo',
    symbol: '♌',
    from: [7, 23],
    line: 'Rayonnant — une présence qui réchauffe la pièce.',
    western:
      'Le Lion est soleil : chaleur, éclat, besoin d’être vu. On décrit un bébé qui s’épanouit dans la lumière du jour et les sourires. Lecture festive, sans prescription.',
  },
  {
    sign: 'Vierge',
    signEn: 'virgo',
    symbol: '♍',
    from: [8, 23],
    line: 'Attentif au détail — chaque heure a sa place.',
    western:
      'La Vierge aime l’ordre et les petits gestes répétés. La tradition parle de routines nettes, de ventre apaisé par le calme. Métaphore seulement, pas un protocole de soins.',
  },
  {
    sign: 'Balance',
    signEn: 'libra',
    symbol: '♎',
    from: [9, 23],
    line: 'Harmonieux — gauche et droit, à tour de rôle.',
    western:
      'La Balance cherche l’équilibre : gauche et droit, jour et nuit, bras et berceau. On y lit un goût pour l’harmonie des rythmes. Ce n’est pas une recommandation médicale.',
  },
  {
    sign: 'Scorpion',
    signEn: 'scorpio',
    symbol: '♏',
    from: [10, 23],
    line: 'Intense et loyal — une sieste, ou rien.',
    western:
      'Le Scorpion est décrit comme intense : soit profondément endormi, soit très présent. Une image de contrastes, pas une lecture clinique.',
  },
  {
    sign: 'Sagittaire',
    signEn: 'sagittarius',
    symbol: '♐',
    from: [11, 22],
    line: 'Aventurier — déjà tourné vers le prochain repas.',
    western:
      'Le Sagittaire évoque le mouvement et l’appétit de dehors. On imagine un bébé qui s’éveille vers la lumière et les sorties. Tradition occidentale ludique, sans conseil de santé.',
  },
];

const ANIMALS = [
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

const STEM_ELEMENT = ['Bois', 'Bois', 'Feu', 'Feu', 'Terre', 'Terre', 'Métal', 'Métal', 'Eau', 'Eau'];

const CHINESE_BY_ELEMENT: Record<string, string> = {
  Bois:
    'Dans la médecine traditionnelle chinoise, le Bois évoque le printemps, le mouvement et la croissance. On parle d’un petit en élan, qui aime l’air et le rythme — une image des cinq éléments, pas un traitement.',
  Feu:
    'Le Feu, en MTC, est lié à la chaleur, à l’été et au cœur au sens symbolique. La tradition décrit un bébé lumineux, parfois plus éveillé le soir. Lecture culturelle uniquement, sans posologie.',
  Terre:
    'La Terre parle de centre, de digestion au sens large et de stabilité. On imagine un bébé rassuré par les repas réguliers et le portage. Ce n’est pas un avis de médecin, c’est un récit d’élément.',
  Métal:
    'Le Métal, automne, évoque le souffle, la peau et le besoin d’un cadre clair. La tradition chinoise y voit un petit qui aime l’ordre et l’air pur. Divertissement, pas une ordonnance.',
  Eau:
    'L’Eau, hiver, est liée au repos, aux reins au sens symbolique et à la profondeur du sommeil. On raconte un bébé qui se ressource dans le calme et la nuit. Aucun conseil médical ici.',
};

function pickWestern(bornOn: string) {
  const birth = new Date(`${bornOn}T12:00:00`);
  const md = (birth.getMonth() + 1) * 100 + birth.getDate();
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
  return chosen;
}

export function horoscopeFor(bornOn: string): Horoscope {
  const birth = new Date(`${bornOn}T12:00:00`);
  const year = birth.getFullYear();
  const chosen = pickWestern(bornOn);
  const animal = ANIMALS[((year - 4) % 12 + 12) % 12];
  const element = STEM_ELEMENT[((year - 4) % 10 + 10) % 10];
  return {
    sign: chosen.sign,
    signEn: chosen.signEn,
    symbol: chosen.symbol,
    line: chosen.line,
    animal,
    element,
    western: chosen.western,
    chinese: `${animal} · élément ${element}. ${CHINESE_BY_ELEMENT[element]}`,
  };
}

export const HOROSCOPE_DISCLAIMER =
  'Horoscope et lectures traditionnelles : pour le plaisir. Abel ne donne aucun avis médical, ni occidental ni chinois.';
