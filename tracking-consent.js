(function () {
  'use strict';

  const config = window.BERI_TRACKING_CONFIG || {};
  const storageKey = 'beri_tracking_consent_v1';
  const defaultConsent = Object.freeze({ analytics: false, advertising: false });
  let gtmLoaded = false;
  let metaLoaded = false;
  let metaClickTrackingBound = false;

  function readConsent() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey));
      if (typeof saved?.analytics === 'boolean' && typeof saved?.advertising === 'boolean') {
        return { analytics: saved.analytics, advertising: saved.advertising };
      }
    } catch (error) {
      console.warn('[Beri consent] Unable to read saved preferences.', error);
    }
    return null;
  }

  function writeConsent(consent) {
    window.localStorage.setItem(storageKey, JSON.stringify({
      analytics: Boolean(consent.analytics),
      advertising: Boolean(consent.advertising),
      updatedAt: new Date().toISOString()
    }));
  }

  function loadGoogleTagManager() {
    if (gtmLoaded || !config.gtmId) return;
    gtmLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.gtmId)}`;
    script.dataset.beriTracking = 'google-tag-manager';
    document.head.appendChild(script);
  }

  function bindMetaAppStoreClicks() {
    if (metaClickTrackingBound) return;
    metaClickTrackingBound = true;
    document.addEventListener('click', function (event) {
      const link = event.target.closest('a[href*="apps.apple.com"]');
      if (!link || typeof window.fbq !== 'function') return;
      window.fbq('trackCustom', 'AppStoreClick', {
        page_path: window.location.pathname
      });
    });
  }

  function loadMetaPixel() {
    if (metaLoaded || !/^\d+$/.test(config.metaPixelId || '')) return;
    metaLoaded = true;

    /* Meta Pixel bootstrap, loaded only after explicit advertising consent. */
    (function (windowObject, documentObject, tagName, sourceUrl, functionName) {
      if (windowObject[functionName]) return;
      const queue = windowObject[functionName] = function () {
        queue.callMethod ? queue.callMethod.apply(queue, arguments) : queue.queue.push(arguments);
      };
      if (!windowObject._fbq) windowObject._fbq = queue;
      queue.push = queue;
      queue.loaded = true;
      queue.version = '2.0';
      queue.queue = [];
      const script = documentObject.createElement(tagName);
      script.async = true;
      script.src = sourceUrl;
      script.dataset.beriTracking = 'meta-pixel';
      const firstScript = documentObject.getElementsByTagName(tagName)[0];
      firstScript.parentNode.insertBefore(script, firstScript);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js', 'fbq');

    window.fbq('init', config.metaPixelId);
    window.fbq('track', 'PageView');
    bindMetaAppStoreClicks();
  }

  function clearTrackingCookies() {
    const prefixes = ['_ga', '_gid', '_gat', '_gcl_', '_fbp', '_fbc'];
    const domains = [window.location.hostname, `.${window.location.hostname}`];
    document.cookie.split(';').forEach(function (cookie) {
      const name = cookie.split('=')[0].trim();
      if (!prefixes.some((prefix) => name.startsWith(prefix))) return;
      document.cookie = `${name}=; Max-Age=0; path=/`;
      domains.forEach(function (domain) {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
      });
    });
  }

  function applyConsent(consent) {
    if (consent.analytics) loadGoogleTagManager();
    if (consent.advertising) loadMetaPixel();
  }

  function createConsentUi(savedConsent) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <section class="cookie-banner" role="region" aria-label="Cookie 使用選擇" hidden>
        <div class="cookie-banner__content">
          <div>
            <h2>由你決定網站資料的使用方式</h2>
            <p>必要儲存只用來記住你的選擇。經你同意後，我們才會啟用網站分析或 Meta 廣告成效追蹤。你可以隨時到頁尾重新設定，詳情請見<a href="privacy-policy.html#website-tracking">隱私權政策</a>。</p>
          </div>
          <div class="cookie-banner__actions">
            <button type="button" class="cookie-button cookie-button--secondary" data-consent-reject>全部拒絕</button>
            <button type="button" class="cookie-button cookie-button--secondary" data-consent-settings>設定偏好</button>
            <button type="button" class="cookie-button" data-consent-accept>全部接受</button>
          </div>
        </div>
      </section>
      <dialog class="cookie-dialog" aria-labelledby="cookie-dialog-title">
        <form method="dialog">
          <div class="cookie-dialog__header">
            <div>
              <h2 id="cookie-dialog-title">Cookie 設定</h2>
              <p>選擇你願意允許的非必要追蹤。關閉選項不影響網站基本功能。</p>
            </div>
            <button type="button" class="cookie-dialog__close" aria-label="關閉 Cookie 設定" data-consent-close>×</button>
          </div>
          <div class="cookie-option">
            <div>
              <strong>必要儲存</strong>
              <p>在瀏覽器中保存你的 Cookie 選擇。</p>
            </div>
            <input type="checkbox" checked disabled aria-label="必要儲存，永遠啟用">
          </div>
          <label class="cookie-option">
            <div>
              <strong>網站分析</strong>
              <p>允許 Google Analytics 協助我們了解匿名化的網站使用情形。</p>
            </div>
            <input type="checkbox" name="analytics">
          </label>
          <label class="cookie-option">
            <div>
              <strong>廣告成效</strong>
              <p>允許 Meta Pixel 記錄頁面瀏覽與 App Store 外連點擊。</p>
            </div>
            <input type="checkbox" name="advertising">
          </label>
          <div class="cookie-dialog__actions">
            <button type="button" class="cookie-button cookie-button--secondary" data-consent-dialog-reject>全部拒絕</button>
            <button type="submit" class="cookie-button" value="save">儲存選擇</button>
          </div>
        </form>
      </dialog>`;

    document.body.appendChild(wrapper);
    const banner = wrapper.querySelector('.cookie-banner');
    const dialog = wrapper.querySelector('.cookie-dialog');
    const form = dialog.querySelector('form');
    const analyticsInput = form.elements.analytics;
    const advertisingInput = form.elements.advertising;

    function openSettings() {
      const current = readConsent() || defaultConsent;
      analyticsInput.checked = current.analytics;
      advertisingInput.checked = current.advertising;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }

    function closeSettings() {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }

    function save(consent) {
      const previous = readConsent() || defaultConsent;
      writeConsent(consent);
      banner.hidden = true;
      closeSettings();

      const revokedLoadedTracking =
        (previous.analytics && !consent.analytics && gtmLoaded) ||
        (previous.advertising && !consent.advertising && metaLoaded);

      if (revokedLoadedTracking) {
        clearTrackingCookies();
        window.location.reload();
        return;
      }
      applyConsent(consent);
    }

    wrapper.querySelector('[data-consent-reject]').addEventListener('click', () => save(defaultConsent));
    wrapper.querySelector('[data-consent-accept]').addEventListener('click', () => save({ analytics: true, advertising: true }));
    wrapper.querySelector('[data-consent-settings]').addEventListener('click', openSettings);
    wrapper.querySelector('[data-consent-close]').addEventListener('click', closeSettings);
    wrapper.querySelector('[data-consent-dialog-reject]').addEventListener('click', () => save(defaultConsent));
    dialog.addEventListener('submit', function (event) {
      event.preventDefault();
      save({ analytics: analyticsInput.checked, advertising: advertisingInput.checked });
    });

    const footerContainer = document.querySelector('body > footer .container');
    if (footerContainer) {
      const settingsButton = document.createElement('button');
      settingsButton.type = 'button';
      settingsButton.className = 'footer-cookie-button';
      settingsButton.textContent = 'Cookie 設定';
      settingsButton.addEventListener('click', openSettings);
      footerContainer.appendChild(settingsButton);
    }

    if (!savedConsent) banner.hidden = false;
  }

  const initialConsent = readConsent();
  if (initialConsent) applyConsent(initialConsent);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => createConsentUi(initialConsent));
  } else {
    createConsentUi(initialConsent);
  }
})();
