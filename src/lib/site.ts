export const SITE = {
  name: 'Mimom',
  appUrl: 'https://mimom.be/',
  publisher: 'Vincent Chauvaux',
  publisherType: 'particulier — projet personnel à usage familial',
  contactUrl: 'https://github.com/vincentchauvaux/abel/issues',
  contactLabel: 'dépôt GitHub Abel (onglet Issues)',
  hosts: [
    {
      name: 'OVH SAS',
      role: 'hébergement de l’application web et de l’API',
      detail: '2 rue Kellermann, 59100 Roubaix, France — mimom.be',
      url: 'https://www.ovh.com',
    },
    {
      name: 'GitHub, Inc. (GitHub Pages)',
      role: 'miroir de secours de l’application',
      detail: '88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis',
      url: 'https://docs.github.com/pages',
    },
  ],
  apiHost: 'mimom.be',
  apiUrl: 'https://mimom.be/api/',
  legalUpdated: '1er septembre 2026',
} as const;

export const LEGAL_ROUTES = {
  mentions: '/legal/mentions',
  privacy: '/legal/confidentialite',
  cgu: '/legal/cgu',
  medical: '/legal/medical',
} as const;
