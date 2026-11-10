export function bindLayers({ overlay, layers }) {
  let active = null, opener = null;
  const focusables = () => [...active.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter(node => node.getClientRects().length);
  const close = () => { if (!active) return; active.classList.remove('is-open'); overlay.classList.remove('is-open'); document.body.style.overflow = ''; active = null; opener?.focus(); };
  document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
    const layer = layers.find(item => item.id === button.dataset.open); if (!layer) return;
    close(); opener = button; active = layer; active.classList.add('is-open'); overlay.classList.add('is-open'); document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => { if (active === layer) focusables()[0]?.focus(); });
  }));
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', close));
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const items = focusables(); if (!items.length) { event.preventDefault(); return; }
    const index = items.indexOf(document.activeElement);
    if (index === -1) { event.preventDefault(); (event.shiftKey ? items.at(-1) : items[0]).focus(); }
    else if (event.shiftKey && index === 0) { event.preventDefault(); items.at(-1).focus(); }
    else if (!event.shiftKey && index === items.length - 1) { event.preventDefault(); items[0].focus(); }
  });
}
