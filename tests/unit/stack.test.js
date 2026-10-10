import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom } from './dom.js';

// Doce paneles como la página, uno de ellos alto (escena)
const VH = 800;
const COUNT = 12;
const { panels } = setupDom({
  heights: Array.from({ length: COUNT }, (_, i) => (i === 3 ? VH * 5 : VH)),
  themes: Array.from({ length: COUNT }, (_, i) => (i % 2 ? 'dark' : 'light')),
  vh: VH,
});
const layout = await import('../../js/core/layout.js');
const { initStack } = await import('../../js/modules/stack.js');
layout.measure();
const stack = initStack();

const end = layout.panelOffset(COUNT - 1) + layout.panelHeight(COUNT - 1) - VH;
let scroll = 0;
const at = (y) => stack.update({ y: (scroll = y), vh: VH });
// Paneles pintados en pantalla (los que aún están por debajo no cuentan)
const shown = () => panels.filter((p, i) => p.style.opacity !== '0' && layout.panelTop(i, scroll) < VH);

test('al final de la página no se acumulan paneles visibles', () => {
  at(end);
  assert.deepEqual(shown(), [panels[COUNT - 1]]);
});

test('en ningún punto del recorrido hay más de tres paneles visibles', () => {
  for (let y = 0; y <= end; y += 37) {
    at(y);
    assert.ok(shown().length <= 3, `y=${y}: ${shown().length} visibles`);
  }
});

test('nunca oculta un panel que está en pantalla y sin tapar', () => {
  for (let y = 0; y <= end; y += 37) {
    at(y);
    panels.forEach((panel, i) => {
      const top = layout.panelTop(i, y);
      const nextTop = i + 1 < COUNT ? layout.panelTop(i + 1, y) : Infinity;
      const onScreen = top < VH && top + layout.panelHeight(i) > 0;
      if (onScreen && nextTop > 1) assert.notEqual(panel.style.opacity, '0', `y=${y} panel ${i}`);
    });
  }
});

test('mantiene visible el panel de detrás mientras el de delante retrocede', () => {
  // El 1 tapa al 0 y el 2 entra a medias: el 1 encoge y deja ver el 0
  at(VH * 1.5);
  assert.notEqual(panels[0].style.opacity, '0');
  assert.match(panels[1].style.transform, /^scale\(0\.9/);
});

test('el panel oculto no conserva transform ni bucles', () => {
  at(end);
  for (const panel of panels.slice(0, -1)) {
    assert.equal(panel.style.transform, '');
    assert.equal(panel.classList.contains('is-playing'), false);
  }
  assert.ok(panels[COUNT - 1].classList.contains('is-playing'));
});

test('redondea con las mismas variables que lee el CSS', () => {
  at(VH / 2);
  assert.notEqual(panels[1].style['--ra'], '0px');
  assert.notEqual(panels[0].style['--rb'], '0.0px');
});
