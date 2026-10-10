import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bump, clamp, easeInOut, easeOut, lerp, range, smooth } from '../../js/core/math.js';

test('clamp limita a [0, 1] por defecto y a cualquier rango', () => {
  assert.equal(clamp(-1), 0);
  assert.equal(clamp(2), 1);
  assert.equal(clamp(0.3), 0.3);
  assert.equal(clamp(15, 0, 10), 10);
});

test('lerp interpola entre extremos', () => {
  assert.equal(lerp(10, 20, 0), 10);
  assert.equal(lerp(10, 20, 1), 20);
  assert.equal(lerp(10, 20, 0.5), 15);
});

test('range normaliza y satura fuera del intervalo', () => {
  assert.equal(range(5, 0, 10), 0.5);
  assert.equal(range(-5, 0, 10), 0);
  assert.equal(range(50, 0, 10), 1);
});

test('bump sube, se mantiene y baja', () => {
  assert.equal(bump(0, 0.1, 0.2, 0.8, 0.9), 0);
  assert.equal(bump(0.5, 0.1, 0.2, 0.8, 0.9), 1);
  assert.equal(bump(1, 0.1, 0.2, 0.8, 0.9), 0);
  assert.ok(Math.abs(bump(0.15, 0.1, 0.2, 0.8, 0.9) - 0.5) < 1e-9);
});

test('las curvas de easing fijan 0 y 1 y son monótonas', () => {
  for (const ease of [smooth, easeOut, easeInOut]) {
    assert.equal(ease(0), 0);
    assert.ok(Math.abs(ease(1) - 1) < 1e-12);
    let prev = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      assert.ok(ease(t) >= prev, `${ease.name} decrece en ${t}`);
      prev = ease(t);
    }
  }
});
