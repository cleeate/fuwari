// prepare-content.mjs — build step for the Fuwari Hugo port.
//
// The original repo's demo posts are kept byte-identical (src/content is never
// modified). This step copies src/content to .hugo/content and:
//  1. Drops src/content/config.ts (an Astro file, not content — Hugo would
//     otherwise publish it as /config.ts).
//  2. Counts words/reading time exactly like Fuwari (remark-reading-time:
//     mdast toString + reading-time over the tree parsed with GFM, math and
//     directives) and writes `words:`/`minutes:` into each post's frontmatter,
//     because Hugo's .WordCount counts the pre-rendered Expressive Code HTML
//     (line numbers, badges) instead of the raw markdown text.
//  3. Applies Astro's smartypants (remark-smartypants) and pre-renders KaTeX
//     math (rehype-katex replacement) by splicing the transformed text back
//     into the markdown at the mdast nodes' source offsets, so code fences,
//     directives and everything else stay byte-identical. Hugo's Goldmark
//     typographer is disabled (hugo.toml) because its dash rules differ from
//     Astro's (`--` -> en dash, `---` -> em dash) while Astro's are
//     (`--` -> em dash, `---` untouched).
//  4. Pre-renders every fenced code block with Expressive Code (the exact same
//     engine + config Fuwari uses, see astro.config.mjs) and replaces the fence
//     with the rendered HTML. Hugo's Goldmark cannot parse Expressive Code's
//     fence attributes (e.g. ```js {1, 4, 7-8}), so the blocks are rendered
//     here, where the EC meta string is parsed natively. The replacement HTML
//     is a raw HTML block, which Goldmark passes through unchanged.
//
// Usage: node scripts/prepare-content.mjs   (run by `pnpm build` / `pnpm dev`)

import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import githubDarkTheme from "shiki/dist/themes/github-dark.mjs";
import { ExpressiveCodeEngine, ExpressiveCodeTheme, definePlugin } from "@expressive-code/core";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import { pluginTextMarkers } from "@expressive-code/plugin-text-markers";
import { pluginFrames } from "@expressive-code/plugin-frames";
import { pluginShiki } from "@expressive-code/plugin-shiki";
import { toHtml } from "hast-util-to-html";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkGithubAdmonitions from "remark-github-admonitions-to-directives";
import remarkDirective from "remark-directive";
import remarkSmartypants from "remark-smartypants";
import { toString } from "mdast-util-to-string";
import getReadingTime from "reading-time";
import katex from "katex";
import { visit } from "unist-util-visit";

const SRC = "src/content";
const DST = ".hugo/content";

rmSync(".hugo/content", { recursive: true, force: true });
cpSync(SRC, DST, { recursive: true });
rmSync(join(DST, "config.ts"), { force: true });

