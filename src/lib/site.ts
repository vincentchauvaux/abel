export const SITE = {
  name: 'Abel',
  appUrl: 'https://vincentchauvaux.github.io/abel/',
  publisher: 'Vincent Chauvaux',
  publisherType: 'particulier — projet personnel à usage familial',
  contactUrl: 'https://github.com/vincentchauvaux/abel/issues',
  contactLabel: 'dépôt GitHub Abel (onglet Issues)',
  hosts: [
    {
      name: 'GitHub, Inc. (GitHub Pages)',
      role: 'hébergement de l’application web',
      detail: '88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis',
      url: 'https://docs.github.com/pages',
    },
    {
      name: 'OVH SAS',
      role: 'hébergement de l’API de synchronisation',
      detail: '2 rue Kellermann, 59100 Roubaix, France',
      url: 'https://www.ovh.com',
    },
  ],
  apiHost: 'vps-e09ed6db.vps.ovh.net',
  apiUrl: 'https://vps-e09ed6db.vps.ovh.net/abel/api/',
  legalUpdated: '30 août 2026',
} as const;

export const LEGAL_ROUTES = {
  mentions: '/legal/mentions',
  privacy: '/legal/confidentialite',
  cgu: '/legal/cgu',
  medical: '/legal/medical',
} as const;
