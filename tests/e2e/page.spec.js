import { test, expect } from '@playwright/test';

const reduced = (testInfo) => testInfo.project.name === 'reduced-motion';
// Por debajo de 760px la navegación se pliega en el menú (css/layout.css)
const mobile = (page) => page.viewportSize().width <= 760;

/** Desplaza a `y` y espera a que el bucle de scroll y los muelles se asienten. */
async function scrollToY(page, y) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(120);
}

const maxScroll = (page) => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

/** Estado de los paneles tal y como los pinta el navegador. */
const panelState = (page) => page.evaluate(() => {
  const vh = window.innerHeight;
  const panels = [...document.querySelectorAll('.panel')];
  // Punto de muestreo lejos de cualquier borde: con tops fraccionarios el
  // navegador redondea el píxel y el borde exacto da un resultado ambiguo
  const edges = panels.flatMap((p) => { const r = p.getBoundingClientRect(); return [r.top, r.bottom]; });
  let probe = vh / 2;
  while (edges.some((e) => Math.abs(e - probe) < 2)) probe += 4;
  const hit = document.elementFromPoint(window.innerWidth / 2, probe)?.closest('.panel');
  return {
    onScreen: panels.filter((p) => {
      const r = p.getBoundingClientRect();
      return r.top < vh && r.bottom > 0 && getComputedStyle(p).opacity !== '0';
    }).length,
    hitIndex: panels.indexOf(hit),
    hitOpacity: hit ? getComputedStyle(hit).opacity : null,
    // El panel de mayor índice que cubre el centro debe ser el que se ve
    expected: panels.reduce((acc, p, i) => {
      const r = p.getBoundingClientRect();
      return r.top <= probe && r.bottom >= probe ? i : acc;
    }, -1),
  };
});

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.waitForLoadState('load');
});

test('carga sin errores de consola ni recursos rotos', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('response', (res) => res.status() >= 400 && errors.push(`${res.status()} ${res.url()}`));
  await page.reload();
  await page.waitForLoadState('load');

  // Recorre la página para forzar las imágenes diferidas
  const end = await maxScroll(page);
  for (let y = 0; y <= end; y += 600) await scrollToY(page, y);
  await scrollToY(page, end);

  const broken = await page.evaluate(async () => {
    const imgs = [...document.images];
    await Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
    return imgs.filter((img) => !img.naturalWidth).map((img) => img.getAttribute('src'));
  });
  expect(broken).toEqual([]);
  expect(errors).toEqual([]);
});

test('estructura y accesibilidad básicas', async ({ page }) => {
  const report = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
    return {
      h1: document.querySelectorAll('h1').length,
      duplicateIds: ids.filter((id, i) => ids.indexOf(id) !== i),
      missingAlt: [...document.images].filter((img) => !img.hasAttribute('alt')).map((img) => img.src),
      brokenLabels: [...document.querySelectorAll('[aria-labelledby]')]
        .filter((el) => !document.getElementById(el.getAttribute('aria-labelledby')))
        .map((el) => el.className),
      brokenAnchors: [...document.querySelectorAll('a[href^="#"]')]
        .filter((a) => !document.getElementById(a.getAttribute('href').slice(1)))
        .map((a) => a.getAttribute('href')),
      lang: document.documentElement.lang,
    };
  });
  expect(report).toEqual({ h1: 1, duplicateIds: [], missingAlt: [], brokenLabels: [], brokenAnchors: [], lang: 'es' });
});

test('las frases animadas conservan su texto para lectores de pantalla', async ({ page }) => {
  await expect(page.locator('.statement__text .sr-only')).toHaveText('La orilla es un espacio de encuentro. Entre la tierra y el mar, entre los residuos y la vida.');
  await expect(page.locator('.question__text .sr-only')).toHaveText('¿Cómo podemos limpiar la costa sin dejar de protegerla?');
  // Las palabras sueltas quedan fuera del árbol de accesibilidad
  await expect(page.locator('[data-words] .w').first()).toHaveAttribute('class', 'w');
  expect(await page.$$eval('[data-words] > [aria-hidden="true"]', (els) => els.length)).toBe(2);
});

test('no hay scroll horizontal', async ({ page }) => {
  const end = await maxScroll(page);
  for (let y = 0; y <= end; y += 900) {
    await scrollToY(page, y);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `y=${y}`).toBeLessThanOrEqual(0);
  }
});

