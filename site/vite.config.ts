// The demo's build. `pnpm build` and `pnpm dev` run Vite with site/ as the working folder, so
// the paths below are relative to it. GitHub Pages serves the repository under
// /mp-t3-code-themes/, and the committed theme files reach the output through .site-public/,
// which those commands fill. The site imports only its own modules and src/catalog.ts, so this
// file is a plain object rather than a call to vite-plus's defineConfig.

const config = {
  base: "/mp-t3-code-themes/",
  publicDir: "../.site-public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
};

export default config;
