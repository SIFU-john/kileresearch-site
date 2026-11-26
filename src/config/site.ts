// Site-wide settings. Values read from PUBLIC_* env vars change per environment without
// code changes (see .env.example). The canonical origin is NOT here: it is the Astro `site`
// setting (astro.config.mjs, from SITE_URL), the one source for canonical, OG, RSS, sitemap
// and JSON-LD URLs. Use Astro.site / new URL(path, Astro.site) to build absolute URLs.
const env = import.meta.env;

export const site = {
  name: 'Kile Research',
  tagline: 'Practical, reproducible research on how AI models run.',
  description:
    'Kile Research publishes plain-language, reproducible write-ups on AI and LLM inference, with code you can run, and helps small businesses put AI to work safely.',
  locale: 'en-GB',
  /** Public repo that holds the runnable code for every article. */
  codeRepo: 'https://github.com/SIFU-john/KileResearch',
  codeRepoBranch: 'main',
  /** STUB: role inbox for the mailto fallback. Works only once email is set up on the domain (KILA-43). */
  contactEmail: (env.PUBLIC_CONTACT_EMAIL as string | undefined) || 'hello@kileresearch.ai',
  /** STUB: newsletter cadence for the sign-up microcopy, to be confirmed by the account owner. */
  newsletterCadence: '[week/month]',
  /** STUB: reply time promised on the enquiry form ("We reply within {n} working days"). */
  replyDays: '[n]',
  /** Optional: Medium profile, shown as "Also on Medium" in the footer. */
  mediumProfile: (env.PUBLIC_MEDIUM_PROFILE as string | undefined) || undefined,
  nav: [
    { href: '/research/', label: 'Research' },
    { href: '/consulting/', label: 'Consulting' },
    { href: '/about/', label: 'About' },
  ],
} as const;

/** Host name for display (always lowercase, no protocol, no www), e.g. "kileresearch.ai". */
export const displayDomain = (siteUrl: URL | undefined) => (siteUrl?.hostname ?? 'kileresearch.ai').replace(/^www\./, '').toLowerCase();

export function repoUrl(repoPath: string) {
  return `${site.codeRepo}/tree/${site.codeRepoBranch}/${repoPath.replace(/^\/+/, '')}`;
}

/**
 * Content flags for claims that need a business decision before they appear (KILA-42 page-layouts §C5).
 * Flip to true only when the CEO confirms on the task, and the wording matches our actual terms.
 */
export const contentFlags = {
  /** "Your data stays yours…" — needs CEO confirmation that this is our standard contract term. */
  dataStaysYours: false,
  /** "Fixed-scope projects or month-to-month…" — CEO's call; must match our actual terms. */
  flexibleTerms: false,
} as const;
