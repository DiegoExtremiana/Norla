// Escena fija dentro de un panel alto: convierte el scroll en un progreso
// 0–1 suavizado con un muelle y se lo pasa a `render`.

import { panelHeight, panelIndex, panelTop } from '../core/layout.js';
import { range } from '../core/math.js';
import { createSpring, reducedMotion } from '../core/motion.js';

export function createScene(el, render) {
  const index = panelIndex(el);
  const spring = createSpring(0.14);

  return {
    update({ y, vh, dt }) {
      if (reducedMotion()) return false;
      const target = range(-panelTop(index, y), 0, panelHeight(index) - vh);
      render(spring.update(target, dt));
      return !spring.isAt(target);
    },
  };
}
