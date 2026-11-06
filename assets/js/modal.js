// Shared mechanics for the site's <dialog> popups: locking the page beneath
// them, closing on a backdrop click, taking focus on open and giving it back
// on close. It lives on its own because the WebKit workarounds in here were
// earned on real devices, and two copies of them would drift apart.

// The page under an open popup is locked with an inline style rather than a
// `html:has(dialog[open])` rule: on iOS `:has()` on the root element is not
// always re-evaluated, and `overflow: hidden` stays on <html> after closing —
// the page looks alive but will not scroll.
const lockPage = () => {
  document.documentElement.style.overflow = 'hidden';
};

const unlockPage = () => {
  document.documentElement.style.overflow = '';
};

// Backdrop clicks: the <dialog> itself fills the screen, so "outside" means
// outside its painted box. Both the press and the release have to miss it,
// otherwise a text selection dragged past the edge of the modal would close
// it.
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
    // The dialog takes focus itself rather than a control inside it: landing
    // on a button or a link draws an outline the moment the popup opens, and
    // Safari picks a different element for that than the other browsers.
    // Tabbing from here still walks the controls in order.
    open(trigger) {
      opener = trigger;
      modal.inert = false;
      modal.showModal();
      lockPage();
      modal.focus();
    },
  };
}

// A click on a link-shaped button that should open the popup instead of
// following the href. The middle button and modifier clicks are left to the
// browser, so the link still opens in a new tab.
export function isPlainClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey &&
    !event.shiftKey && !event.altKey;
}
