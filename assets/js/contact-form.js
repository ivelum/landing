import { isPlainClick, setupModal } from './modal.js';

(() => {
  const modal = document.querySelector('.contact-form-modal');
  if (!modal || typeof modal.showModal !== 'function') return;

  const close = modal.querySelector('.contact-form-modal--close');
  const header = modal.querySelector('.contact-form-modal--header');
  const form = modal.querySelector('.contact-form-modal--form');
  const success = modal.querySelector('.contact-form-modal--success');
  const successClose = modal.querySelector('.contact-form-modal--success-close');
  const sendError = modal.querySelector('.contact-form-modal--send-error');
  const submit = modal.querySelector('.contact-form-modal--submit');
  const submitIdle = submit.querySelector('[data-submit-idle]');
  const submitBusy = submit.querySelector('[data-submit-busy]');
  const inputs = [...form.querySelectorAll('.contact-form-modal--input')];

  const popup = setupModal(modal, { onClose: reset });

  // Each screen has its own heading, and the dialog has to be named after
  // the one on show: a hidden element still counts for the accessible name.
  const setScreen = (screen) => {
    const done = screen === 'success';
    header.hidden = done;
    form.hidden = done;
    success.hidden = !done;
    modal.dataset.screen = screen;
    modal.setAttribute(
      'aria-labelledby',
      done ? 'contact-form-success-title' : 'contact-form-title',
    );
    // Focus goes back to the dialog itself rather than to a control on the
    // new screen: the keyboard then starts from the top of what is on show,
    // and nothing is left outlined after the swap.
    if (modal.open) modal.focus();
  };

  // An empty field and a malformed one get different messages, both carried
  // by the field itself in the markup. The email format is checked by the
  // browser: it parses addresses more strictly and more consistently than
  // any expression we would write.
  const errorFor = (input) => {
    if (!input.required) return '';
    if (!input.value.trim()) return input.dataset.errorRequired;
    if (input.validity.typeMismatch) return input.dataset.errorInvalid;
    return '';
  };

  const showError = (input, message) => {
    const error = document.getElementById(`${input.id}-error`);
    error.textContent = message;
    error.hidden = !message;
    // It has to be `="true"`: ARIA reads an empty value as false.
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  };

  const validate = () => {
    let first;
    inputs.forEach((input) => {
      const message = errorFor(input);
      showError(input, message);
      if (message && !first) first = input;
    });
    first?.focus();
    return !first;
  };

  // A field's error clears as soon as the field is fixed, not on the next
  // submit: otherwise the message contradicts what the person is looking
  // at.
  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid') && !errorFor(input)) showError(input, '');
    });
  });

  const setBusy = (busy) => {
    inputs.forEach((input) => { input.disabled = busy; });
    submit.disabled = busy;
    submitIdle.hidden = busy;
    submitBusy.hidden = !busy;
    if (busy) modal.dataset.sending = '';
    else delete modal.dataset.sending;
  };

  const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

  // TEMPORARY, until the endpoint exists. `data-endpoint` is empty, there is
  // nowhere to send — and staying quiet about that is not an option: on
  // production the form shows the error block with the email address, in
  // development it reports success so the screen can be looked at. Either
  // branch can be asked for by URL, `&send=success` or `&send=error`, which
  // is how the screens are checked on a real device. Once the endpoint
  // exists, this whole block goes away along with `data-offline-send`.
  const offlineSend = async () => {
    await wait(1200);
    const forced = new URLSearchParams(location.search).get('send');
    const outcome = forced || form.dataset.offlineSend;
    if (outcome !== 'success') throw new Error('Contact form has no endpoint yet');
  };

  const send = async (data) => {
    const endpoint = form.dataset.endpoint;
    if (!endpoint) return offlineSend();

    const response = await fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // Success is decided by the status code, not by a field in the body:
    // the site's two earlier handlers answered differently, and there is no
    // reason to repeat that.
    if (!response.ok) throw new Error(`Contact form request failed: ${response.status}`);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    sendError.hidden = true;
    if (!validate()) return;

    setBusy(true);
    try {
      await send(Object.fromEntries(
        [...new FormData(form)].map(([key, value]) => [key, value.trim()]),
      ));
      lockHeight();
      setScreen('success');
    } catch (error) {
      sendError.hidden = false;
      // On a narrow screen the block appears below the visible part of the
      // popup, and without this all the person sees is the button becoming
      // clickable again.
      sendError.scrollIntoView({ block: 'nearest' });
      console.error(error);
    } finally {
      setBusy(false);
    }
  });

  // The modal must not collapse to the size of a short message, so its
  // height is remembered before the form is replaced. On a narrow screen the
  // popup already fills the screen and there is nothing to pin.
  function lockHeight() {
    const { height } = modal.getBoundingClientRect();
    if (height < window.innerHeight) modal.style.height = `${height}px`;
  }

  // State lives until the popup is closed: a success screen on show must not
  // disappear by itself. Reopening the popup, though, starts from a clean
  // form — there is no reason to send the same thing twice.
  function reset() {
    modal.style.height = '';
    if (modal.dataset.screen !== 'success') return;
    form.reset();
    inputs.forEach((input) => { showError(input, ''); });
    sendError.hidden = true;
    setScreen('form');
  }

  const open = (trigger, variant) => {
    modal.dataset.variant = variant || '';
    popup.open(trigger);
  };

  // The popup is shared: opened from the discount button it shows the badge,
  // from any other button it does not. The variant only affects the badge, so
  // it is kept as an attribute on the dialog and the showing is left to CSS.
  document.querySelectorAll('[data-contact-open="form"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();
      open(link, link.dataset.contactVariant);
    });
  });

  close.addEventListener('click', () => modal.close());
  successClose.addEventListener('click', () => modal.close());

  setScreen('form');

  // URL entry: the form can be opened on any page without giving it a
  // button. It is also how the popup is checked on production while the
  // discount button still leads to the hub.
  const entry = new URLSearchParams(location.search).get('contact-form');
  if (entry !== null) open(null, entry === 'startup-discount' ? entry : '');
})();
