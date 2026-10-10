// Geometría de la pila de paneles. Las posiciones se calculan a partir del
// scroll en lugar de leer getBoundingClientRect en cada frame.

export const panels = [...document.querySelectorAll('.panel')];

const geo = { vh: window.innerHeight, offsets: [], heights: [], pins: [], end: 0 };

export const viewportHeight = () => geo.vh;
export const panelHeight = (i) => geo.heights[i];
export const panelOffset = (i) => geo.offsets[i];
export const panelIndex = (el) => panels.indexOf(el.closest('.panel'));

// Alto de pantalla estable (100svh): en móvil innerHeight cambia al ocultarse
// la barra de direcciones y haría saltar los paneles fijados.
const probe = document.createElement('div');
probe.setAttribute('aria-hidden', 'true');
probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
document.body.append(probe);

export function measure() {
  geo.vh = probe.offsetHeight || window.innerHeight;
  let acc = panels[0]?.parentElement.offsetTop ?? 0;

  panels.forEach((panel, i) => {
    // Alto fraccionario y sin la escala de la pila: offsetHeight redondea y el
    // error se acumula panel a panel
    const h = parseFloat(getComputedStyle(panel).height) || panel.offsetHeight;
    geo.offsets[i] = acc;
    geo.heights[i] = h;
    // Se queda fijo cuando su borde inferior llega al de la pantalla
    geo.pins[i] = Math.min(0, geo.vh - h);
    acc += h;

    panel.style.top = `${geo.pins[i]}px`;
    // Orden explícito: WebKit duda con hermanos sticky transformados
    panel.style.zIndex = i + 1;
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
