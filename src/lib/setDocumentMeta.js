export function setDocumentMeta({ title, description, themeColor, imageUrl, url }) {
  if (title) document.title = title;

  function upsert(selector, attrPairs) {
    let el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      Object.entries(attrPairs.match).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
    }
    el.setAttribute('content', attrPairs.content);
  }

  if (themeColor) upsert('meta[name="theme-color"]', { match: { name: 'theme-color' }, content: themeColor });
  if (description) upsert('meta[name="description"]', { match: { name: 'description' }, content: description });

  // Open Graph
  const og = [
    ['og:title', title],
    ['og:description', description],
    ['og:image', imageUrl],
    ['og:type', 'website'],
    ['og:url', url]
  ];
  og.forEach(([prop, val]) => {
    if (!val) return;
    upsert(`meta[property="${prop}"]`, { match: { property: prop }, content: val });
  });

  // Twitter
  const tw = [
    ['twitter:card', imageUrl ? 'summary_large_image' : 'summary'],
    ['twitter:title', title],
    ['twitter:description', description],
    ['twitter:image', imageUrl]
  ];
  tw.forEach(([name, val]) => {
    if (!val) return;
    upsert(`meta[name="${name}"]`, { match: { name }, content: val });
  });
}

export function resetDocumentMeta() {
  document.title = 'QRious — Digital Menu';
  const themeMeta = document.head.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', '#FF5722');
  // Leave OG/Twitter tags in place — they only apply when tenants share their menu URL.
}

// Caveat:
// Because the app is a client-side SPA, most social crawlers (Facebook, Twitter) do NOT
// execute JavaScript and will see the static meta from index.html. Full social-preview
// support requires SSR/prerender (Vite plugin, Cloudflare Worker, or moving to a framework
// with SSR). This runtime meta injection still helps: (a) browser tab titles, (b) theme-color
// for mobile status bars, (c) the small subset of scrapers that do run JS (LinkedIn, Slack
// unfurl bot), (d) sharing from inside the app via Web Share API's title/text params which
// read from document.title.
