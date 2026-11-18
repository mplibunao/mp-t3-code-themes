import { defineConfig, devices } from "@playwright/test";

// The browser tests run against the built site in dist/, under the path GitHub Pages serves it
// from. Run `pnpm build` first; `just ci` does. Playwright starts the preview server, stops it when
// the run ends, and fails rather than reuse a server already on the port.
const PORT = 4174;
const BASE_URL = `http://127.0.0.1:${PORT}/mp-t3-code-themes/`;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: Boolean(process.env["CI"]),
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: BASE_URL,
    viewport: { width: 960, height: 640 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium" }],
  webServer: {
    command: `pnpm exec vp preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    cwd: "site",
    url: BASE_URL,
    reuseExistingServer: false,
  },
});
