import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3333',
    screenshot: 'on',
  },
  webServer: {
    command: 'npx serve dist -p 3333 --no-clipboard',
    url: 'http://localhost:3333',
    reuseExistingServer: true,
    timeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } },
    },
  ],
});
