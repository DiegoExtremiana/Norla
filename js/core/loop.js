// Un único requestAnimationFrame para todo lo ligado al scroll. Solo corre
// mientras hay scroll o alguna animación sigue en marcha.

import { viewportHeight } from './layout.js';

const tasks = [];
let running = false;
let lastTime = 0;
let lastY = null;

export function addTask(task) {
  tasks.push(task);
}

export function requestFrame() {
  if (running) return;
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(tick);
}

/** Obliga a repintar todas las tareas aunque el scroll no haya cambiado. */
export function invalidate() {
  lastY = null;
  requestFrame();
}

function tick(now) {
  const frame = {
    y: window.scrollY,
    vh: viewportHeight(),
    dt: Math.min(0.05, (now - lastTime) / 1000),
  };
  lastTime = now;

  let busy = false;
  for (const task of tasks) {
    if (task.update(frame) === true) busy = true;
  }

  if (busy || frame.y !== lastY) {
    lastY = frame.y;
    requestAnimationFrame(tick);
  } else {
    running = false;
  }
}

window.addEventListener('scroll', requestFrame, { passive: true });
