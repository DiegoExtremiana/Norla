import { panels, panelTop, panelOffset } from '../core/layout.js';
import { reducedMotion } from '../core/motion.js';

export function initNav() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');

  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };

  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });

  // Con paneles sticky el navegador no calcula bien el destino de un ancla,
  // así que se desplaza a la posición natural del panel.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = id === 'top' ? panels[0] : document.getElementById(id);
    const index = panels.indexOf(target);
    if (index < 0) return;

    e.preventDefault();
    setMenu(false);
    window.scrollTo({ top: panelOffset(index), behavior: reducedMotion() ? 'auto' : 'smooth' });
  });

  const probe = nav.offsetHeight / 2;

  return {
    update({ y }) {
      let current = 0;
      panels.forEach((_, i) => {
        if (panelTop(i, y) <= probe) current = i;
      });
      nav.classList.toggle('is-dark', panels[current].dataset.theme === 'dark');
      nav.classList.toggle('is-scrolled', y > 4);
    },
  };
}
