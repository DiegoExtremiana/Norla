// Efecto de pila: el panel que queda debajo retrocede (escala, se oscurece y
// redondea esquinas) mientras el siguiente sube con sombra.

import { panels, panelTop } from '../core/layout.js';
import { clamp, easeOut } from '../core/math.js';
import { reducedMotion } from '../core/motion.js';
import { setStyle } from '../core/style.js';

const SCALE = 0.08;
const RADIUS = 32;

export function initStack() {
  return {
    update({ y, vh }) {
      const still = reducedMotion();

      panels.forEach((panel, i) => {
        const next = panels[i + 1];
        const covered = next ? clamp(1 - panelTop(i + 1, y) / vh) : 0;
        const back = still ? 0 : easeOut(covered);
        const shade = back * (panel.dataset.theme === 'dark' ? 0.55 : 0.4);

        // Los bucles CSS solo corren si el panel se ve
        panel.classList.toggle('is-playing', panelTop(i, y) < vh && covered < 1);

        setStyle(panel, 'transform', back > 0 ? `scale(${(1 - back * SCALE).toFixed(4)})` : '');
        setStyle(panel, '--shade', shade.toFixed(3));
        setStyle(panel, '--rb', `${(back * RADIUS).toFixed(1)}px`);

        if (i === 0) return;
        const arrive = clamp(1 - panelTop(i, y) / vh);
        const moving = arrive > 0 && arrive < 1;
        setStyle(panel, '--ra', moving && !still ? `${((1 - arrive) * RADIUS).toFixed(1)}px` : '0px');
        setStyle(panel, '--lift', moving ? (0.35 * (1 - arrive * 0.6)).toFixed(3) : '0');
      });
    },
  };
}
