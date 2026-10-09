// Escena fija dentro de un panel alto: convierte el scroll en un progreso
// 0–1 suavizado con un muelle y se lo pasa a `render` junto al tiempo (s).
// Si `render` devuelve true, la escena sigue pidiendo frames (animación
// ambiental mientras está fijada en pantalla).

import { panelHeight, panelIndex, panelTop } from '../core/layout.js';
import { range } from '../core/math.js';
import { createSpring, reducedMotion } from '../core/motion.js';

export function createScene(el, render) {
  const index = panelIndex(el);
  const spring = createSpring(0.14);
  let time = 0;

  return {
    update({ y, vh, dt }) {
      if (reducedMotion()) return false;
      time += dt;
      const target = range(-panelTop(index, y), 0, panelHeight(index) - vh);
      const alive = render(spring.update(target, dt), time) === true && target > 0 && target < 1;
      return alive || !spring.isAt(target);
    },
  };
}