// --- Expressive Code engine (same config as astro.config.mjs) ---
function pluginCustomCopyButton() {
  return definePlugin({
    name: "Custom Copy Button",
    hooks: {
      postprocessRenderedBlock: (context) => {
        function processCodeBlock(node) {
          const copyButton = {
            type: "element", tagName: "button",
            properties: { className: ["copy-btn"], "aria-label": "Copy code" },
            children: [{
              type: "element", tagName: "div",
              properties: { className: ["copy-btn-icon"] },
              children: [
                { type: "element", tagName: "svg", properties: { viewBox: "0 -960 960 960", xmlns: "http://www.w3.org/2000/svg", className: ["copy-btn-icon", "copy-icon"] },
                  children: [{ type: "element", tagName: "path", properties: { d: "M368.37-237.37q-34.48 0-58.74-24.26-24.26-24.26-24.26-58.74v-474.26q0-34.48 24.26-58.74 24.26-24.26 58.74-24.26h378.26q34.48 0 58.74 24.26 24.26 24.26 24.26 58.74v474.26q0 34.48-24.26 58.74-24.26 24.26-58.74 24.26H368.37Zm0-83h378.26v-474.26H368.37v474.26Zm-155 238q-34.48 0-58.74-24.26-24.26-24.26-24.26-58.74v-515.76q0-17.45 11.96-29.48 11.97-12.02 29.33-12.02t29.54 12.02q12.17 12.03 12.17 29.48v515.76h419.76q17.45 0 29.48 11.96 12.02 11.97 12.02 29.33t-12.02 29.54q-12.03 12.17-29.48 12.17H213.37Zm155-238v-474.26 474.26Z" }, children: [] }] },
                { type: "element", tagName: "svg", properties: { viewBox: "0 -960 960 960", xmlns: "http://www.w3.org/2000/svg", className: ["copy-btn-icon", "success-icon"] },
                  children: [{ type: "element", tagName: "path", properties: { d: "m389-377.13 294.7-294.7q12.58-12.67 29.52-12.67 16.93 0 29.61 12.67 12.67 12.68 12.67 29.53 0 16.86-12.28 29.14L419.07-288.41q-12.59 12.67-29.52 12.67-16.94 0-29.62-12.67L217.41-430.93q-12.67-12.68-12.79-29.45-.12-16.77 12.55-29.45 12.68-12.67 29.62-12.67 16.93 0 29.28 12.67L389-377.13Z" }, children: [] }] },
              ],
            }],
          };
          if (!node.children) node.children = [];
          node.children.push(copyButton);
        }
        function traverse(node) {
          if (node.type === "element" && node.tagName === "pre") { processCodeBlock(node); return; }
          if (node.children) for (const child of node.children) if (child.type === "element") traverse(child);
        }
        traverse(context.renderData.blockAst);
      },
    },
  });
}
function pluginLanguageBadge() {
  return definePlugin({
    name: "Language Badge",
    baseStyles: () => `[data-language]::before{position:absolute;z-index:2;right:0.5rem;top:0.5rem;padding:0.1rem 0.5rem;content:attr(data-language);font-family:"JetBrains Mono Variable",ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;font-size:0.75rem;font-weight:bold;text-transform:uppercase;color:oklch(0.75 0.1 var(--hue));background:oklch(0.33 0.035 var(--hue));border-radius:0.5rem;pointer-events:none;transition:opacity 0.3s;opacity:0}.frame:not(.has-title):not(.is-terminal){@media (hover:none){& [data-language]::before{opacity:1;margin-right:3rem}& [data-language]:active::before{opacity:0}}@media (hover:hover){& [data-language]::before{opacity:1}&:hover [data-language]::before{opacity:0}}}`,
  });
}

const theme = new ExpressiveCodeTheme(githubDarkTheme);
const engine = new ExpressiveCodeEngine({
  themes: [theme, theme],
  plugins: [
    pluginCollapsibleSections(),
    pluginLineNumbers(),
    pluginTextMarkers(),
    pluginFrames({ showCopyToClipboardButton: false }),
    pluginShiki(),
    pluginLanguageBadge(),
    pluginCustomCopyButton(),
  ],
  defaultProps: {
    wrap: true,
    overridesByLang: { shellsession: { showLineNumbers: false } },
  },
  styleOverrides: {
    codeBackground: "var(--codeblock-bg)",
    borderRadius: "0.75rem",
    borderColor: "none",
    codeFontSize: "0.875rem",
    codeFontFamily:
      "'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    codeLineHeight: "1.5rem",
    frames: {
      editorBackground: "var(--codeblock-bg)",
      terminalBackground: "var(--codeblock-bg)",
      terminalTitlebarBackground: "var(--codeblock-topbar-bg)",
      editorTabBarBackground: "var(--codeblock-topbar-bg)",
      editorActiveTabBackground: "none",
      editorActiveTabIndicatorBottomColor: "var(--primary)",
      editorActiveTabIndicatorTopColor: "none",
      editorTabBarBorderBottomColor: "var(--codeblock-topbar-bg)",
      terminalTitlebarBorderBottomColor: "none",
    },
    textMarkers: { delHue: 0, insHue: 180, markHue: 250 },
  },
});

