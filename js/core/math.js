export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Posición normalizada (0–1) de `v` entre `a` y `b`. */
export const range = (v, a, b) => clamp((v - a) / (b - a));

/** Sube de a→b, se mantiene y baja de c→d. */
export const bump = (v, a, b, c, d) => Math.min(range(v, a, b), 1 - range(v, c, d));

export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
