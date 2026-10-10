const query = window.matchMedia('(prefers-reduced-motion: reduce)');

export const reducedMotion = () => query.matches;

export function onReducedMotionChange(callback) {
  query.addEventListener?.('change', () => callback(query.matches));
}

/**
 * Muelle críticamente amortiguado: persigue al objetivo sin rebote y
 * parte siempre del valor actual, por lo que se puede interrumpir.
 */
export function createSpring(response = 0.14) {
  let value = null;

  return {
    update(target, dt) {
      if (value === null) value = target;
      if (dt > 0) value += (target - value) * (1 - Math.exp((-dt / response) * 2.5));
      if (Math.abs(target - value) < 0.0002) value = target;
      return value;
    },
    isAt: (target) => value === target,
  };
}
