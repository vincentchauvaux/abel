export const SITE = {
  name: 'Abel',
  appUrl: 'https://abel.be/',
  publisher: 'Vincent Chauvaux',
  publisherType: 'particulier — projet personnel à usage familial',
  contactUrl: 'https://github.com/vincentchauvaux/abel/issues',
  contactLabel: 'dépôt GitHub Abel (onglet Issues)',
  hosts: [
    {
      name: 'OVH SAS',
      role: 'hébergement de l’application et de l’API de synchronisation',
      detail: '2 rue Kellermann, 59100 Roubaix, France',
      url: 'https://www.ovh.com',
    },
  ],
  apiHost: 'abel.be',
  apiUrl: 'https://abel.be/api/',
  legalUpdated: '29 août 2026',
} as const;

export const LEGAL_ROUTES = {
  mentions: '/legal/mentions',
  privacy: '/legal/confidentialite',
  cgu: '/legal/cgu',
  medical: '/legal/medical',
} as const;
