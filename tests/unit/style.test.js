import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearStyles, setStyle } from '../../js/core/style.js';
import { fakeElement } from './dom.js';

test('setStyle escribe propiedades y variables CSS', () => {
  const el = fakeElement();
  setStyle(el, 'opacity', '0.5');
  setStyle(el, '--shade', '0.2');
  assert.equal(el.style.opacity, '0.5');
  assert.equal(el.style['--shade'], '0.2');
});

test('setStyle no vuelve a escribir un valor igual', () => {
  const el = fakeElement();
  let writes = 0;
  Object.defineProperty(el.style, 'setProperty', { value: () => writes++ });
  setStyle(el, '--x', '1');
  setStyle(el, '--x', '1');
  setStyle(el, '--x', '2');
  assert.equal(writes, 2);
});

test('clearStyles borra el estilo y la caché', () => {
  const el = fakeElement();
  setStyle(el, 'opacity', '0');
  clearStyles(el, null);
  assert.equal(el.style.opacity, undefined);
  setStyle(el, 'opacity', '0');
  assert.equal(el.style.opacity, '0');
});
