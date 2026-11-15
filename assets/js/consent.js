// Cookie consent banner (https://github.com/orestbida/cookieconsent).
//
// Nothing that needs consent runs until the visitor accepts its category:
// - analytics: PostHog, started through window.loadPostHog (posthog.html);
// - thirdparty: the Clutch reviews widget (layouts/shortcodes/testimonial-clutch.html).
// Calendly, Crisp and YouTube are not here: they load only when the visitor
// clicks to use them.
//
// Bump `revision` whenever the list of cookies or services changes, so that
// everyone is asked again.
import * as CookieConsent from 'vanilla-cookieconsent';

const STYLESHEET = '/vendor/vanilla-cookieconsent@3.2.1.css';

// Deletes a cookie on the current host and on every parent domain, since
// PostHog sets its cookie on the top-level domain (.ivelum.com).
const deleteCookie = (name) => {
  const parts = window.location.hostname.split('.');
  for (let i = 0; i < parts.length - 1 || i === 0; i += 1) {
    const domain = parts.slice(i).join('.');
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
  }
  document.cookie = `${name}=; Max-Age=0; path=/`;
};

const forgetPostHog = () => {
  document.cookie.split(';')
    .map((cookie) => cookie.split('=')[0].trim())
    .filter((name) => name.startsWith('ph_'))
    .forEach(deleteCookie);
  [window.localStorage, window.sessionStorage].forEach((storage) => {
    try {
      Object.keys(storage)
        .filter((key) => key.startsWith('ph_') || key.startsWith('__ph'))
        .forEach((key) => storage.removeItem(key));
    } catch {
      // Storage can be unavailable, e.g. when blocked by the browser.
    }
  });
};

const pageLoaded = () => new Promise((resolve) => {
  if (document.readyState === 'complete') resolve();
  else window.addEventListener('load', resolve, { once: true });
});

// Clutch's script initialises itself on `readystatechange`, which has passed
// by the time a visitor accepts, so it is started by hand. It never marks
// itself as started, so loading it before the page is complete would let the
// final `readystatechange` start it a second time.
let clutchLoading;
const loadClutch = () => {
  if (clutchLoading || !document.querySelector('.clutch-widget')) return;
  clutchLoading = pageLoaded()
    .then(() => CookieConsent.loadScript('https://widget.clutch.co/static/js/widget.js'))
    .then(() => window.CLUTCHCO?.Init());
};

const startAccepted = () => {
  if (CookieConsent.acceptedCategory('analytics')) window.loadPostHog?.();
  if (CookieConsent.acceptedCategory('thirdparty')) loadClutch();
};

// Scripts that already ran cannot be unloaded, so withdrawing consent clears
// what they stored and reloads the page without them.
const onChange = ({ changedCategories }) => {
  const revoked = changedCategories.filter(
    (category) => !CookieConsent.acceptedCategory(category),
  );
  if (revoked.length === 0) {
    startAccepted();
    return;
  }
  if (revoked.includes('analytics')) forgetPostHog();
  window.location.reload();
};

const loadStylesheet = () => new Promise((resolve) => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLESHEET;
  link.onload = resolve;
  link.onerror = resolve;
  document.head.appendChild(link);
});

loadStylesheet().then(() => CookieConsent.run({
  revision: 1,
  guiOptions: {
    consentModal: { layout: 'box', position: 'bottom left', equalWeightButtons: true },
    preferencesModal: { layout: 'box', equalWeightButtons: true },
  },
  categories: {
    necessary: { enabled: true, readOnly: true },
    analytics: {},
    thirdparty: {},
  },
  onConsent: startAccepted,
  onChange,
  language: {
    default: 'en',
    translations: {
      en: {
        consentModal: {
          title: 'Cookies',
          description: 'We’d like to use cookies to understand how people use our site and to show reviews from a third-party platform. We don’t set them unless you accept. See our <a href="/privacy/#our-use-of-cookies">privacy policy</a>.',
          acceptAllBtn: 'Accept all',
          acceptNecessaryBtn: 'Reject all',
          showPreferencesBtn: 'Customize',
        },
        preferencesModal: {
          title: 'Cookie settings',
          acceptAllBtn: 'Accept all',
          acceptNecessaryBtn: 'Reject all',
          savePreferencesBtn: 'Save settings',
          closeIconLabel: 'Close',
          sections: [
            {
              description: 'Choose which cookies we may use. You can change this at any time with the “Cookie settings” link at the bottom of every page.',
            },
            {
              title: 'Strictly necessary',
              description: 'Needed for the site to work, so they can’t be turned off. We only use one: it saves the choice you make here, so we don’t ask again on every page.',
              linkedCategory: 'necessary',
            },
            {
              title: 'Analytics',
              description: 'PostHog, hosted in the EU, tells us which pages are visited and how the site is used.',
              linkedCategory: 'analytics',
            },
            {
              title: 'Third-party content',
              description: 'The Clutch reviews widget, which may set its own cookies.',
              linkedCategory: 'thirdparty',
            },
            {
              title: 'More information',
              description: 'Booking a call (Calendly, which also uses Stripe and Google reCAPTCHA), the chat (Crisp) and videos (YouTube) load only when you use them. See our <a href="/privacy/#our-use-of-cookies">privacy policy</a> for details.',
            },
          ],
        },
      },
    },
  },
}));
