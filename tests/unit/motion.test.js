import { test } from 'node:test';
import assert from 'node:assert/strict';

let reduced = false;
globalThis.window = { matchMedia: () => ({ get matches() { return reduced; }, addEventListener() {} }) };
const { createSpring, reducedMotion } = await import('../../js/core/motion.js');

test('reducedMotion refleja la media query', () => {
  reduced = true;
  assert.equal(reducedMotion(), true);
  reduced = false;
  assert.equal(reducedMotion(), false);
});

test('el muelle arranca en el primer objetivo', () => {
  const spring = createSpring();
  assert.equal(spring.update(0.4, 0.016), 0.4);
  assert.ok(spring.isAt(0.4));
});

test('el muelle converge sin rebasar el objetivo', () => {
  const spring = createSpring(0.14);
  spring.update(0, 0.016);
  let value = 0;
  for (let i = 0; i < 300 && !spring.isAt(1); i++) {
    const next = spring.update(1, 1 / 60);
    assert.ok(next >= value && next <= 1, `rebasa: ${next}`);
    value = next;
  }
  assert.ok(spring.isAt(1));
});

test('el muelle se puede interrumpir y parte del valor actual', () => {
  const spring = createSpring(0.14);
  spring.update(0, 0.016);
  const mid = spring.update(1, 0.05);
  const back = spring.update(0, 0.05);
  assert.ok(back < mid && back > 0);
});
