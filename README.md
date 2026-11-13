# 🍥Fuwari
![Node.js >= 20](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen) 
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue) 

> **Hugo port.** This fork is [Fuwari](https://github.com/saicaca/fuwari) by [saicaca](https://github.com/saicaca), ported from Astro to [Hugo](https://gohugo.io/) — same layout, same demo content, same behavior. The Astro source was removed; this repo is Hugo-only. The Hugo version lives in `layouts/`, `hugo.toml` and `src/js/main.js` (see `scripts/` for the build helpers).
>
> [**🖥️ Live Demo (GitHub Pages)**](https://cleeate.github.io/fuwari/)

A static blog template, ported from Astro to [Hugo](https://gohugo.io/).

![Preview Image](https://raw.githubusercontent.com/saicaca/resource/main/fuwari/home.png)

🌏 README in
[**中文**](https://github.com/cleeate/fuwari/blob/main/docs/README.zh-CN.md) /
**English**

## ✨ Features

- [x] Built with [Hugo](https://gohugo.io/) and [Tailwind CSS](https://tailwindcss.com)
- [x] Smooth animations and page transitions
- [x] Light / dark mode
- [x] Customizable theme colors & banner
- [x] Responsive design
- [x] Search functionality with [Pagefind](https://pagefind.app/)
- [x] [Markdown extended features](#-markdown-extended-syntax)
- [x] Table of contents
- [x] RSS feed

## 🚀 Getting Started

1. Create your blog repository:
    - [Generate a new repository](https://github.com/cleeate/fuwari/generate) from this template or fork this repository.
2. Clone your repository and install dependencies:
    ```sh
    pnpm install
    ```
    - Install [pnpm](https://pnpm.io) with `npm install -g pnpm` if you haven't.
3. Edit **`hugo.toml`** to customize your blog: site `title`, `baseURL`, `[params.profile]` (name / avatar / bio / links), `[params.navbarLinks]` (nav items and dropdown children), theme hue, etc.
4. Create a post with `pnpm new-post <filename>`, then edit the file under **`src/content/posts/`**.
5. Deploy to Vercel, Netlify, GitHub Pages, etc. following [the Hugo guides](https://gohugo.io/hosting-and-deployment/). Build with `pnpm build` (outputs to **`public/`**). **Set `baseURL` in `hugo.toml` to your real domain before deploying.**

> Note: Hugo does not read `src/content/` directly. `scripts/prepare-content.mjs` copies it to `.hugo/content` (dropping `config.ts` and pre-rendering code blocks) as part of `pnpm dev` / `pnpm build`. To run `hugo` by hand, run `pnpm prepare-content` first.

## 📝 Frontmatter of Posts

```yaml
---
title: My First Blog Post
published: 2023-09-09
description: This is the first post of my new Hugo blog.
image: ./cover.jpg
tags: [Foo, Bar]
category: Front-end
draft: false
lang: jp      # Set only if the post's language differs from the site's language in hugo.toml
---
```

`published` maps to Hugo's `date` and `updated` to `lastmod`, per `[frontmatter]` in `hugo.toml`.

## 🧩 Markdown Extended Syntax

In addition to Hugo's built-in support for [GitHub Flavored Markdown](https://github.github.com/gfm/), several extra Markdown features are included:

- Admonitions ([Preview and Usage](https://cleeate.github.io/fuwari/posts/markdown-extended/#admonitions))
- GitHub repository cards ([Preview and Usage](https://cleeate.github.io/fuwari/posts/markdown-extended/#github-repository-cards))
- Enhanced code blocks with Expressive Code ([Preview](https://cleeate.github.io/fuwari/posts/expressive-code/) / [Docs](https://expressive-code.com/))

## ⚡ Commands

All commands are run from the root of the project, from a terminal:

| Command                        | Action                                                              |
|:-------------------------------|:--------------------------------------------------------------------|
| `pnpm install`                 | Installs dependencies                                               |
| `pnpm dev`                     | Starts the local dev server at `localhost:1313`                     |
| `pnpm build`                   | Builds the production site to `./public/` (Hugo + Pagefind)         |
| `pnpm new-post <filename>`     | Creates a new post under `src/content/posts/`                       |
| `pnpm prepare-content`         | Copies `src/content` → `.hugo/content` (run before a bare `hugo`)    |
| `pnpm build-css`               | Builds the Tailwind CSS bundle                                      |

> This is a Hugo project: there is no `astro check`, `pnpm preview`, or `./dist/` output. The dev server is Hugo's (`1313`), the build output is `public/`, and JS/CSS are bundled by `scripts/` (Node 20+, pnpm 9+).

## ✏️ Contributing

Check out the [Contributing Guide](https://github.com/cleeate/fuwari/blob/main/CONTRIBUTING.md) for details on how to contribute to this project.

## 📄 License

This project is licensed under the MIT License.
