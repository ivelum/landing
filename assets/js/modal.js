// Общая механика попапов сайта на <dialog>: блокировка страницы под ними,
// закрытие кликом по затемнению, фокус при открытии и возврат фокуса при
// закрытии. Лежит отдельно, потому что обходы багов WebKit здесь выстраданы
// на живых устройствах, и две расходящиеся копии этого кода нам не нужны.

// Страницу под открытым попапом держим инлайновым стилем, а не правилом
// `html:has(dialog[open])`: на iOS пересчёт `:has()` на корневом элементе
// срабатывает не всегда, и `overflow: hidden` остаётся на <html> после
// закрытия — страница выглядит живой, но не скроллится.
const lockPage = () => {
  document.documentElement.style.overflow = 'hidden';
};

const unlockPage = () => {
  document.documentElement.style.overflow = '';
};

// Клик по затемнению: сам <dialog> занимает весь экран, поэтому «снаружи» —
// это за пределами его отрисованной коробки. Нажатие и отпускание должны
// оба попасть мимо, иначе выделение текста, уехавшее за край модалки,
// закрывало бы её.
export function setupModal(modal, { onClose } = {}) {
  let opener;
  let backdropPressed = false;

  const outside = (event) => {
    const rect = modal.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom;
  };

  modal.addEventListener('pointerdown', (event) => {
    backdropPressed = outside(event);
  });

  modal.addEventListener('click', (event) => {
    if (backdropPressed && outside(event)) modal.close();
    backdropPressed = false;
  });

  modal.addEventListener('close', () => {
    modal.inert = true;
    unlockPage();
    opener?.focus();
    onClose?.();
  });

  return {
    // Фокус забирает сам диалог, а не контрол внутри: приземление на кнопку
    // или ссылку рисует обводку в момент открытия, и Safari выбирает для
    // этого не тот элемент, что остальные. Табуляция отсюда всё равно идёт
    // по контролам по порядку.
    open(trigger) {
      opener = trigger;
      modal.inert = false;
      modal.showModal();
      lockPage();
      modal.focus();
    },
  };
}

// Клик по ссылке-кнопке, который должен открыть попап, а не уйти по href:
// средняя кнопка мыши и клик с модификатором остаются за браузером, чтобы
// ссылка по-прежнему открывалась в новой вкладке.
export function isPlainClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey &&
    !event.shiftKey && !event.altKey;
}
