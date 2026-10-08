// Anillos irregulares con un corte, inspirados en las líneas de la huella del
// símbolo. Se dibujan con stroke-dashoffset al entrar en pantalla.

import { observeReveal } from './reveal.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 400;

function seededRandom(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function ringPath(cx, cy, rx, ry, start, sweep, random) {
  const steps = 28;
  const phase = [random() * Math.PI * 2, random() * Math.PI * 2];
  const points = [];

  for (let i = 0; i <= steps; i++) {
    const t = start + (sweep * i) / steps;
    const wobble = 1 + 0.035 * Math.sin(t * 3 + phase[0]) + 0.02 * Math.sin(t * 5 + phase[1]);
    points.push([cx + Math.cos(t) * rx * wobble, cy + Math.sin(t) * ry * wobble]);
  }

  // Catmull-Rom a Bézier cúbica
  const f = (n) => n.toFixed(1);
  let d = `M${f(points[0][0])},${f(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

function buildRidges(host, seed) {
  const rings = Number(host.dataset.ridges) || 8;
  const random = seededRandom(seed);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);

  for (let k = 0; k < rings; k++) {
    const r = 28 + (k * 168) / Math.max(1, rings - 1);
    const gap = 0.35 + random() * 0.5;
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', ringPath(SIZE / 2, SIZE / 2, r * 0.86, r, random() * Math.PI * 2, Math.PI * 2 - gap, random));
    path.style.setProperty('--i', String(k));
    svg.appendChild(path);
  }

  host.appendChild(svg);
  svg.querySelectorAll('path').forEach((path) => {
    path.style.setProperty('--len', String(Math.ceil(path.getTotalLength())));
  });
  observeReveal(host);
}

export function initRidges() {
  document.querySelectorAll('[data-ridges]').forEach((host, i) => buildRidges(host, 97 + i * 31));
}
