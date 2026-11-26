// Build-time forms configuration, rendered into data-* attributes on each <form>.
import type { FormKind } from './types';

const env = import.meta.env;

export function formConfig(kind: FormKind) {
  const provider = (env.PUBLIC_FORMS_PROVIDER as string | undefined) || 'none';
  const endpoint = (kind === 'contact' ? env.PUBLIC_CONTACT_ENDPOINT : env.PUBLIC_NEWSLETTER_ENDPOINT) as string | undefined;
  return { provider, endpoint: endpoint || undefined, configured: provider !== 'none' && Boolean(endpoint) };
}
