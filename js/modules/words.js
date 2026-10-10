// Frases que se iluminan palabra a palabra mientras su panel está fijo.

import { panelHeight, panelIndex, panelTop } from '../core/layout.js';
import { range } from '../core/math.js';

export function initWords() {
  const blocks = [...document.querySelectorAll('[data-words]')].map((el) => {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    // aria-label no se anuncia en un <p>: el texto accesible va aparte
    el.innerHTML = `<span class="sr-only">${text}</span><span aria-hidden="true">${text
      .split(' ')
      .map((word) => `<span class="w">${word}</span>`)
      .join(' ')}</span>`;

    return { index: panelIndex(el), words: [...el.querySelectorAll('.w')], lit: -1 };
  });

  return {
    update({ y, vh }) {
      blocks.forEach((block) => {
        const top = panelTop(block.index, y);
        const p = range(-top, -vh * 0.35, (panelHeight(block.index) - vh) * 0.75);
        const lit = Math.round(p * block.words.length);
        if (lit === block.lit) return;
        block.lit = lit;
        block.words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
      });
    },
  };
}
