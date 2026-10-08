/*!
 * N’Orla — Donde la vida anida
 * Idea y proyecto (TFG): Diana Extremiana
 * Desarrollo web: Diego Extremiana
 */

import { measure } from './core/layout.js';
import { addTask, invalidate } from './core/loop.js';
import { onReducedMotionChange } from './core/motion.js';
import { initReveal } from './modules/reveal.js';
import { initRidges } from './modules/ridges.js';
import { initNav } from './modules/nav.js';
import { initStack } from './modules/stack.js';
import { initWords } from './modules/words.js';
import { initHero } from './modules/hero.js';
import { initDrift } from './modules/drift.js';
import { initToolScene } from './modules/tool-scene.js';
import { initCycleScene } from './modules/cycle-scene.js';

measure();
initReveal();
initRidges();

const tasks = [
  initStack(),
  initNav(),
  initWords(),
  initHero(),
  initDrift(),
  initToolScene(),
  initCycleScene(),
].filter(Boolean);

tasks.forEach(addTask);

function relayout() {
  measure();
  invalidate();
}

window.addEventListener('resize', relayout);
window.addEventListener('load', relayout);
new ResizeObserver(relayout).observe(document.querySelector('.stack'));

onReducedMotionChange((reduced) => {
  if (reduced) tasks.forEach((task) => task.reset?.());
  relayout();
});

invalidate();