// --- Markdown tree processing: word count, smartypants, KaTeX, indented code ---
// Parses the body with the same remark setup Fuwari uses (GFM + math +
// GitHub admonitions + directives), then:
//  * words/minutes: mdast-util-to-string + reading-time (== remark-reading-time)
//  * smartypants: remark-smartypants mutates text nodes in place; the changed
//    nodes are spliced back into the source at their recorded offsets.
//  * KaTeX: math/inlineMath nodes are rendered with the repo's katex (same
//    version rehype-katex used) and spliced in as raw HTML.
//  * indented code blocks: remark-expressive-code renders them as EC frames
//    too (plaintext); fenced blocks are handled later by renderCodeBlocks.
// Directives are parsed before smartypants runs, so e.g. the straight quotes
// in ::github{repo="..."} are attributes, not text, and survive untouched.
const mdProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkGithubAdmonitions)
  .use(remarkDirective);

function processMarkdownBody(body, isPost) {
  return processMarkdownBodyAsync(body, isPost);
}

async function processMarkdownBodyAsync(body, isPost) {
  const tree = mdProcessor.parse(body);
  let words = 0;
  let minutes = 1;
  if (isPost) {
    const rt = getReadingTime(toString(tree));
    words = rt.words;
    minutes = Math.max(1, Math.round(rt.minutes));
  }
  // Record text-node spans before smartypants mutates them.
  const textSpans = [];
  visit(tree, "text", (node) => {
    if (node.position) {
      textSpans.push({
        start: node.position.start.offset,
        end: node.position.end.offset,
        value: node.value,
      });
    }
  });
  // KaTeX edits (positions are unaffected by smartypants: math nodes hold no text).
  const edits = [];
  visit(tree, ["math", "inlineMath"], (node) => {
    if (!node.position) return;
    let html = katex.renderToString(node.value, {
      displayMode: node.type === "math",
      throwOnError: false,
    });
    if (node.type === "math") {
      // Display math: split the outer span so its opening tag sits alone on a
      // line — Goldmark then treats the whole block as raw HTML (type 7) and
      // neither wraps it in <p> nor strips backslashes from the annotation.
      html = html
        .replace(/^<span class="katex-display">/, '<span class="katex-display">\n')
        .replace(/<\/span>$/, "\n</span>");
    } else {
      // Inline math lives inside a paragraph, where Goldmark strips backslashes
      // before escapable punctuation (e.g. \; -> ;). Entity-encode them: the
      // browser renders &#92; as \, and they only occur in the TeX annotation.
      html = html.replaceAll("\\", "&#92;");
    }
    edits.push({ start: node.position.start.offset, end: node.position.end.offset, replacement: html });
  });
  // Indented code blocks (plaintext EC frames). Fenced blocks start with ```
  // or ~~~ at the node position; indented ones start with the code itself.
  const indentedJobs = [];
  visit(tree, "code", (node) => {
    if (!node.position) return;
    const head = body.slice(node.position.start.offset, node.position.start.offset + 3);
    if (head === "```" || head === "~~~") return;
    indentedJobs.push({ start: node.position.start.offset, end: node.position.end.offset, code: node.value });
  });
  for (const job of indentedJobs) {
    const html = await renderEcBlock("plaintext", "", job.code);
    edits.push({ start: job.start, end: job.end, replacement: html });
  }
  // Apply smartypants, then diff the recorded text spans.
  unified().use(remarkSmartypants).runSync(tree);
  const after = new Map();
  visit(tree, "text", (node) => {
    if (node.position) after.set(node.position.start.offset, node.value);
  });
  for (const span of textSpans) {
    const next = after.get(span.start);
    if (next !== undefined && next !== span.value) {
      edits.push({ start: span.start, end: span.end, replacement: next });
    }
  }
  // Apply edits from the end backwards so earlier offsets stay valid.
  edits.sort((a, b) => b.start - a.start);
  let out = body;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  return { body: out, words, minutes };
}

