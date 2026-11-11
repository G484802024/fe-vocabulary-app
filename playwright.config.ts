import { defineConfig, devices } from '@playwright/test';

const hostedUrl = process.env.FE_TEST_URL;
const localUrl = 'http://127.0.0.1:4178/fe-vocabulary-app/';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: hostedUrl ?? localUrl,
    launchOptions: process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: hostedUrl ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --port 4178 --base /fe-vocabulary-app/ --strictPort',
    url: localUrl,
    reuseExistingServer: !process.env.CI,
  },
});
