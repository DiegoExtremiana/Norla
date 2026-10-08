// Geometría de la pila de paneles. Las posiciones se calculan a partir del
// scroll en lugar de leer getBoundingClientRect en cada frame.

export const panels = [...document.querySelectorAll('.panel')];

const geo = { vh: window.innerHeight, offsets: [], heights: [], pins: [], end: 0 };

export const viewportHeight = () => geo.vh;
export const panelHeight = (i) => geo.heights[i];
export const panelOffset = (i) => geo.offsets[i];
export const panelIndex = (el) => panels.indexOf(el.closest('.panel'));

export function measure() {
  geo.vh = window.innerHeight;
  let acc = panels[0]?.parentElement.offsetTop ?? 0;

  panels.forEach((panel, i) => {
    const h = panel.offsetHeight;
    geo.offsets[i] = acc;
    geo.heights[i] = h;
    // Se queda fijo cuando su borde inferior llega al de la pantalla
    geo.pins[i] = Math.min(0, geo.vh - h);
    acc += h;

    panel.style.top = `${geo.pins[i]}px`;
    panel.style.transformOrigin = `50% ${Math.max(h - geo.vh / 2, h / 2)}px`;
  });

  geo.end = acc;
}

/** Posición en pantalla del borde superior del panel `i` (equivale a sticky). */
export function panelTop(i, y = window.scrollY) {
  const natural = geo.offsets[i] - y;
  const pinned = Math.max(natural, geo.pins[i]);
  return Math.min(pinned, geo.end - y - geo.heights[i]);
}
