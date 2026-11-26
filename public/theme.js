// Theme preference (KILA-42 doc 2 §14). Loaded with <script src> in <head>, so the stored
// choice is applied before first paint (no flash). Reads localStorage on load; writes ONLY
// when the user clicks the toggle; "Use system theme" removes the key. No cookies.
(function () {
  var KEY = 'kr-theme';
  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* storage blocked: follow the OS */ }
  if (stored === 'dark' || stored === 'light') root.setAttribute('data-theme', stored);

  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function sync() {
    var dark = isDark();
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(dark));
    });
    document.querySelectorAll('[data-theme-reset]').forEach(function (b) {
      b.hidden = !root.hasAttribute('data-theme');
    });
  }
  function save(value) {
    try { value ? localStorage.setItem(KEY, value) : localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.hidden = false;
      b.addEventListener('click', function () {
        var next = isDark() ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        save(next);
        sync();
      });
    });
    document.querySelectorAll('[data-theme-reset]').forEach(function (b) {
      b.addEventListener('click', function () {
        root.removeAttribute('data-theme');
        save(null);
        sync();
      });
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sync);
    sync();
  });
})();
