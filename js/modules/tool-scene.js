// 02 Herramienta: despiece → cribar → filtrar → montaje.
//
// Las piezas (part-*.webp) están recortadas del render del despiece, así que
// juntas en su sitio lo reproducen exactamente. Cada una se mueve por su
// cuenta: flotan, se destacan con la cámara y viajan en arco hasta montarse.
// Al final un barrido de luz materializa el render del producto montado.

import { bump, easeInOut, easeOut, lerp, range, smooth } from '../core/math.js';
import { clearStyles, setStyle } from '../core/style.js';
import { createScene } from './scene.js';

// Todas las medidas en % del lienzo
const PARTS = {
  // Desplazamiento hasta la posición montada, elevación del arco, giro y
  // escala a mitad de viaje, y ventana de tiempo dentro del montaje. La
  // placa pasa por detrás y queda oculta tras la malla, como en el render.
  handle: { to: [0, 2.3], lift: 0, turn: 0, depth: 0, time: [0, 0.4] },
  frame: { to: [-0.5, 1.5], lift: 0, turn: 0, depth: 0, time: [0, 0.4] },
  mesh: { to: [23.5, -2], lift: 6, turn: -4, depth: 0.05, time: [0.22, 0.7] },
  plate: { to: [-21, 14.5], lift: 4, turn: 3, depth: -0.07, time: [0.46, 1], hides: true },
};

// Despiece "abierto" desde el que entran las piezas
const SCATTER = { handle: [0, -7], frame: [0, 6], mesh: [-7, 3], plate: [7, -4] };

// Flotación mientras está desmontada
const FLOAT = {
  handle: { phase: 0, sway: 0.5, swing: 0.25 },
  frame: { phase: 2.1, sway: 0.45, swing: 0 },
  mesh: { phase: 3.6, sway: 0.9, swing: 0.5 },
  plate: { phase: 5.2, sway: 0.9, swing: 0.5 },
};

// Centro de cada sistema: la cámara y el brillo se dirigen ahí
const FOCUS = {
  mesh: { at: [23, 82], glow: [233, 223, 207], zoom: 1.14, rise: 1.4 },
  plate: { at: [66, 58], glow: [0, 163, 166], zoom: 1.12, rise: 1.4 },
};
const SKY = [173, 224, 234];

// Posición de las etiquetas en el despiece y montado
const CALLOUT = {
  mesh: { exploded: [17, 63], assembled: [40, 92] },
  plate: { exploded: [82, 47], assembled: [76, 74] },
};

// [entra desde, entra hasta, sale desde, sale hasta]
const SLIDES = [
  [-0.2, -0.1, 0.14, 0.18],
  [0.18, 0.22, 0.37, 0.41],
  [0.41, 0.45, 0.6, 0.64],
  [0.8, 0.86, 1.5, 1.6],
];

const ASSEMBLY = [0.66, 0.84];
const WIPE = [0.825, 0.92];

const pct = (v) => `${v.toFixed(2)}%`;
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

