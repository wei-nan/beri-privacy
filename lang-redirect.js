(function () {
  'use strict';

  var STORAGE_KEY = 'beri_lang_pref';

  function getStoredPref() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return value === 'en' || value === 'zh' ? value : null;
    } catch (error) {
      return null;
    }
  }

  function setStoredPref(lang) {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      /* ignore storage failures (private browsing, disabled storage, etc.) */
    }
  }

  function isEnPath(path) {
    return path === '/en' || path.indexOf('/en/') === 0;
  }

  function preferredLangFromBrowser() {
    var langs = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || navigator.userLanguage || ''];
    for (var i = 0; i < langs.length; i++) {
      if (/^zh/i.test(langs[i])) return 'zh';
    }
    return 'en';
  }

  function targetPathForLang(lang, path) {
    var currentlyEn = isEnPath(path);
    if (lang === 'en' && !currentlyEn) {
      return '/en' + path;
    }
    if (lang === 'zh' && currentlyEn) {
      var stripped = path.replace(/^\/en/, '');
      return stripped === '' ? '/' : stripped;
    }
    return null; // already on the matching language version
  }

  (function redirectIfNeeded() {
    var path = window.location.pathname;
    var stored = getStoredPref();
    var target;

    if (stored) {
      target = targetPathForLang(stored, path);
    } else {
      var browserPref = preferredLangFromBrowser();
      target = targetPathForLang(browserPref, path);
      // Remember this auto-detected choice so it only redirects once,
      // and so a later manual switch is what sticks from then on.
      setStoredPref(browserPref);
    }

    if (target) {
      window.location.replace(target + window.location.search + window.location.hash);
    }
  })();

  // Let manual language-switch links (nav "EN" / "中文") lock in the user's choice
  // so it's never overridden by auto-detection again.
  document.addEventListener('DOMContentLoaded', function () {
    var links = document.querySelectorAll('.lang-switch[data-lang]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (event) {
        setStoredPref(event.currentTarget.getAttribute('data-lang'));
      });
    }
  });
})();
