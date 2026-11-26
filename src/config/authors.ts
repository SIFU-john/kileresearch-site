export interface Author {
  name: string;
  role: string;
  bio: string;
  links: { label: string; href: string }[];
}

// House style: every article is credited to Kile Research, with no individual names.
// STUB: bio and links to be confirmed by the author (KILA-42 doc 2 §11: no invented credentials).
export const authors = {
  'kile-research': {
    name: 'Kile Research',
    role: 'Reproducible research on AI inference',
    bio: 'We write hands-on, reproducible guides to how AI models actually run. Every article links to the code we used, so you can check our work and run it yourself.',
    links: [
      { label: 'GitHub', href: 'https://github.com/SIFU-john/KileResearch' },
      { label: 'About us', href: '/about/' },
    ],
  },
} satisfies Record<string, Author>;