test('la pila nunca acumula capas ni pinta un panel en el orden equivocado', async ({ page }) => {
  // Recorre la página entera a pasos de un tercio de pantalla: en WebKit y con
  // todos los proyectos en paralelo puede pasar del minuto y medio
  test.slow();
  const zIndex = await page.$$eval('.panel', (panels) => panels.map((p) => Number(getComputedStyle(p).zIndex)));
  expect(zIndex).toEqual(zIndex.map((_, i) => i + 1));

  const end = await maxScroll(page);
  const step = Math.round((await page.evaluate(() => window.innerHeight)) / 3);
  for (let y = 0; y <= end + step; y += step) {
    await scrollToY(page, Math.min(y, end));
    const state = await panelState(page);
    expect(state.onScreen, `y=${y}`).toBeLessThanOrEqual(3);
    expect(state.hitIndex, `y=${y}`).toBe(state.expected);
    expect(state.hitOpacity, `y=${y}`).toBe('1');
  }

  // Al final solo queda el cierre
  const last = await panelState(page);
  expect(last.onScreen).toBe(1);
});

test('el alto de referencia es 100svh y los paneles quedan fijados con él', async ({ page }) => {
  const { svh, tops } = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;height:100svh';
    document.body.append(probe);
    const svh = probe.offsetHeight;
    probe.remove();
    return {
      svh,
      tops: [...document.querySelectorAll('.panel')].map((p) => ({ top: parseFloat(p.style.top), h: parseFloat(getComputedStyle(p).height) })),
    };
  });
  for (const { top, h } of tops) expect(top).toBeCloseTo(Math.min(0, svh - h), 1);
});

test('las frases se iluminan palabra a palabra', async ({ page }, testInfo) => {
  const words = page.locator('.statement__text .w');
  if (reduced(testInfo)) {
    await expect(words.first()).toHaveCSS('opacity', '1');
    return;
  }
  const { offsetTop, offsetHeight } = await page.$eval('.statement', (el) => ({ offsetTop: el.offsetTop, offsetHeight: el.offsetHeight }));
  await scrollToY(page, offsetTop + offsetHeight * 0.6);
  const lit = await page.locator('.statement__text .w.is-lit').count();
  expect(lit).toBe(await words.count());
});

test('la escena de la herramienta llega al montaje final', async ({ page }, testInfo) => {
  const slides = page.locator('.tool__slide');
  if (reduced(testInfo)) {
    for (const slide of await slides.all()) await expect(slide).toBeVisible();
    return;
  }
  const { offsetTop, offsetHeight } = await page.$eval('.tool', (el) => ({ offsetTop: el.offsetTop, offsetHeight: el.offsetHeight }));
  const vh = await page.evaluate(() => window.innerHeight);
  await scrollToY(page, offsetTop + offsetHeight - vh);
  // El muelle tarda unos frames en alcanzar el final
  const progress = () => page.$eval('[data-progress]', (el) => parseFloat(el.style.transform.match(/scaleX\(([\d.]+)\)/)[1]));
  await expect.poll(progress, { timeout: 15_000 }).toBeGreaterThan(0.99);
  await expect(slides.last()).toHaveCSS('opacity', '1');
  await expect(slides.first()).toBeHidden();
  await expect(page.locator('[data-part="final"]')).toHaveCSS('opacity', '1');
});

test('el ciclo recorre sus cinco etapas', async ({ page }, testInfo) => {
  const nodes = page.locator('[data-node]');
  if (reduced(testInfo)) {
    await expect(page.locator('[data-outro]')).toBeVisible();
    return;
  }
  const { offsetTop, offsetHeight } = await page.$eval('.cycle', (el) => ({ offsetTop: el.offsetTop, offsetHeight: el.offsetHeight }));
  const vh = await page.evaluate(() => window.innerHeight);
  await scrollToY(page, offsetTop + offsetHeight - vh);
  await page.waitForTimeout(800);
  await expect(nodes).toHaveCount(5);
  for (const node of await nodes.all()) await expect(node).toHaveClass(/is-on/);
  await expect(page.locator('[data-caption].is-on')).toHaveText('Y vuelta a la playa.');
  await expect(page.locator('[data-motto].is-on')).toHaveCount(3);
});

test('los bloques se revelan al entrar en pantalla', async ({ page }) => {
  const heading = page.locator('#materials-title');
  await expect(heading).not.toHaveClass(/is-in/);
  const top = await page.$eval('.materials', (el) => el.offsetTop);
  await scrollToY(page, top);
  await expect(heading).toHaveClass(/is-in/);
});

