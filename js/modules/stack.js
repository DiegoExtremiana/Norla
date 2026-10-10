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

      // 1px de tolerancia: el scroll máximo se redondea y el último panel
      // puede quedarse a una fracción de píxel de tapar del todo al anterior
      const covered = panels.map((_, i) => (panels[i + 1] ? clamp(1 - Math.max(0, panelTop(i + 1, y) - 1) / vh) : 0));

      panels.forEach((panel, i) => {
        // Tapado del todo y sin que el siguiente retroceda: no se ve. Se deja
        // transparente para que la GPU no acumule una capa por panel al bajar
        // (opacity y no visibility, para no sacarlo del árbol de accesibilidad).
        const hidden = covered[i] >= 1 && (covered[i + 1] === 0 || covered[i + 1] >= 1);
        setStyle(panel, 'opacity', hidden ? '0' : '');
        // Los bucles CSS solo corren si el panel se ve
        panel.classList.toggle('is-playing', !hidden && panelTop(i, y) < vh && covered[i] < 1);
        if (hidden) {
          setStyle(panel, 'transform', '');
          return;
        }

        const back = still ? 0 : easeOut(covered[i]);
        const shade = back * (panel.dataset.theme === 'dark' ? 0.55 : 0.4);

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
