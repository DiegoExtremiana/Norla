import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom } from './dom.js';

setupDom({ heights: [800] });
const frames = [];
globalThis.requestAnimationFrame = (cb) => frames.push(cb);
let clock = 1000;
globalThis.performance = { now: () => clock };

const { addTask, invalidate } = await import('../../js/core/loop.js');
const { measure } = await import('../../js/core/layout.js');
measure();

const seen = [];
let busy = 0;
addTask({ update: (frame) => { seen.push(frame); return busy-- > 0; } });

/** Ejecuta el siguiente frame pendiente con la marca de tiempo dada. */
const runFrame = (now) => frames.shift()(now);

/** Deja el bucle parado antes de cada caso. */
function settle() {
  busy = 0;
  while (frames.length) runFrame((clock += 16));
}

test('dt nunca es negativo aunque la marca del frame sea anterior', () => {
  settle();
  invalidate();
  // Firefox: el frame lleva una marca anterior al performance.now() de requestFrame
  runFrame(clock - 30);
  assert.equal(seen.at(-1).dt, 0);
});

test('dt se limita a 50 ms tras una pausa larga', () => {
  settle();
  busy = 2;
  invalidate();
  runFrame((clock += 16));
  runFrame((clock += 16));
  runFrame((clock += 5000));
  assert.ok(Math.abs(seen.at(-2).dt - 0.016) < 1e-9);
  assert.equal(seen.at(-1).dt, 0.05);
});

test('el bucle se detiene cuando nada se mueve', () => {
  settle();
  invalidate();
  // invalidate repinta una vez aunque el scroll no cambie; después se para
  runFrame((clock += 16));
  runFrame((clock += 16));
  assert.equal(frames.length, 0);
});
