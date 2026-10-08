import { clamp, range, smooth } from '../core/math.js';
import { reducedMotion } from '../core/motion.js';
import { setStyle, clearStyles } from '../core/style.js';

export function initHero() {
  const copy = document.querySelector('[data-hero-copy]');
  const visual = document.querySelector('[data-hero-visual]');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.documentElement.classList.add('is-loaded'));
  });

  return {
    update({ y, vh }) {
      if (reducedMotion() || y > vh * 1.2) return;
      const p = clamp(y / vh);
      // El texto sale antes y más rápido que el producto
      setStyle(copy, 'transform', p ? `translate3d(0, ${(-p * 90).toFixed(1)}px, 0)` : '');
      setStyle(copy, 'opacity', (1 - smooth(range(p, 0, 0.55))).toFixed(3));
      setStyle(visual, 'transform', p ? `translate3d(0, ${(-p * 30).toFixed(1)}px, 0) scale(${(1 + p * 0.05).toFixed(4)})` : '');
    },
    reset: () => clearStyles(copy, visual),
  };
}