test('la navegación lleva a cada sección y cambia de tema', async ({ page }, testInfo) => {
  const nav = page.locator('#nav');
  const toggle = page.locator('#nav-toggle');
  // Posiciones naturales, medidas antes de que ningún panel se fije
  const targets = await page.$$eval('.panel', (panels) => Object.fromEntries(panels.map((p) => [p.id, p.offsetTop])));

  for (const id of ['herramienta', 'materiales', 'origen']) {
    if (mobile(page)) {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    }
    await page.locator(`.nav__links a[href="#${id}"]`).click();
    if (mobile(page)) await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // Tolerancia de 1px por el redondeo de offsets fraccionarios
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 15_000 }).toBeGreaterThanOrEqual(targets[id] - 1);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - targets[id])).toBeLessThanOrEqual(1);

    const theme = await page.$eval(`#${id}`, (el) => el.dataset.theme);
    await expect(nav).toHaveClass(theme === 'dark' ? /is-dark/ : /^(?!.*is-dark)/);
  }
});

test('el menú móvil se cierra con Escape', async ({ page }, testInfo) => {
  test.skip(!mobile(page), 'solo móvil');
  const toggle = page.locator('#nav-toggle');
  await toggle.click();
  await expect(page.locator('.nav__links a').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.nav__links a').first()).toBeHidden();
});

test('la portada cabe en pantalla con su botón y el producto', async ({ page }) => {
  await page.waitForTimeout(1500);
  const { btn, visual, vh } = await page.evaluate(() => ({
    btn: document.querySelector('.hero .btn').getBoundingClientRect().toJSON(),
    visual: document.querySelector('.hero__visual img').getBoundingClientRect().toJSON(),
    vh: window.innerHeight,
  }));
  expect(btn.bottom).toBeLessThanOrEqual(vh);
  // Al menos la mitad del render del producto a la vista
  expect(Math.min(visual.bottom, vh) - visual.top).toBeGreaterThan(visual.height / 2);
});

test('el ciclo no se sale de la pantalla ni se monta sobre el texto', async ({ page }, testInfo) => {
  test.skip(reduced(testInfo), 'sin escena fija');
  const { offsetTop, offsetHeight } = await page.$eval('.cycle', (el) => ({ offsetTop: el.offsetTop, offsetHeight: el.offsetHeight }));
  const vh = await page.evaluate(() => window.innerHeight);
  await scrollToY(page, offsetTop + offsetHeight - vh);
  await expect.poll(() => page.$eval('[data-outro]', (el) => getComputedStyle(el).opacity), { timeout: 15_000 }).toBe('1');

  const report = await page.evaluate(() => {
    const box = (el) => el.getBoundingClientRect();
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const labels = [...document.querySelectorAll('.ring__nodes span')];
    const text = [...document.querySelectorAll('.cycle__title, .cycle__motto, .cycle__outro')];
    return {
      outside: labels.filter((l) => box(l).left < 0 || box(l).right > window.innerWidth || box(l).bottom > window.innerHeight).map((l) => l.textContent),
      overlaps: labels.flatMap((l) => text.filter((t) => hit(box(l), box(t))).map((t) => `${l.textContent} / ${t.className}`)),
    };
  });
  expect(report).toEqual({ outside: [], overlaps: [] });
});

test('el botón de portada baja a la orilla', async ({ page }) => {
  await page.locator('.hero .btn').click();
  const target = await page.$eval('#orilla', (el) => el.offsetTop);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 15_000 }).toBe(target);
});

test('con movimiento reducido no hay transformaciones de pila', async ({ page }, testInfo) => {
  test.skip(!reduced(testInfo), 'solo movimiento reducido');
  const end = await maxScroll(page);
  for (let y = 0; y <= end; y += 700) {
    await scrollToY(page, y);
    const transforms = await page.$$eval('.panel', (panels) => panels.map((p) => p.style.transform).filter(Boolean));
    expect(transforms, `y=${y}`).toEqual([]);
  }
});

