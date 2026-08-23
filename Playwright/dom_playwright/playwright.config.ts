import {defineConfig,devices,} from "@playwright/test";
import {BASE_URL,DEFAULT_TIMEOUT,DEFAULT_HEADLESS,} from "./config";

export default defineConfig({
  testDir: "./tests",

  fullyParallel: false,

  forbidOnly:!!process.env.CI,
  retries:process.env.CI? 2: 0,
  workers:process.env.CI? 1: undefined,
  reporter: "html",
  timeout:DEFAULT_TIMEOUT,
  use: {
    baseURL:BASE_URL,
    headless:DEFAULT_HEADLESS,
    trace:"on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
})