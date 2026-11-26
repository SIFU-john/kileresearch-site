// Provider-agnostic forms contract. Pages and components only talk to this interface,
// so swapping providers (Formspree, Basin, Buttondown, our own Lambda...) means adding
// one adapter file and changing env vars, with no page changes.

export type FormKind = 'contact' | 'newsletter';

export type SubmitResult =
  | { ok: true }
  | { ok: false; reason: 'not-configured' | 'network' | 'rejected'; message?: string };

export interface FormAdapter {
  /** Matches PUBLIC_FORMS_PROVIDER. */
  readonly id: string;
  submit(endpoint: string | undefined, kind: FormKind, data: Record<string, string>): Promise<SubmitResult>;
}
