// Cloudflare Web Analytics loader (KILA-43 `security-headers-csp` §3-4). Cookieless beacon,
// loaded by us rather than Cloudflare's edge auto-injection so we can honour Global Privacy
// Control: if the browser sends GPC, nothing is loaded and no request is made.
// The site token comes from this script tag's data-cf-token attribute (public by design).
(function () {
  var me = document.currentScript;
  var token = me && me.getAttribute('data-cf-token');
  if (!token || navigator.globalPrivacyControl === true) return;
  var s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: token }));
  document.head.appendChild(s);
})();
