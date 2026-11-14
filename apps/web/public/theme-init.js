/*
 * Daily: aplica o tema antes da primeira pintura (sem flash). Arquivo externo, síncrono, no <head>:
 * a CSP não permite script inline. Mesma lógica de src/lib/theme/theme.ts (o teste
 * theme.test.ts confere que os dois concordam).
 */
/* global localStorage, window, document */
(function () {
  var KEY = 'daily:theme';
  var DATA = ['daily:v5', 'daily:v4', 'daily:v3', 'daily:v2', 'daily:v1'];
  var COLOR = { dark: '#131313', light: '#f4f4f6' };
  var choice = null;
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'sistema' || saved === 'claro' || saved === 'escuro') choice = saved;
    if (!choice) {
      choice = 'sistema';
      for (var i = 0; i < DATA.length; i += 1) {
        if (localStorage.getItem(DATA[i]) !== null) choice = 'escuro';
      }
      localStorage.setItem(KEY, choice);
    }
  } catch {
    choice = choice || 'sistema';
  }
  var dark = true;
  try {
    dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    /* sem matchMedia: escuro */
  }
  var theme = choice === 'claro' ? 'light' : choice === 'escuro' ? 'dark' : dark ? 'dark' : 'light';
  var root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
  var metas = document.querySelectorAll('meta[name="theme-color"]');
  for (var j = 0; j < metas.length; j += 1) {
    var own = metas[j].media.indexOf('dark') >= 0 ? 'dark' : 'light';
    metas[j].content = COLOR[choice === 'sistema' ? own : theme];
  }
})();
