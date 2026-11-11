// build-css.mjs — builds the single CSS bundle for the Fuwari Hugo port.
//
// The original site's CSS comes from many places (Tailwind, src/styles,
// Stylus blocks in .astro/.svelte files, @fontsource, KaTeX, Expressive Code,
// PhotoSwipe, OverlayScrollbars). This script gathers them in the same order
// the Astro build emits them, concatenates them, and runs the Tailwind CLI
// (which resolves @apply, @layer and the typography plugin) into
// .hugo/static/css/main.css, served via the .hugo/static static dir.
//
// Usage: node scripts/build-css.mjs   (run by `pnpm build` / `pnpm dev`)

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const HUGO = join(ROOT, ".hugo");
const CSS = join(HUGO, "css");
const STATIC = join(HUGO, "static");
mkdirSync(CSS, { recursive: true });
mkdirSync(join(STATIC, "css"), { recursive: true });
mkdirSync(join(STATIC, "fonts"), { recursive: true });
mkdirSync(join(STATIC, "katex", "fonts"), { recursive: true });
mkdirSync(join(STATIC, "js"), { recursive: true });

const read = (p) => readFileSync(join(ROOT, p), "utf8");
const write = (p, s) => writeFileSync(join(HUGO, p), s);

// --- 1. Compile Stylus files (variables, markdown-extend, BackToTop, DisplaySettings) ---
function compileStylus(srcPath, outName) {
  const out = join(CSS, outName);
  execSync(`./node_modules/.bin/stylus "${srcPath}" --out "${out}" --compress`, { stdio: "pipe" });
  return read(join(".hugo", "css", outName));
}

const variablesCss = compileStylus("src/styles/variables.styl", "variables.css");
const markdownExtendCss = compileStylus("src/styles/markdown-extend.styl", "markdown-extend.css");
// The BackToTop / DisplaySettings stylus blocks used to live inside their
// .astro/.svelte components; they now live in src/styles/ (the Astro and
// Svelte sources were removed).
const backToTopCss = compileStylus("src/styles/backtotop.styl", "backtotop.css");
const displaySettingsCss = compileStylus("src/styles/display-settings.styl", "display-settings.css");

// Plain <style> blocks: the Search input/panel rules and Layout's global
// banner rules. They used to live in Search.svelte / Layout.astro; they
// now live in src/styles/ (read as plain strings into the entry below).
const searchCss = read("src/styles/search.css");
const layoutBannerCss = read("src/styles/banner.css");

// --- 2. Fonts: rewrite @fontsource CSS urls to /fonts/<file>, copy the files ---
function vendorFontCss(cssPaths, urlPrefix, destDir) {
  let out = "";
  for (const p of cssPaths) {
    let css = read(p);
    css = css.replace(/url\(\.\/files\/([^)]+)\)/g, (m, f) => {
      const srcFile = join(ROOT, dirname(p), "files", f);
      if (existsSync(srcFile)) cpSync(srcFile, join(destDir, f));
      return `url(${urlPrefix}${f})`;
    });
    out += css + "\n";
  }
  return out;
}
const fontsCss = vendorFontCss(
  [
    "node_modules/@fontsource/roboto/400.css",
    "node_modules/@fontsource/roboto/500.css",
    "node_modules/@fontsource/roboto/700.css",
    "node_modules/@fontsource-variable/jetbrains-mono/index.css",
    "node_modules/@fontsource-variable/jetbrains-mono/wght-italic.css",
  ],
  "/fonts/",
  join(STATIC, "fonts"),
);

// --- 3. KaTeX CSS (rewrite font urls to /katex/fonts/), copy fonts ---
let katexCss = read("node_modules/katex/dist/katex.min.css");
katexCss = katexCss.replace(/url\(fonts\/([^)]+)\)/g, (m, f) => {
  const srcFile = join(ROOT, "node_modules/katex/dist/fonts", f);
  if (existsSync(srcFile)) cpSync(srcFile, join(STATIC, "katex", "fonts", f));
  return `url(/katex/fonts/${f})`;
});

// --- 3a. KaTeX JS (auto-render; the CSS is in the main bundle) ---
cpSync(join(ROOT, "node_modules/katex/dist/katex.min.js"), join(STATIC, "katex", "katex.min.js"));
cpSync(join(ROOT, "node_modules/katex/dist/contrib/auto-render.min.js"), join(STATIC, "katex", "auto-render.min.js"));

// --- 3b. Expressive Code client runtime (vendored) ---
// These two files are the client runtime + core CSS that Astro's build
// bundles from @expressive-code/core 0.41.4 (dist/_astro/ec.g1fg5.js and
// ec.4fsv9.css). They are committed under scripts/vendor/ because the
// Astro build output (dist/) is not part of this repo. If the
// @expressive-code version changes, re-vendor them from a fresh Astro build.
cpSync(join(ROOT, "scripts/vendor/ec-runtime.js"), join(STATIC, "js", "ec.js"));

// --- 4. Expressive Code core CSS (vendored) ---
const ecCoreCss = read("scripts/vendor/ec-core.css");

// --- 5. OverlayScrollbars + PhotoSwipe CSS ---
const overlayCss = read("node_modules/overlayscrollbars/styles/overlayscrollbars.css");
const photoswipeCss = read("node_modules/photoswipe/dist/photoswipe.css");

// --- 6. Assemble the entry (order mirrors the Astro build's output) ---
const entry = [
  "/* fonts */",
  fontsCss,
  "@tailwind base;",
  read("src/styles/main.css"),
  "@tailwind utilities;",
  read("src/styles/expressive-code.css"),
  searchCss,
  layoutBannerCss,
  read("src/styles/markdown.css"),
  read("src/styles/transition.css"),
  read("src/styles/scrollbar.css"),
  read("src/styles/photoswipe.css"),
  variablesCss,
  markdownExtendCss,
  backToTopCss,
  displaySettingsCss,
  overlayCss,
  photoswipeCss,
  katexCss,
  ecCoreCss,
].join("\n");

write("css/entry.css", entry);

// --- 7. Run the Tailwind CLI ---
execSync(
  `./node_modules/.bin/tailwindcss -i .hugo/css/entry.css -o .hugo/static/css/main.css --config tailwind.config.cjs --postcss postcss.config.cjs --minify`,
  { stdio: "inherit" },
);
console.log("build-css: .hugo/static/css/main.css written");
