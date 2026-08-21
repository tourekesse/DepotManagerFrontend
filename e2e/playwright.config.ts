import { defineConfig } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  testDir: "./",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.APP_URL || "https://depotmanager.gm-soft.ca",
    viewport: { width: 1280, height: 720 },
    locale: "fr-FR",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    // Enregistrement video HD 1280x720. Le dossier de sortie est controle par
    // l'option `outputDir` ci-dessous. Chaque spec produit videos/<timestamp>/demo.webm
    actionTimeout: 15_000,
  },
  reporter: [
    ["list"],
    [
      "html",
      { outputFolder: "playwright-report", open: "never" },
    ],
  ],
  outputDir: "test-results",
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        contextOptions: { reducedMotion: "reduce" },
        video: { mode: "on", size: { width: 1280, height: 720 } },
      },
    },
  ],
});