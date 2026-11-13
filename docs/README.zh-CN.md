# 🍥Fuwari
![Node.js >= 20](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen) 
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue) 

> **Hugo 移植版。** 本仓库是 [saicaca](https://github.com/saicaca) 的 [Fuwari](https://github.com/saicaca/fuwari) 从 Astro 移植到 [Hugo](https://gohugo.io/) 的版本——布局、演示内容、行为都保持一致。Astro 源码已移除，本仓库仅含 Hugo 版本。Hugo 实现位于 `layouts/`、`hugo.toml` 和 `src/js/main.js`（构建辅助脚本见 `scripts/`）。
>
> [**🖥️ 在线演示（GitHub Pages）**](https://cleeate.github.io/fuwari/)

一个从 Astro 移植到 [Hugo](https://gohugo.io/) 的静态博客模板。

![Preview Image](https://raw.githubusercontent.com/saicaca/resource/main/fuwari/home.png)

🌏 README in
**中文** /
[**English**](https://github.com/cleeate/fuwari/blob/main/README.md)

## ✨ 特性

- [x] 基于 [Hugo](https://gohugo.io/) 与 [Tailwind CSS](https://tailwindcss.com) 构建
- [x] 流畅的动画与页面切换
- [x] 明 / 暗模式
- [x] 可自定义主题色与横幅
- [x] 响应式设计
- [x] 基于 [Pagefind](https://pagefind.app/) 的搜索
- [x] [Markdown 扩展语法](#-markdown-扩展语法)
- [x] 文章目录（TOC）
- [x] RSS 订阅

## 🚀 快速开始

1. 创建你的博客仓库：
    - 从本模板 [生成新仓库](https://github.com/cleeate/fuwari/generate)，或 fork 本仓库。
2. 克隆仓库并安装依赖：
    ```sh
    pnpm install
    ```
    - 如果还没有 [pnpm](https://pnpm.io)，先执行 `npm install -g pnpm`。
3. 编辑 **`hugo.toml`** 自定义你的博客：站点 `title`、`baseURL`、`[params.profile]`（昵称 / 头像 / 简介 / 社交链接）、`[params.navbarLinks]`（导航项与下拉子项）、主题色等。
4. 用 `pnpm new-post <文件名>` 新建文章，然后编辑 **`src/content/posts/`** 下的文件。
5. 参考 [Hugo 部署指南](https://gohugo.io/hosting-and-deployment/) 部署到 Vercel、Netlify、GitHub Pages 等。用 `pnpm build` 构建（输出到 **`public/`**）。**部署前务必把 `hugo.toml` 里的 `baseURL` 改成你的真实域名。**

> 注意：Hugo 不会直接读取 `src/content/`。`scripts/prepare-content.mjs` 会在 `pnpm dev` / `pnpm build` 时把它复制到 `.hugo/content`（丢弃 `config.ts` 并预渲染代码块）。如果要手动运行 `hugo`，请先执行 `pnpm prepare-content`。

## 📝 文章 Frontmatter

```yaml
---
title: 我的第一篇文章
published: 2023-09-09
description: 这是我的 Hugo 博客的第一篇文章。
image: ./cover.jpg
tags: [Foo, Bar]
category: 前端
draft: false
lang: jp      # 仅当文章语言与 hugo.toml 中的站点语言不同时才需要设置
---
```

`published` 会映射为 Hugo 的 `date`，`updated` 映射为 `lastmod`（见 `hugo.toml` 的 `[frontmatter]`）。

## 🧩 Markdown 扩展语法

除了 Hugo 内置的 [GitHub Flavored Markdown](https://github.github.com/gfm/)，还额外支持：

- Admonitions（提示块）（[预览与用法](https://cleeate.github.io/fuwari/posts/markdown-extended/#admonitions)）
- GitHub 仓库卡片（[预览与用法](https://cleeate.github.io/fuwari/posts/markdown-extended/#github-repository-cards)）
- Expressive Code 增强代码块（[预览](https://cleeate.github.io/fuwari/posts/expressive-code/) / [文档](https://expressive-code.com/)）

## ⚡ 命令

所有命令都在项目根目录的终端中运行：

| 命令                            | 作用                                                      |
|:--------------------------------|:----------------------------------------------------------|
| `pnpm install`                  | 安装依赖                                                  |
| `pnpm dev`                      | 在 `localhost:1313` 启动本地开发服务器                     |
| `pnpm build`                    | 构建生产站点到 `./public/`（Hugo + Pagefind）             |
| `pnpm new-post <文件名>`        | 在 `src/content/posts/` 下新建一篇文章                     |
| `pnpm prepare-content`          | 把 `src/content` 复制到 `.hugo/content`（手动跑 hugo 前执行）|
| `pnpm build-css`                | 构建 Tailwind CSS 样式包                                   |

> 这是一个 Hugo 项目：没有 `astro check`、没有 `pnpm preview`、输出目录不是 `./dist/`。开发服务器是 Hugo 的（`1313`），构建输出是 `public/`，JS/CSS 由 `scripts/` 打包（Node 20+、pnpm 9+）。

## ✏️ 贡献

详见 [贡献指南](https://github.com/cleeate/fuwari/blob/main/CONTRIBUTING.md)。

## 📄 License

本项目采用 MIT 许可证。
