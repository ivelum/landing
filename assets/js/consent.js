// Cookie consent banner (https://github.com/orestbida/cookieconsent).
//
// Nothing that needs consent runs until the visitor accepts its category:
// - analytics: PostHog, started through window.loadPostHog (posthog.html);
// - marketing: RB2B visitor identification, started through window.loadRb2b
//   (rb2b.html).
// Calendly, Crisp and YouTube are not here: they load only when the visitor
// clicks to use them.
//
// Bump `revision` whenever the list of cookies or services changes, so that
// everyone is asked again.
//
// `cookieConsent` in hugo.toml switches the banner off. Everything then starts
// as if the visitor had accepted every category.
import * as CookieConsent from 'vanilla-cookieconsent';
import * as params from '@params';

const STYLESHEET = '/vendor/vanilla-cookieconsent@3.2.1.css';

const start = (accepted) => {
  if (accepted('analytics')) window.loadPostHog?.();
  if (accepted('marketing')) window.loadRb2b?.();
};

const startAccepted = () => start(CookieConsent.acceptedCategory);

const loadStylesheet = () => new Promise((resolve) => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLESHEET;
  link.onload = resolve;
  link.onerror = resolve;
  document.head.appendChild(link);
});

const runBanner = () => loadStylesheet().then(() => CookieConsent.run({
  revision: 3,
  guiOptions: {
    consentModal: { layout: 'box', position: 'bottom left', equalWeightButtons: false },
  },
  categories: {
    necessary: { enabled: true, readOnly: true },
    analytics: {},
    marketing: {},
  },
  onConsent: startAccepted,
  language: {
    default: 'en',
    translations: {
      en: {
        consentModal: {
          title: 'Cookies',
          description: 'We’d like to use cookies to understand how people use our site. We don’t set them unless you accept. Learn more in our <a href="/privacy/#our-use-of-cookies">privacy policy</a>.',
          acceptAllBtn: 'Accept all',
          acceptNecessaryBtn: 'Only necessary',
        },
      },
    },
  },
}));

if (params.cookieConsent) runBanner();
else start(() => true);
