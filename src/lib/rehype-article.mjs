// Small, dependency-free rehype plugin for article HTML:
//  - wraps <table> in a scrollable, focusable region
//  - wraps <pre> in .code-block with a language label (the copy button is added by JS)
//  - makes code blocks keyboard-scrollable (tabindex=0)
//  - adds a "#" self-link to h2/h3 for deep linking
//  - rewrites GitHub-style relative links between articles (02-tokens-explained.md)
//    to site URLs, and other repo-relative links (../scripts/x.py) to the code repo

const CODE_REPO = 'https://github.com/SIFU-john/KileResearch/blob/main/';

function rewriteHref(href) {
  if (typeof href !== 'string' || /^([a-z]+:|\/|#)/i.test(href)) return href;
  const [pathPart, hash = ''] = href.split('#');
  const article = /^(?:\.\/|\.\.\/articles\/)?([^/]+)\.mdx?$/.exec(pathPart);
  if (article) return `/research/${article[1]}/${hash ? `#${hash}` : ''}`;
  return CODE_REPO + pathPart.replace(/^(\.\.\/)+/, '') + (hash ? `#${hash}` : '');
}

const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });

function langOf(node) {
  const cls = [].concat(node.properties?.className ?? []);
  const lang = cls.map(String).find((c) => c.startsWith('language-'))?.slice(9);
  return lang && lang !== 'plaintext' && lang !== 'text' ? lang : null;
}

function walk(parent) {
  if (!parent.children) return;
  parent.children = parent.children.map((node) => {
    if (node.type !== 'element') return node;
    walk(node);
    if (node.tagName === 'a' && node.properties) node.properties.href = rewriteHref(node.properties.href);
    if (node.tagName === 'table') {
      return el('div', { className: ['table-wrap'], role: 'region', tabIndex: 0, ariaLabel: 'Table (scrolls horizontally)' }, [node]);
    }
    if (node.tagName === 'pre') {
      node.properties = { ...node.properties, tabIndex: 0 };
      const lang = langOf(node);
      const kids = lang ? [el('span', { className: ['code-lang'], ariaHidden: 'true' }, [{ type: 'text', value: lang }]), node] : [node];
      return el('div', { className: ['code-block'], dataLang: lang ?? undefined }, kids);
    }
    if ((node.tagName === 'h2' || node.tagName === 'h3') && node.properties?.id) {
      node.children.push(
        el('a', { className: ['heading-anchor'], href: `#${node.properties.id}`, ariaHidden: 'true', tabIndex: -1 }, [{ type: 'text', value: '#' }]),
      );
    }
    return node;
  });
}

export default function rehypeArticle() {
  return (tree) => walk(tree);
}
