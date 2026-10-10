import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom } from './dom.js';

// innerHeight (barra de direcciones oculta) distinto del alto estable
const { panels } = setupDom({ heights: [800, 1600, 800], vh: 800, innerHeight: 900 });
const layout = await import('../../js/core/layout.js');
layout.measure();

test('usa el alto estable de la sonda, no innerHeight', () => {
  assert.equal(layout.viewportHeight(), 800);
});

test('fija cada panel cuando su borde inferior llega al de la pantalla', () => {
  assert.deepEqual(panels.map((p) => p.style.top), ['0px', '-800px', '0px']);
});

test('da a cada panel un z-index creciente', () => {
  assert.deepEqual(panels.map((p) => p.style.zIndex), [1, 2, 3]);
});

test('panelTop reproduce el comportamiento sticky', () => {
  // Antes de llegar: posición natural
  assert.equal(layout.panelTop(1, 0), 800);
  assert.equal(layout.panelTop(1, 400), 400);
  // Panel alto: sube hasta su pin y ahí se queda
  assert.equal(layout.panelTop(1, 1400), -600);
  assert.equal(layout.panelTop(1, 2000), -800);
  // El primero sigue fijo arriba hasta el final de la pila
  assert.equal(layout.panelTop(0, 2400), 0);
});

test('panelIndex y medidas', () => {
  assert.equal(layout.panelIndex(panels[2]), 2);
  assert.equal(layout.panelOffset(2), 2400);
  assert.equal(layout.panelHeight(1), 1600);
});
