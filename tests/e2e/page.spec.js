import { test, expect } from '@playwright/test';

const reduced = (testInfo) => testInfo.project.name === 'reduced-motion';
const mobile = (testInfo) => testInfo.project.name !== 'desktop';

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
  const hit = document.elementFromPoint(window.innerWidth / 2, vh / 2)?.closest('.panel');
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
      return r.top <= vh / 2 && r.bottom >= vh / 2 ? i : acc;
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
  await expect.poll(progress, { timeout: 5000 }).toBeGreaterThan(0.99);
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
    if (mobile(testInfo)) {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    }
    await page.locator(`.nav__links a[href="#${id}"]`).click();
    if (mobile(testInfo)) await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // Tolerancia de 1px por el redondeo de offsets fraccionarios
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBeGreaterThanOrEqual(targets[id] - 1);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - targets[id])).toBeLessThanOrEqual(1);

    const theme = await page.$eval(`#${id}`, (el) => el.dataset.theme);
    await expect(nav).toHaveClass(theme === 'dark' ? /is-dark/ : /^(?!.*is-dark)/);
  }
});

test('el menú móvil se cierra con Escape', async ({ page }, testInfo) => {
  test.skip(!mobile(testInfo), 'solo móvil');
  const toggle = page.locator('#nav-toggle');
  await toggle.click();
  await expect(page.locator('.nav__links a').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.nav__links a').first()).toBeHidden();
});

test('el botón de portada baja a la orilla', async ({ page }) => {
  await page.locator('.hero .btn').click();
  const target = await page.$eval('#orilla', (el) => el.offsetTop);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 5000 }).toBe(target);
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
