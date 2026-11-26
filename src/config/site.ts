// Site-wide settings. Values read from PUBLIC_* env vars can be changed per environment
// without code changes (see .env.example).
const env = import.meta.env;

export const site = {
  name: 'Kile Research',
  tagline: 'Reproducible, hands-on research on how AI models actually run.',
  description:
    'Kile Research publishes reproducible, beginner-to-intermediate guides to AI and LLM inference, and helps small and mid-sized businesses put AI to work safely.',
  locale: 'en-GB',
  /** Public repo that holds the runnable code for every article. */
  codeRepo: 'https://github.com/SIFU-john/KileResearch',
  codeRepoBranch: 'main',
  /** STUB: placeholder address until the Board confirms a domain and mailbox. */
  contactEmail: env.PUBLIC_CONTACT_EMAIL || 'hello@example.com',
  nav: [
    { href: '/research/', label: 'Research' },
    { href: '/consulting/', label: 'Consulting' },
    { href: '/about/', label: 'About' },
    { href: '/contact/', label: 'Contact' },
  ],
} as const;

export function repoUrl(repoPath: string) {
  return `${site.codeRepo}/tree/${site.codeRepoBranch}/${repoPath.replace(/^\/+/, '')}`;
}
