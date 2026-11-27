export interface Author {
  name: string;
  role: string;
  bio: string;
  links: { label: string; href: string }[];
}

// House style: every article is credited to Kile Research, with no individual names.
// Copy: KILA-44 site-copy v1 (no individuals, no credentials).
export const authors = {
  'kile-research': {
    name: 'Kile Research',
    role: 'Research publication',
    bio: 'Kile Research writes reproducible, plain-language guides to AI and LLM inference. Every article is credited to Kile Research.',
    links: [
      { label: 'GitHub', href: 'https://github.com/SIFU-john/KileResearch' },
      { label: 'About us', href: '/about/' },
    ],
  },
} satisfies Record<string, Author>;
