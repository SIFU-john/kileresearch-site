// Progressive enhancement for the enquiry form (bundled module, no inline script).
// Without JS the form still posts to /api/contact and the browser follows the 303.
//  - pre-selects the service from ?service={id} (only known option values)
//  - inline validation with an error summary that receives focus (KILA-32 pattern)
//  - same-origin posts are sent with fetch; the redirect target decides the message shown

declare global {
  interface Window { turnstile?: { reset: (el?: Element) => void } }
}

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function message(field: Field) {
  const label = field.labels?.[0]?.childNodes[0]?.textContent?.trim() ?? field.name;
  if (field.validity.valueMissing) return `Enter your ${label.toLowerCase()}`;
  if (field.validity.typeMismatch) return 'Enter an email address in the right format, like name@example.com';
  if (field.validity.tooLong) return `${label} must be ${field.getAttribute('maxlength')} characters or fewer`;
  return field.validationMessage;
}

function buildMailto(base: string, data: FormData) {
  const lines = ['name', 'email', 'company', 'service', 'message']
    .map((k) => [k, String(data.get(k) ?? '').trim()])
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  return `${base}&body=${encodeURIComponent(lines.join('\n'))}`;
}

for (const root of document.querySelectorAll<HTMLElement>('[data-enquiry]')) {
  const form = root.querySelector('form');
  if (!form) continue;
  const summary = root.querySelector<HTMLElement>('.error-summary');
  const list = root.querySelector<HTMLUListElement>('[data-summary-list]');

  const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
  const wanted = new URLSearchParams(location.search).get('service');
  if (select && wanted && [...select.options].some((o) => o.value === wanted)) select.value = wanted;

  form.noValidate = true;
  const show = (status: 'success' | 'unavailable' | 'error', data?: FormData) => {
    root.querySelectorAll<HTMLElement>('[data-status]').forEach((n) => (n.hidden = n.dataset['status'] !== status));
    const box = root.querySelector<HTMLElement>(`[data-status="${status}"]`);
    if (data) box?.querySelectorAll<HTMLAnchorElement>('[data-mailto-link]').forEach((a) => (a.href = buildMailto(a.href.split('&body=')[0]!, data)));
    if (status === 'success') form.hidden = true;
    box?.focus();
  };

  form.addEventListener('submit', async (event) => {
    const fields = [...form.querySelectorAll<Field>('input:not([type=hidden]):not([tabindex="-1"]), textarea, select')];
    fields.forEach((f) => {
      f.removeAttribute('aria-invalid');
      const err = form.querySelector<HTMLElement>(`#${f.id}-error`);
      if (err) { err.hidden = true; err.textContent = ''; }
    });
    const invalid = fields.filter((f) => !f.checkValidity());
    if (invalid.length) {
      event.preventDefault();
      list?.replaceChildren(
        ...invalid.map((f) => {
          const err = form.querySelector<HTMLElement>(`#${f.id}-error`);
          const text = message(f);
          f.setAttribute('aria-invalid', 'true');
          if (err) { err.textContent = text; err.hidden = false; }
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = `#${f.id}`;
          a.textContent = text;
          a.addEventListener('click', (e) => { e.preventDefault(); f.focus(); });
          li.append(a);
          return li;
        }),
      );
      if (summary) { summary.hidden = false; summary.focus(); }
      return;
    }
    if (summary) summary.hidden = true;
    if (!form.hasAttribute('data-enhance')) return; // cross-origin provider: let the browser post

    event.preventDefault();
    const data = new FormData(form);
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    button?.setAttribute('aria-disabled', 'true');
    try {
      const body = new URLSearchParams();
      data.forEach((v, k) => { if (typeof v === 'string') body.append(k, v); });
      const res = await fetch(form.action, { method: 'POST', body, credentials: 'same-origin', redirect: 'follow' });
      const where = new URL(res.url, location.href).pathname;
      if (where.startsWith('/contact/thanks')) { form.reset(); show('success'); }
      else if (where.startsWith('/contact/unavailable')) show('unavailable', data);
      else show('error', data);
    } catch {
      show('error', data);
    } finally {
      button?.removeAttribute('aria-disabled');
      window.turnstile?.reset();
    }
  });
}

export {};
