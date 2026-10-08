// 04 Ciclo: playa → residuo → recogida → transformación → N’Orla → playa.

import { range, smooth } from '../core/math.js';
import { clearStyles, setStyle } from '../core/style.js';
import { createScene } from './scene.js';

const CENTER = 300;
const RADIUS = 230;
const STAGES = 5;

export function initCycleScene() {
  const section = document.querySelector('.cycle');
  if (!section) return null;

  const fill = section.querySelector('[data-ring-fill]');
  const head = section.querySelector('[data-ring-head]');
  const nodes = [...section.querySelectorAll('[data-node]')];
  const captions = [...section.querySelectorAll('[data-caption]')];
  const motto = [...section.querySelectorAll('[data-motto]')];
  const outro = section.querySelector('[data-outro]');

  function render(p) {
    const k = range(p, 0.06, 0.84);
    setStyle(fill, 'strokeDashoffset', (1 - k).toFixed(4));

    const angle = -Math.PI / 2 + k * Math.PI * 2;
    head.setAttribute('cx', (CENTER + Math.cos(angle) * RADIUS).toFixed(2));
    head.setAttribute('cy', (CENTER + Math.sin(angle) * RADIUS).toFixed(2));
    setStyle(head, 'opacity', (range(p, 0.02, 0.06) * (1 - range(k, 0.97, 1))).toFixed(3));

    nodes.forEach((node, i) => node.classList.toggle('is-on', p > 0.04 && k >= i / STAGES - 0.002));

    let caption = -1;
    if (p >= 0.04) caption = k >= 0.995 ? STAGES : Math.min(STAGES - 1, Math.floor(k * STAGES + 0.002));
    captions.forEach((el, i) => el.classList.toggle('is-on', i === caption));
    nodes.forEach((node, i) => node.classList.toggle('is-current', i === caption % STAGES));

    // Recoger, transformar y volver a utilizar se encienden con su etapa
    [0.4, 0.6, 0.8].forEach((at, i) => motto[i].classList.toggle('is-on', k >= at));

    const o = smooth(range(p, 0.88, 0.95));
    setStyle(outro, 'opacity', o.toFixed(3));
    setStyle(outro, 'transform', `translate3d(0, ${((1 - o) * 10).toFixed(1)}px, 0)`);
  }

  return {
    ...createScene(section, render),
    reset: () => clearStyles(fill, head, outro),
  };
}
