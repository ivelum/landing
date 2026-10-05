(() => {
  const modal = document.querySelector('.booking-modal');
  if (!modal || typeof modal.showModal !== 'function') return;

  const widget = modal.querySelector('.booking-modal--widget');
  const status = modal.querySelector('[data-calendly-status]');
  let loading;
  let readyTimer;
  let opener;

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

  document.querySelectorAll('[data-calendly-open]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      modal.inert = false;
      modal.showModal();
      preload();
    });
  });

  modal.querySelector('.booking-modal--close').addEventListener('click', () => modal.close());
  let backdropPressed = false;
  const outside = (event) => {
    const rect = modal.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom;
  };
  modal.addEventListener('pointerdown', (event) => { backdropPressed = outside(event); });
  modal.addEventListener('click', (event) => {
    if (backdropPressed && outside(event)) modal.close();
    backdropPressed = false;
  });
  modal.addEventListener('close', () => {
    modal.inert = true;
    opener?.focus();
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      preload();
    }, { rootMargin: '600px 0px' });
    observer.observe(document.querySelector('.footer--default'));
  }
})();
