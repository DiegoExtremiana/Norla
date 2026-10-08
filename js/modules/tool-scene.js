// 02 Herramienta: despiece → cribar → filtrar → montaje.
//
// Las piezas (part-*.webp) están recortadas del render del despiece, así que
// en su sitio coinciden con él. Eso permite cambiar el despiece por las
// piezas sin que se note, moverlas y fundir encima el render final.

import { bump, easeInOut, easeOut, lerp, range, smooth } from '../core/math.js';
import { clearStyles, setStyle } from '../core/style.js';
import { createScene } from './scene.js';

// Desplazamiento (% del lienzo) de cada pieza hasta su posición montada
const TARGET = {
  handle: { x: 0, y: 2.3 },
  frame: { x: -0.5, y: 1.5 },
  mesh: { x: 23.5, y: -2 },
  plate: { x: -21, y: 14.5 },
};

// Posición de las etiquetas (% del lienzo) en el despiece y montado
const CALLOUT = {
  mesh: { exploded: [22, 70], assembled: [40, 92] },
  plate: { exploded: [72, 52], assembled: [76, 74] },
};

// [entra desde, entra hasta, sale desde, sale hasta]
const SLIDES = [
  [-0.2, -0.1, 0.14, 0.18],
  [0.18, 0.22, 0.37, 0.41],
  [0.41, 0.45, 0.6, 0.64],
  [0.7, 0.76, 1.5, 1.6],
];

export function initToolScene() {
  const section = document.querySelector('.tool');
  if (!section) return null;

  const model = section.querySelector('[data-model]');
  const parts = Object.fromEntries([...model.querySelectorAll('[data-part]')].map((el) => [el.dataset.part, el]));
  const callouts = Object.fromEntries([...model.querySelectorAll('[data-callout]')].map((el) => [el.dataset.callout, el]));
  const slides = [...section.querySelectorAll('[data-slide]')];
  const progress = section.querySelector('[data-progress]');

  function renderSlides(p) {
    slides.forEach((el, i) => {
      const [a, b, c, d] = SLIDES[i];
      const o = bump(p, a, b, c, d);
      const y = p < b ? (1 - o) * 24 : -(1 - o) * 24;
      setStyle(el, 'opacity', o.toFixed(3));
      setStyle(el, 'transform', `translate3d(0, ${y.toFixed(1)}px, 0)`);
      setStyle(el, 'visibility', o > 0.001 ? 'visible' : 'hidden');
    });
  }

  function placePart(name, travel, opacity) {
    const { x, y } = TARGET[name];
    const transform = travel > 0 ? `translate3d(${(x * travel).toFixed(2)}%, ${(y * travel).toFixed(2)}%, 0)` : '';
    setStyle(parts[name], 'transform', transform);
    setStyle(parts[name], 'opacity', opacity.toFixed(3));
  }

  function placeCallout(name, opacity, assembled) {
    const el = callouts[name];
    const [left, top] = CALLOUT[name][assembled ? 'assembled' : 'exploded'];
    setStyle(el, 'opacity', opacity.toFixed(3));
    setStyle(el, 'left', `${left}%`);
    setStyle(el, 'top', `${top}%`);
    setStyle(el, 'transform', `translate(-50%, -50%) scale(${lerp(0.9, 1, opacity).toFixed(3)})`);
  }

  function render(p) {
    renderSlides(p);

    // Foco en cada sistema: el despiece se atenúa y la pieza queda encendida
    const focusMesh = smooth(bump(p, 0.17, 0.23, 0.37, 0.42));
    const focusPlate = smooth(bump(p, 0.4, 0.46, 0.6, 0.65));
    const focus = Math.max(focusMesh, focusPlate);

    // Montaje
    const swap = smooth(range(p, 0.64, 0.68));
    const t = range(p, 0.66, 0.92);
    const partsOut = smooth(range(t, 0.62, 0.98));
    const assembled = smooth(range(t, 0.55, 1));

    setStyle(parts.exploded, 'opacity', ((1 - focus * 0.78) * (1 - swap)).toFixed(3));

    const visible = (own) => Math.max(own, swap) * (1 - partsOut);
    placePart('handle', easeInOut(range(t, 0, 0.62)), visible(0));
    placePart('frame', easeInOut(range(t, 0, 0.62)), visible(0));
    placePart('mesh', easeInOut(range(t, 0.1, 0.76)), visible(focusMesh));
    placePart('plate', easeInOut(range(t, 0.18, 0.86)), visible(focusPlate));

    const blur = assembled > 0 && assembled < 1 ? `blur(${((1 - assembled) * 8).toFixed(2)}px)` : 'none';
    setStyle(parts.final, 'opacity', assembled.toFixed(3));
    setStyle(parts.final, 'filter', blur);
    setStyle(parts.final, 'transform', `scale(${lerp(1.03, 1, assembled).toFixed(4)})`);

    const enter = easeOut(range(p, 0, 0.1));
    const closeUp = smooth(range(p, 0.9, 1));
    setStyle(model, 'transform', `scale(${(lerp(0.94, 1, enter) * lerp(1, 1.04, closeUp)).toFixed(4)})`);

    const done = smooth(range(p, 0.92, 0.97));
    placeCallout('mesh', Math.max(focusMesh, done), done > 0);
    placeCallout('plate', Math.max(focusPlate, done), done > 0);

    setStyle(progress, 'transform', `scaleX(${p.toFixed(4)})`);
  }

  return {
    ...createScene(section, render),
    reset: () => clearStyles(model, Object.values(parts), Object.values(callouts), slides, progress),
  };
}
