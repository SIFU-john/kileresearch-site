// Article page enhancements (bundled module, no inline script). Everything here is optional:
// without JS, code and tables are still focusable, scrollable regions and the TOC is plain links.
//  - code/table regions keep their tab stop only when they actually overflow (doc 2 §4, §5)
//  - "Copy" buttons on code blocks; prompts ("$ ") and output lines are not copied
//  - TOC: aria-current follows the reading position; activating a link moves focus to the heading

function syncRegions() {
  document.querySelectorAll<HTMLElement>('[data-scroll-region]').forEach((el) => {
    if (el.scrollWidth > el.clientWidth + 1) {
      el.tabIndex = 0;
      el.setAttribute('role', 'region');
    } else {
      el.removeAttribute('tabindex');
      el.removeAttribute('role');
    }
  });
}
syncRegions();
let raf = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(syncRegions); });

const live = document.createElement('p');
live.className = 'visually-hidden';
live.setAttribute('aria-live', 'polite');
document.body.append(live);

function copyText(pre: HTMLElement, lang: string | undefined) {
  const lines = pre.innerText.replace(/\n$/, '').split('\n');
  const isShell = lang && ['bash', 'sh', 'shell', 'zsh', 'console', 'terminal'].includes(lang);
  if (!isShell || !lines.some((l) => /^\$ /.test(l))) return lines.join('\n');
  // Shell sessions: keep only command lines, without the prompt.
  return lines.filter((l) => /^\$ /.test(l)).map((l) => l.slice(2)).join('\n');
}

if (navigator.clipboard) {
  for (const block of document.querySelectorAll<HTMLElement>('.code-block')) {
    const pre = block.querySelector('pre');
    const head = block.querySelector('.code-head');
    if (!pre || !head) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    const label = head.textContent?.trim();
    btn.setAttribute('aria-label', label ? `Copy code: ${label}` : 'Copy code');
    let timer: ReturnType<typeof setTimeout>;
    btn.addEventListener('click', async () => {
      clearTimeout(timer);
      try {
        await navigator.clipboard.writeText(copyText(pre, block.dataset['lang']));
        btn.textContent = 'Copied';
        btn.dataset['state'] = 'ok';
        live.textContent = 'Code copied to clipboard';
      } catch {
        btn.textContent = "Couldn't copy. Select the code and copy it manually.";
        btn.dataset['state'] = 'error';
        live.textContent = btn.textContent;
      }
      timer = setTimeout(() => { btn.textContent = 'Copy'; delete btn.dataset['state']; live.textContent = ''; }, 2000);
    });
    head.append(btn);
  }
}

// TOC links: move focus to the heading (it has tabindex="-1") and update the hash.
document.querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    history.pushState(null, '', a.hash);
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    target.focus({ preventScroll: true });
    (a.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open');
  });
});

// Current section in the rail.
const rail = document.querySelector<HTMLElement>('[data-toc-rail]');
if (rail && 'IntersectionObserver' in window) {
  const links = new Map([...rail.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const headings = [...links.keys()].map((id) => document.getElementById(id)).filter((h): h is HTMLElement => Boolean(h));
  const visible = new Set<string>();
  const set = (id: string | undefined) => links.forEach((a, key) => (key === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => (en.isIntersecting ? visible.add(en.target.id) : visible.delete(en.target.id)));
      const first = headings.find((h) => visible.has(h.id));
      if (first) set(first.id);
      else {
        const above = headings.filter((h) => h.getBoundingClientRect().top < 0).at(-1);
        set(above?.id);
      }
    },
    { rootMargin: '0px 0px -60% 0px' },
  );
  headings.forEach((h) => io.observe(h));
}

export {};
