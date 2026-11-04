import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  // The multiplayer journey needs two browser contexts and runs once, not per viewport.
  projects: [
    {
      name: 'multiplayer',
      testMatch: /multiplayer\.spec\.ts/,
      use: {
        viewport: { width: 1280, height: 800 },
        launchOptions: {
          // Use real local addresses instead of mDNS names so two headless contexts can reach each other.
          args: ['--disable-features=WebRtcHideLocalIpsWithMdns'],
        },
      },
    },
    {
      name: 'phone-portrait',
      testIgnore: /multiplayer\.spec\.ts/,
      use: {
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'phone-landscape',
      testIgnore: /multiplayer\.spec\.ts/,
      use: {
        viewport: { width: 844, height: 390 },
      },
    },
    {
      name: 'tablet-portrait',
      testIgnore: /multiplayer\.spec\.ts/,
      use: {
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'desktop',
      testIgnore: /multiplayer\.spec\.ts/,
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000,
  },
});
