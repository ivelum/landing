import { isPlainClick, setupModal } from './modal.js';

(() => {
  const modal = document.querySelector('.booking-modal');
  if (!modal || typeof modal.showModal !== 'function') return;

  const widget = modal.querySelector('.booking-modal--widget');
  const close = modal.querySelector('.booking-modal--close');
  const status = modal.querySelector('[data-calendly-status]');
  const popup = setupModal(modal);
  let loading;
  let readyTimer;

  const failed = () => {
    status.textContent = 'Unable to load available times. Please open Calendly directly.';
  };

  // Share one script request and one iframe across preloading and every opening.
  const preload = () => {
    if (loading) return loading;
    readyTimer = setTimeout(failed, 20000);
    loading = loadWidget().catch(failed);
    return loading;
  };

  const loadWidget = () => new Promise((resolve, reject) => {
    if (window.Calendly) return resolve();
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  }).then(() => {
    window.Calendly.initInlineWidget({
      url: 'https://calendly.com/ivelum/consultation?hide_gdpr_banner=1&hide_event_type_details=1',
      parentElement: widget,
    });
    widget.querySelector('iframe').title = 'Schedule a consultation with ivelum';
  });

  window.addEventListener('message', (event) => {
    const iframe = widget.querySelector('iframe');
    if (event.origin !== 'https://calendly.com' ||
        event.source !== iframe?.contentWindow ||
        !['calendly.profile_page_viewed', 'calendly.event_type_viewed']
          .includes(event.data?.event)) return;
    clearTimeout(readyTimer);
    widget.inert = false;
    modal.dataset.ready = '';
  });

  // Buttons with mode="form" open the request form popup and are handled in
  // contact-form.js; this popup leaves them alone.
  document.querySelectorAll('[data-contact-open]:not([data-contact-open="form"])').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();
      // "contact" opens the choices, anything else goes straight to the calendar.
      setView(link.dataset.contactOpen === 'contact' ? 'hub' : 'book');
      popup.open(link);
      preload();
    });
  });

  // Moving between the choices and the calendar. The widget never changes its
  // place in the DOM, so the iframe is not reloaded.
  // Each screen has its own heading, and the dialog has to be named after the
  // one on show: a hidden element still counts for the accessible name.
  const headings = {
    hub: 'booking-hub-title',
    book: 'booking-title',
    schedule: 'booking-title',
  };

  // Switching screens moves the focus back to the dialog rather than to the
  // control that leads out of the new one: the keyboard carries on from the
  // top of what is now on show, and nothing is left outlined after a click.
  const setView = (view) => {
    modal.dataset.view = view;
    modal.setAttribute('aria-labelledby', headings[view]);
    if (modal.open) modal.focus();
  };

  const back = modal.querySelector('[data-view-hub]');
  modal.querySelector('[data-view-schedule]')?.addEventListener('click', () => {
    setView('schedule');
  });
  back?.addEventListener('click', () => {
    setView('hub');
  });

  // Narrow screens keep the addresses folded behind the "Offices" chip.
  const officesToggle = modal.querySelector('[data-offices-toggle]');
  const offices = modal.querySelector('#booking-offices');
  officesToggle?.addEventListener('click', () => {
    const expanded = officesToggle.getAttribute('aria-expanded') === 'true';
    officesToggle.setAttribute('aria-expanded', String(!expanded));
    offices.hidden = expanded;
  });

  close.addEventListener('click', () => modal.close());

  if (document.readyState === 'complete') {
    preload();
  } else {
    window.addEventListener('load', preload, { once: true });
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      preload();
    }, { rootMargin: '600px 0px' });
    observer.observe(document.querySelector('.footer--default'));
  }
})();
