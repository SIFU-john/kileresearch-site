// Small, dependency-free rehype plugin for article HTML (KILA-42 doc 2):
//  - code blocks: .code-block wrapper with a header bar (filename/language, "TERMINAL" for
//    shell); <pre> is a labelled, focusable region (JS drops the tab stop if it doesn't overflow)
//  - tables: scrollable, focusable region wrapper (same overflow rule)
//  - h2/h3: a "#" self-link placed after the heading, with an accessible name
//  - callouts: "> **Note:** ..." blockquotes and GitHub "> [!TIP]" become labelled notes
//  - an image alone in a paragraph becomes a <figure>; its Markdown title becomes the caption
//  - links between articles (02-tokens-explained.md) become site URLs; other repo-relative
//    links (../scripts/x.py) point at the public code repo

const CODE_REPO = 'https://github.com/SIFU-john/KileResearch/blob/main/';
const SHELL = new Set(['bash', 'sh', 'shell', 'zsh', 'console', 'terminal', 'powershell', 'ps1', 'cmd']);

function rewriteHref(href) {
  if (typeof href !== 'string' || /^([a-z]+:|\/|#)/i.test(href)) return href;
  const [pathPart, hash = ''] = href.split('#');
  const article = /^(?:\.\/|\.\.\/articles\/)?([^/]+)\.mdx?$/.exec(pathPart);
  if (article) return `/research/${article[1]}/${hash ? `#${hash}` : ''}`;
  return CODE_REPO + pathPart.replace(/^(\.\.\/)+/, '') + (hash ? `#${hash}` : '');
}

const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });
const textOf = (n) => (n.type === 'text' ? n.value : (n.children ?? []).map(textOf).join(''));

function langOf(node) {
  const code = node.children?.find((c) => c.tagName === 'code') ?? node;
  const cls = [].concat(code.properties?.className ?? [], node.properties?.className ?? []);
  const lang = cls.map(String).find((c) => c.startsWith('language-'))?.slice(9);
  return lang && lang !== 'plaintext' && lang !== 'text' ? lang : null;
}

const ICONS = {
  note: 'M12 8h.01M11 12h1v4h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  tip: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5V16h8v-2.5A6 6 0 0 0 12 3Z',
  warn: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  danger: 'M12 8v4M12 16h.01M8.6 2h6.8L22 8.6v6.8L15.4 22H8.6L2 15.4V8.6Z',
};
const LABELS = { note: 'Note', tip: 'Tip', warn: 'Warning', danger: 'Caution' };
function calloutKind(lead) {
  const l = lead.toLowerCase().replace(/[:?!.]\s*$/, '').trim();
  if (/^\[!(note|important)\]$/.test(l)) return 'note';
  if (l === '[!tip]') return 'tip';
  if (l === '[!warning]') return 'warn';
  if (l === '[!caution]') return 'danger';
  if (/^(caution|danger|security)/.test(l)) return 'danger';
  if (/^(warning|heads-up|heads up|watch out|gotcha)/.test(l)) return 'warn';
  if (/^(tip|stuck|rule of thumb|shortcut|try)/.test(l)) return 'tip';
  if (/^(note|honest caveat|why|context|aside)/.test(l)) return 'note';
  return null;
}

let calloutId = 0;
function toCallout(node) {
  const first = node.children?.find((c) => c.type === 'element');
  if (!first || first.tagName !== 'p') return null;
  const lead = first.children?.find((c) => !(c.type === 'text' && !c.value.trim()));
  let kind = null;
  if (lead?.type === 'element' && lead.tagName === 'strong') kind = calloutKind(textOf(lead));
  else if (lead?.type === 'text') {
    const m = /^\s*(\[![A-Z]+\])\s*/.exec(lead.value);
    if (m) {
      kind = calloutKind(m[1]);
      if (kind) lead.value = lead.value.slice(m[0].length);
    }
  }
  if (!kind) return null;
  const id = `callout-${++calloutId}`;
  const icon = el('svg', { viewBox: '0 0 24 24', ariaHidden: 'true', focusable: 'false', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }, [el('path', { d: ICONS[kind] })]);
  return el('div', { className: ['callout', `callout--${kind}`], role: 'note', ariaLabelledby: id }, [
    el('p', { className: ['callout__label'], id }, [icon, text(LABELS[kind])]),
    ...node.children,
  ]);
}

function walk(parent) {
  if (!parent.children) return;
  parent.children = parent.children.map((node) => {
    if (node.type !== 'element') return node;
    walk(node);
    if (node.tagName === 'a' && node.properties) node.properties.href = rewriteHref(node.properties.href);
    if (node.tagName === 'table') {
      return el('div', { className: ['table-wrap', 'wide'], role: 'region', tabIndex: 0, ariaLabel: 'Table', dataScrollRegion: '' }, [node]);
    }
    if (node.tagName === 'pre') {
      const lang = langOf(node);
      const label = node.properties?.dataTitle ?? (lang && SHELL.has(lang) ? 'Terminal' : lang) ?? 'Code';
      node.properties = { ...node.properties, tabIndex: 0, role: 'region', ariaLabel: `Code: ${label}`, dataScrollRegion: '' };
      const head = el('div', { className: ['code-head'] }, [el('span', { className: ['code-label'] }, [text(label)])]);
      return el('div', { className: ['code-block'], dataLang: lang ?? undefined }, [head, node]);
    }
    if (node.tagName === 'blockquote') return toCallout(node) ?? node;
    if (node.tagName === 'p') {
      const kids = node.children.filter((c) => !(c.type === 'text' && !c.value.trim()));
      if (kids.length === 1 && kids[0].tagName === 'img') {
        const img = kids[0];
        img.properties = { loading: 'lazy', decoding: 'async', ...img.properties };
        const caption = img.properties.title;
        delete img.properties.title;
        return el('figure', {}, caption ? [img, el('figcaption', {}, [text(caption)])] : [img]);
      }
    }
    if ((node.tagName === 'h2' || node.tagName === 'h3') && node.properties?.id) {
      node.properties.tabIndex = -1;
      const anchor = el('a', { className: ['heading-anchor'], href: `#${node.properties.id}`, ariaLabel: `Link to section: ${textOf(node).trim()}` }, [text('#')]);
      return el('div', { className: ['heading-wrap'] }, [node, anchor]);
    }
    return node;
  });
}

export default function rehypeArticle() {
  return (tree) => {
    calloutId = 0;
    walk(tree);
  };
}
