// Las fotografías a sangre se acercan un poco mientras su panel entra.

import { panelIndex, panelTop } from '../core/layout.js';
import { clamp, easeOut, lerp } from '../core/math.js';
import { reducedMotion } from '../core/motion.js';
import { setStyle, clearStyles } from '../core/style.js';

export function initDrift() {
  const items = [...document.querySelectorAll('[data-drift]')].map((media) => ({
    index: panelIndex(media),
    img: media.querySelector('img'),
  }));

  return {
    update({ y, vh }) {
      if (reducedMotion()) return;
      items.forEach(({ index, img }) => {
        const top = panelTop(index, y);
        if (top > vh) return;
        const p = clamp(1 - top / vh);
        const scale = lerp(1.16, 1.03, easeOut(p));
        setStyle(img, 'transform', `translate3d(0, ${((1 - p) * -6).toFixed(2)}%, 0) scale(${scale.toFixed(4)})`);
      });
    },
    reset: () => clearStyles(items.map((item) => item.img)),
  };
}
