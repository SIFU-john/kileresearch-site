// Browser-side form handling. Loaded as a bundled module (no inline script).
import { adapters, noneAdapter } from './adapters';
import type { FormKind } from './types';

function fieldsOf(form: HTMLFormElement) {
  const out: Record<string, string> = {};
  new FormData(form).forEach((v, k) => {
    if (typeof v === 'string') out[k] = v.trim();
  });
  return out;
}

function showError(form: HTMLFormElement, input: HTMLInputElement | HTMLTextAreaElement) {
  const err = form.querySelector<HTMLElement>(`#${input.id}-error`);
  input.setAttribute('aria-invalid', 'true');
  if (err) {
    err.textContent = input.validationMessage;
    err.hidden = false;
  }
}

function clearErrors(form: HTMLFormElement) {
  form.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
  form.querySelectorAll<HTMLElement>('.field-error').forEach((n) => {
    n.hidden = true;
    n.textContent = '';
  });
}

function setStatus(form: HTMLFormElement, kind: 'success' | 'fallback' | 'error') {
  form.querySelectorAll<HTMLElement>('[data-status]').forEach((n) => {
    n.hidden = n.dataset['status'] !== kind;
  });
  const shown = form.querySelector<HTMLElement>(`[data-status="${kind}"]`);
  shown?.focus();
}

function buildMailto(form: HTMLFormElement, data: Record<string, string>) {
  const to = form.dataset['mailto'] ?? '';
  const subject = form.dataset['mailtoSubject'] ?? 'Enquiry';
  const body = Object.entries(data)
    .filter(([k]) => k !== 'company_website')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

for (const form of document.querySelectorAll<HTMLFormElement>('form[data-form-kind]')) {
  form.noValidate = true;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    const invalid = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')].filter((i) => !i.checkValidity());
    if (invalid.length) {
      invalid.forEach((i) => showError(form, i));
      invalid[0]?.focus();
      return;
    }
    const data = fieldsOf(form);
    // Honeypot: real people never fill the hidden field. Pretend success for bots.
    if (data['company_website']) return setStatus(form, 'success');

    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    button?.setAttribute('aria-disabled', 'true');
    const adapter = adapters[form.dataset['provider'] ?? 'none'] ?? noneAdapter;
    const result = await adapter.submit(form.dataset['endpoint'], form.dataset['formKind'] as FormKind, data);
    button?.removeAttribute('aria-disabled');

    if (result.ok) {
      form.reset();
      setStatus(form, 'success');
      return;
    }
    const link = form.querySelector<HTMLAnchorElement>('[data-mailto-link]');
    if (link) link.href = buildMailto(form, data);
    setStatus(form, result.reason === 'not-configured' ? 'fallback' : 'error');
  });
}
