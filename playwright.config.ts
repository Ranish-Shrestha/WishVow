import { defineConfig, devices } from "@playwright/test";

const port = process.env.WISHVOW_TEST_PORT ?? "3715";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  timeout: 200_000,
  expect: { timeout: 15_000 },
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"], viewport: { width: 320, height: 740 } },
    },
  ],
  webServer: {
    command: "node tests/e2e/start-server.mjs",
    url: baseURL,
    timeout: 200_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
});
