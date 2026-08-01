import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173/word-runner-web/";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "tmp/playwright-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: "tmp/playwright-report", open: "never" }]]
    : "line",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "phone-360",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 640 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "phone-390",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: "npm run preview",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
