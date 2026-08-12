(() => {
  const modal = document.querySelector('#modal');
  const main = document.querySelector('#main');
  const tray = document.querySelector('#tray');
  let opener = null;

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  const configureStaticA11y = () => {
    const avatar = document.querySelector('.avatar');
    if (avatar) avatar.setAttribute('aria-label', 'Profilo utente');

    const mobileTray = document.querySelector('#mobileTray');
    if (mobileTray) mobileTray.setAttribute('aria-label', 'Apri il sistema corrente');

    if (main) main.setAttribute('tabindex', '-1');
    if (tray) tray.setAttribute('aria-label', 'Riepilogo sistema');
  };

  const configureDialog = () => {
    if (!modal || modal.classList.contains('hidden')) return;
    modal.setAttribute('aria-label', 'Dialogo applicazione');
    const close = modal.querySelector('#x');
    if (close) close.setAttribute('aria-label', 'Chiudi finestra');
    const first = modal.querySelector(focusableSelector);
    if (first) first.focus();
  };

  const observer = new MutationObserver(() => {
    configureStaticA11y();
    if (modal && !modal.classList.contains('hidden')) {
      if (!opener) opener = document.activeElement;
      configureDialog();
    } else if (opener && document.contains(opener)) {
      opener.focus();
      opener = null;
    }
  });

  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });

  document.addEventListener('keydown', (event) => {
    if (!modal || modal.classList.contains('hidden')) return;

    if (event.key === 'Escape') {
      const close = modal.querySelector('#x');
      if (close) close.click();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusables = [...modal.querySelectorAll(focusableSelector)];
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  configureStaticA11y();
})();