// Render one code block with the real Expressive Code engine, as Fuwari does.
async function renderEcBlock(lang, meta, code) {
  const { renderedGroupAst } = await engine.render({ code, language: lang, meta });
  let html = toHtml(renderedGroupAst);
  // The EC client runtime (collapsible sections); the EC stylesheet is in
  // the main CSS bundle, so no per-block <link> is needed (unlike Astro).
  html = html.replace(
    '<div class="expressive-code">',
    '<div class="expressive-code"><script type="module" src="/js/ec.js"></script>',
  );
  return html;
}

// --- Fence parsing: find fenced code blocks (handles nested fences by length) ---
function renderCodeBlocks(md, file) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  const jobs = [];
  while (i < lines.length) {
    const line = lines[i];
    const open = line.match(/^( {0,3})(`{3,}|~{3,})\s*(\S[^`~]*)?$/);
    if (open && !open[3]?.includes("`")) {
      const fenceChar = open[2][0];
      const fenceLen = open[2].length;
      const info = (open[3] || "").trim();
      // Expressive Code renders unlabeled fences and `text` fences as
      // plaintext (data-language="plaintext"), like astro-expressive-code.
      let lang = info.split(/\s+/)[0] || "plaintext";
      if (lang === "text") lang = "plaintext";
      const meta = info.slice(info.split(/\s+/)[0]?.length || 0).trim();
      // Collect code lines until a closing fence (>= length, same char, info-less).
      const codeLines = [];
      let j = i + 1;
      let closed = false;
      while (j < lines.length) {
        const close = lines[j].match(/^( {0,3})(`{3,}|~{3,})\s*$/);
        if (close && close[2][0] === fenceChar && close[2].length >= fenceLen) {
          closed = true;
          break;
        }
        codeLines.push(lines[j]);
        j++;
      }
      if (!closed) {
        // Unterminated fence — leave it as-is.
        out.push(line);
        i++;
        continue;
      }
      const code = codeLines.join("\n");
      const idx = jobs.length;
      jobs.push({ lang, meta, code, file });
      out.push(`\u0000ECBLOCK${idx}\u0000`);
      i = j + 1;
    } else {
      out.push(line);
      i++;
    }
  }
  return { text: out.join("\n"), jobs };
}

async function processFile(path) {
  const src = readFileSync(path, "utf8");
  // Word count / smartypants / KaTeX on the original markdown, before the
  // code fences are replaced with HTML.
  const fm = src.match(/^---\n([\s\S]*?)\n---\n/);
  const isPost = path.includes("/posts/");
  let md = src;
  if (fm) {
    const body = src.slice(fm[0].length);
    const { body: newBody, words, minutes } = await processMarkdownBody(body, isPost);
    md = isPost
      ? `---\n${fm[1]}\nwords: ${words}\nminutes: ${minutes}\n---\n${newBody}`
      : `---\n${fm[1]}\n---\n${newBody}`;
  }
  const { text, jobs } = renderCodeBlocks(md, path);
  if (jobs.length === 0) {
    if (md !== src) writeFileSync(path, md);
    return 0;
  }
  const rendered = [];
  for (const job of jobs) {
    rendered.push(await renderEcBlock(job.lang, job.meta, job.code));
  }
  let out = text;
  rendered.forEach((html, idx) => {
    out = out.replace(`\u0000ECBLOCK${idx}\u0000`, `\n${html}\n`);
  });
  writeFileSync(path, out);
  return jobs.length;
}

let total = 0;
async function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await walk(p);
    else if (entry.name.endsWith(".md")) total += await processFile(p);
  }
}
await walk(DST);
console.log(`prepare-content: ${SRC} -> ${DST} (config.ts dropped, ${total} code blocks pre-rendered with Expressive Code)`);
