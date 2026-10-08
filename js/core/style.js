// Solo escribe en el DOM cuando el valor cambia.
const written = new WeakMap();

export function setStyle(el, prop, value) {
  let cache = written.get(el);
  if (!cache) written.set(el, (cache = {}));
  if (cache[prop] === value) return;
  cache[prop] = value;
  if (prop.startsWith('--')) el.style.setProperty(prop, value);
  else el.style[prop] = value;
}

export function clearStyles(...elements) {
  elements.flat().forEach((el) => {
    if (!el) return;
    el.removeAttribute('style');
    written.delete(el);
  });
}
