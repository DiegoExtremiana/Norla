import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
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
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'reduced-motion', use: { ...devices['iPhone 13'], reducedMotion: 'reduce' } },
  ],
});
