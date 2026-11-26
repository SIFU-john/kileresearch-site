export interface Integrations {
  newsletter: { configured: true; action: string; origin: string; subscribeUrl: string } | { configured: false };
  contact:
    | { provider: 'pages-function'; action: string; sameOrigin: true }
    | { provider: 'formspree'; action: string; origin: string; sameOrigin: false }
    | { provider: 'none' };
  turnstileSiteKey: string | undefined;
  analyticsToken: string | undefined;
  cspMode: 'enforce' | 'report-only';
}
export function integrations(env?: Record<string, string | undefined>): Integrations;
export const enquiryPaths: string[];
