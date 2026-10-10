// DOM falso mínimo para importar los módulos del sitio en Node.

export function fakeElement(props = {}) {
  const classes = new Set();
  const attrs = {};
  const style = {};
  Object.defineProperty(style, 'setProperty', { value(name, value) { this[name] = value; }, configurable: true });

  return {
    style,
    dataset: {},
    classList: {
      toggle(name, force) {
        const on = force ?? !classes.has(name);
        if (on) classes.add(name);
        else classes.delete(name);
        return on;
      },
      contains: (name) => classes.has(name),
      add: (name) => classes.add(name),
    },
    setAttribute(name, value) { attrs[name] = String(value); },
    removeAttribute(name) {
      delete attrs[name];
      if (name === 'style') Object.keys(style).forEach((k) => delete style[k]);
    },
    getAttribute: (name) => attrs[name] ?? null,
    ...props,
  };
}

/**
 * Prepara `window` y `document` con una pila de paneles de las alturas dadas.
 * `vh` es el alto estable (100svh) que mide la sonda de layout.js e
 * `innerHeight` el alto real, que en móvil cambia con la barra de direcciones.
 */
export function setupDom({ heights, themes = [], vh = 800, innerHeight = vh, stackTop = 0, reduced = false }) {
  const stack = { offsetTop: stackTop };
  const panels = heights.map((h, i) => fakeElement({
    offsetHeight: h,
    parentElement: stack,
    dataset: { theme: themes[i] ?? 'light' },
  }));
  panels.forEach((panel) => { panel.closest = () => panel; });

  globalThis.window = {
    innerHeight,
    scrollY: 0,
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    addEventListener() {},
  };
  globalThis.getComputedStyle = (el) => ({ height: `${el.offsetHeight}px` });
  globalThis.document = {
    querySelectorAll: (sel) => (sel === '.panel' ? panels : []),
    createElement: () => fakeElement({ offsetHeight: vh }),
    body: { append() {} },
  };
  return { panels };
}