export function initToolScene() {
  const section = document.querySelector('.tool');
  if (!section) return null;

  const model = section.querySelector('[data-model]');
  const glow = section.querySelector('[data-glow]');
  const glint = section.querySelector('[data-glint]');
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

  function placeCallout(name, opacity, assembled) {
    const el = callouts[name];
    const [left, top] = CALLOUT[name][assembled ? 'assembled' : 'exploded'];
    setStyle(el, 'opacity', opacity.toFixed(3));
    setStyle(el, 'left', `${left}%`);
    setStyle(el, 'top', `${top}%`);
    setStyle(el, 'transform', `translate(-50%, -50%) scale(${lerp(0.9, 1, opacity).toFixed(3)})`);
  }

  function render(p, time) {
    renderSlides(p);

    // Foco en cada sistema
    const focus = {
      mesh: smooth(bump(p, 0.17, 0.24, 0.36, 0.42)),
      plate: smooth(bump(p, 0.4, 0.47, 0.59, 0.65)),
    };
    const anyFocus = Math.max(focus.mesh, focus.plate);

    // Montaje: las piezas se separan un poco (anticipación) y viajan en orden
    const gather = smooth(range(p, 0.62, 0.7));
    const anticipation = bump(p, 0.62, 0.67, 0.67, 0.72) * 0.6;
    const t = range(p, ...ASSEMBLY);
    let thud = 0;

    const state = Object.fromEntries(Object.entries(PARTS).map(([name, part], i) => {
      // Entrada escalonada desde el despiece abierto
      const enter = easeOut(range(p, 0.01 + i * 0.015, 0.12 + i * 0.015));
      const [sx, sy] = SCATTER[name];

      // Flotación ambiental mientras está desmontada
      const { phase, sway, swing } = FLOAT[name];
      const fy = Math.sin(time * 0.9 + phase) * sway * (1 - gather);
      const fr = Math.sin(time * 0.6 + phase * 1.7) * swing * (1 - gather);

      // Viaje al sitio en arco
      const u = range(t, ...part.time);
      const s = easeInOut(u);
      const arc = Math.sin(Math.PI * s);
      const [tx, ty] = part.to;
      if (part.lift) thud = Math.max(thud, Math.sin(Math.PI * range(u, 0.86, 1)));

      // Destacado: la pieza enfocada se eleva, el resto se apaga
      const own = focus[name] ?? 0;
      const dim = Math.max(0, anyFocus - own);
      const rise = own * (FOCUS[name]?.rise ?? 0);

      const x = sx * (1 - enter) + tx * s + sx * anticipation * 0.15;
      const y = sy * (1 - enter) + ty * s - part.lift * arc + sy * anticipation * 0.15 + fy - rise;
      const rot = part.turn * arc + fr;
      const scale = (1 + part.depth * arc) * (1 + rise * 0.03) * lerp(0.96, 1, enter);

      return [name, {
        transform: `translate3d(${pct(x)}, ${pct(y)}, 0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`,
        alpha: lerp(0.5, 1, enter) * (part.hides ? 1 - smooth(range(u, 0.45, 0.95)) : 1),
        dim,
      }];
    }));

    Object.entries(state).forEach(([name, { transform, alpha, dim }]) => {
      const el = parts[name];
      setStyle(el, 'transform', transform);
      setStyle(el, 'opacity', (alpha * (1 - dim * 0.8)).toFixed(3));
      setStyle(el, 'filter', dim > 0.01 ? `blur(${(dim * 2.5).toFixed(2)}px) saturate(${(1 - dim * 0.6).toFixed(2)})` : 'none');
    });

    // Cámara: se acerca al sistema enfocado
    let cx = 0;
    let cy = 0;
    let zoom = 1;
    ['mesh', 'plate'].forEach((name) => {
      const { at, zoom: z } = FOCUS[name];
      const f = focus[name];
      cx += (50 - at[0]) * 0.45 * f;
      cy += (50 - at[1]) * 0.45 * f;
      zoom *= lerp(1, z, f);
    });
    const intro = easeOut(range(p, 0, 0.12));
    const closeUp = smooth(range(p, 0.9, 1));
    zoom *= lerp(0.94, 1, intro) * lerp(1, 1.04, closeUp) * (1 + thud * 0.01);
    setStyle(model, 'transform', `translate3d(${pct(cx)}, ${pct(cy + thud * 0.4)}, 0) scale(${zoom.toFixed(4)})`);

    // Brillo: sigue al foco y destella al encajar cada pieza
    const target = anyFocus > 0 ? (focus.mesh >= focus.plate ? FOCUS.mesh : FOCUS.plate) : null;
    const g = target ? mix([50, 50], target.at, anyFocus) : [50, 50];
    const color = target ? mix(SKY, target.glow, anyFocus) : SKY;
    setStyle(glow, 'transform', `translate3d(${pct((g[0] - 50) / 0.76)}, ${pct((g[1] - 50) / 0.76)}, 0) scale(${lerp(1, 0.55, anyFocus).toFixed(3)})`);
    setStyle(glow, '--glow', color.map(Math.round).join(', '));
    setStyle(glow, '--glow-a', (0.22 + anyFocus * 0.2 + thud * 0.25).toFixed(3));

    // Barrido de luz: de las piezas al render montado
    const wipe = easeInOut(range(p, ...WIPE));
    setStyle(model, '--w', pct(lerp(-16, 102, wipe)));
    setStyle(parts.final, 'opacity', p > WIPE[0] ? '1' : '0');
    setStyle(glint, 'opacity', bump(wipe, 0, 0.08, 0.8, 1).toFixed(3));

    const done = smooth(range(p, 0.93, 0.98));
    placeCallout('mesh', Math.max(focus.mesh, done), done > 0);
    placeCallout('plate', Math.max(focus.plate, done), done > 0);

    setStyle(progress, 'transform', `scaleX(${p.toFixed(4)})`);

    // Mientras está desmontada sigue flotando
    return gather < 1;
  }

  return {
    ...createScene(section, render),
    reset: () => clearStyles(model, glow, glint, Object.values(parts), Object.values(callouts), slides, progress),
  };
}
