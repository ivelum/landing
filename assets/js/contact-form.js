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

  // Каждый экран со своим заголовком, и диалог должен называться тем, что
  // сейчас на виду: скрытый элемент всё равно попадает в доступное имя.
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
    // Фокус возвращается на сам диалог, а не на кнопку нового экрана: так
    // клавиатура начинает сверху того, что показано, и после замены
    // ничего не остаётся обведённым.
    if (modal.open) modal.focus();
  };

  // Пустое поле и поле с мусором — разные сообщения, оба лежат на самом
  // поле в разметке. Формат почты проверяет браузер: он разбирает адреса
  // строже и единообразнее любого нашего выражения.
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
    // Именно `="true"`: пустое значение атрибута ARIA читает как «false».
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

  // Ошибка поля гаснет, как только его исправили, а не по следующей
  // отправке: иначе подсказка противоречит тому, что человек видит.
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

  // ВРЕМЕННО, до появления эндпоинта. `data-endpoint` пуст, отправлять
  // некуда — и молчать об этом нельзя: на бою форма показывает блок ошибки
  // с почтой, в разработке отдаёт успех, чтобы было видно экран. Любую из
  // двух веток можно вызвать адресом, `&send=success` или `&send=error`, —
  // этим проверяют экраны на реальном устройстве. Когда адрес появится,
  // весь этот кусок вместе с `data-offline-send` удаляется.
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
    // Успех определяем по коду ответа, а не по полю в теле: два прежних
    // обработчика сайта отвечали по-разному, и повторять это незачем.
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
      // На узком экране блок появляется ниже видимой части попапа, и без
      // этого человек видит только, что кнопка снова нажимается.
      sendError.scrollIntoView({ block: 'nearest' });
      console.error(error);
    } finally {
      setBusy(false);
    }
  });

  // Модалка не должна схлопнуться до размера короткого сообщения, поэтому
  // перед заменой формы запоминаем её высоту. На узком экране попап и так
  // во весь экран, там фиксировать нечего.
  function lockHeight() {
    const { height } = modal.getBoundingClientRect();
    if (height < window.innerHeight) modal.style.height = `${height}px`;
  }

  // Состояние живёт до закрытия: показанный экран успеха не должен
  // пропадать сам по себе. А вот открытый заново попап начинается с чистой
  // формы — повторно слать то же самое незачем.
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

  // Попап универсальный: со скидочной кнопки он показывает плашку, со всех
  // остальных — нет. Вариант правит только плашку, поэтому держим его
  // атрибутом на диалоге, а показ отдаём стилям.
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

  // Вход по адресу: форму можно открыть на любой странице, не заводя для
  // неё кнопку. Этим же проверяют попап на бою, пока кнопка скидки ведёт
  // в хаб.
  const entry = new URLSearchParams(location.search).get('contact-form');
  if (entry !== null) open(null, entry === 'startup-discount' ? entry : '');
})();
