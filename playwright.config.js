import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Navegadores reales instalados en el equipo: se prueban si existen
const BRAVE = [
  'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/usr/bin/brave-browser',
].find(existsSync);
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].some(existsSync);

const desktop = { viewport: { width: 1440, height: 900 } };

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
  },
  webServer: {
    command: 'node tests/server.js',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
    env: { PORT: String(PORT) },
  },
  projects: [
    // Safari (WebKit)
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'iphone-se', use: { ...devices['iPhone SE'] } },
    { name: 'ipad', use: { ...devices['iPad (gen 7)'] } },
    { name: 'safari-desktop', use: { ...devices['Desktop Safari'], ...desktop } },

    // Chrome y derivados (Chromium)
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'android-landscape', use: { ...devices['Pixel 7 landscape'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...desktop } },

    // Firefox (Gecko): sin emulación móvil, solo el tamaño
    { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'], ...desktop } },
    { name: 'firefox-narrow', use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 } } },

    { name: 'reduced-motion', use: { ...devices['iPhone 13'], reducedMotion: 'reduce' } },

    ...(CHROME ? [
      { name: 'chrome-real', use: { ...devices['Pixel 7'], channel: 'chrome' } },
    ] : []),
    ...(BRAVE ? [
      { name: 'brave-real', use: { ...devices['Pixel 7'], launchOptions: { executablePath: BRAVE } } },
      { name: 'brave-real-desktop', use: { ...devices['Desktop Chrome'], ...desktop, launchOptions: { executablePath: BRAVE } } },
    ] : []),
  ],
});