test('el símbolo de la tortuga se ve entero en todas partes', async ({ page }) => {
  const selector = 'img[src*="turtle-"], img[src*="wordmark-"]';
  // Posición de cada imagen con la página arriba, antes de que nada se fije
  const targets = await page.$$eval(selector, (imgs) => imgs.map((img) => {
    img.loading = 'eager';
    const panel = img.closest('.panel');
    if (!panel) return 0;
    const top = panel.offsetTop;
    const inner = img.getBoundingClientRect().top - panel.getBoundingClientRect().top;
    const room = Math.max(0, panel.offsetHeight - window.innerHeight);
    // Centra la imagen sin salir del tramo en el que su panel está fijo y entero
    return top + Math.min(room, Math.max(0, inner - window.innerHeight / 2));
  }));
  // Tres símbolos sueltos y cuatro logotipos
  expect(targets).toHaveLength(7);

  for (const [i, y] of targets.entries()) {
    await scrollToY(page, y);
    const { src, edgeAlpha, ratio, clippedBy } = await page.evaluate(async ([sel, n]) => {
      const img = document.querySelectorAll(sel)[n];
      await img.decode().catch(() => null);

      // El dibujo no toca ningún borde del archivo: si lo hiciera, estaría recortado
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { width: w, height: h } = c;
      const edges = [[0, 0, w, 1], [0, h - 1, w, 1], [0, 0, 1, h], [w - 1, 0, 1, h]];
      const edgeAlpha = Math.max(...edges.map(([x, y, ew, eh]) => {
        const d = ctx.getImageData(x, y, ew, eh).data;
        let max = 0;
        for (let k = 3; k < d.length; k += 4) max = Math.max(max, d[k]);
        return max;
      }));

      // Se pinta con su proporción y ningún contenedor con overflow lo corta
      const r = img.getBoundingClientRect();
      const visible = r.width > 0 && r.height > 0;
      const ratio = visible ? (r.width / r.height) / (img.naturalWidth / img.naturalHeight) : 1;
      const clippedBy = [];
      for (let el = img.parentElement; visible && el && el !== document.body; el = el.parentElement) {
        const s = getComputedStyle(el);
        if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
        const b = el.getBoundingClientRect();
        if (r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1) clippedBy.push(el.className);
      }
      return { src: img.getAttribute('src'), edgeAlpha, ratio, clippedBy };
    }, [selector, i]);

    expect(edgeAlpha, src).toBeLessThan(8);
    // Margen para el redondeo de los iconos pequeños
    expect(Math.abs(ratio - 1), src).toBeLessThan(0.04);
    expect(clippedBy, src).toEqual([]);
  }
});

test('los materiales muestran sus tres muestras con foto', async ({ page }) => {
  const cards = page.locator('.material');
  await expect(cards).toHaveCount(3);
  await expect(cards.locator('h3')).toHaveText(['PEAD + Residuo marino', 'Lana', 'Filtro de celulosa']);
  await expect(page.locator('.materials')).not.toContainText('Plástico recuperado');
  await expect(cards.nth(2)).toContainText('liofilización');

  const top = await page.$eval('.materials', (el) => el.offsetTop);
  await scrollToY(page, top);
  const report = await page.evaluate(async () => {
    const cards = [...document.querySelectorAll('.material')];
    const imgs = cards.map((c) => c.querySelector('img.material__texture'));
    for (const img of imgs) img.loading = 'eager';
    await Promise.all(imgs.map((img) => img?.decode().catch(() => null)));
    return cards.map((card, i) => {
      // Medidas de maquetación: la animación de entrada desplaza las tarjetas
      const box = { left: card.offsetLeft, top: card.offsetTop, width: card.offsetWidth, height: card.offsetHeight };
      const copy = card.querySelector('.material__copy');
      const img = imgs[i];
      return {
        src: img.getAttribute('src'),
        loaded: img.naturalWidth > 0,
        fit: getComputedStyle(img).objectFit,
        // La foto llena la tarjeta y el texto cabe dentro
        fills: img.offsetWidth === box.width && img.offsetHeight === box.height,
        copyInside: copy.offsetTop >= 0 && copy.offsetTop + copy.offsetHeight <= box.height + 1, // 1 px de redondeo
        box,
      };
    });
  });

  expect(report.map((r) => r.src)).toEqual([
    'assets/img/material-pead.webp',
    'assets/img/material-wool.webp',
    'assets/img/material-cellulose.webp',
  ]);
  for (const r of report) expect(r).toMatchObject({ loaded: true, fit: 'cover', fills: true, copyInside: true });

  // La lana a la derecha del PEAD y la celulosa a la derecha de la lana (escritorio),
  // apilada bajo la lana junto a un PEAD de doble altura (tablet) o lado a lado bajo el PEAD (móvil)
  const [pead, wool, cell] = report.map((r) => r.box);
  const width = page.viewportSize().width;
  if (width > 760) {
    expect(wool.top).toBe(pead.top);
    expect(wool.left).toBeGreaterThan(pead.left);
  }
  if (width > 1100) {
    expect(cell.top).toBe(wool.top);
    expect(cell.left).toBeGreaterThan(wool.left);
  } else if (width > 760) {
    expect(cell.top).toBeGreaterThan(wool.top);
    expect(cell.left).toBe(wool.left);
    expect(pead.top + pead.height).toBe(cell.top + cell.height);
  } else {
    expect(wool.left).toBe(pead.left);
    expect(wool.top).toBeGreaterThan(pead.top + pead.height);
    expect(cell.top).toBe(wool.top);
    expect(cell.left).toBeGreaterThan(wool.left);
    expect(Math.abs(cell.left + cell.width - (pead.left + pead.width))).toBeLessThanOrEqual(1);
  }
});
