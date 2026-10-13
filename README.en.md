# lh's Blog

A personal life-documentation blog, forked from [Firefly](https://github.com/CuteLeaf/Firefly) and heavily customized.

- 🖥️ Live Site: **[blog.5484826.xyz](https://blog.5484826.xyz)**
- ⚙️ Content management: self-hosted **PagesCMS** (`cms.5484826.xyz`, configured in `.pages.yml`; fields must match the zod schema in `src/content.config.ts`)

## Tech Stack

- **Astro 7** + **Tailwind CSS v4** + **Svelte 5** + **TypeScript 5.9**
- **Swup** page transitions, **Pagefind** full-text search, **Waline** comment system
- **Expressive Code** enhanced code blocks + **KaTeX** math rendering
- **Starlight** dev docs (served at `/docs/`, excluded from search engines)

## Highlights

- 15 content collections (posts / moments / bangumi / life / notebook / album / friends / resources, etc.); article category = folder path
- Dedicated pages for moments (WeChat-Moment style), guestbook, bangumi, albums, music, books, movies & games, changelog, etc.
- Highly configurable: light/dark mode, theme color, wallpapers, mascot, sakura effect
- i18n (Simplified Chinese/English), RSS, Sitemap, SEO

## Quick Start

Requirements: **Node >= 22**, **pnpm** (9.14 enforced via preinstall).

```bash
pnpm install   # install dependencies
pnpm dev       # develop on http://localhost:4500 (port fixed to 4500)
pnpm build     # build to ./dist (icons → astro build → pagefind index)
pnpm preview   # preview the build output
pnpm check     # astro check
pnpm type-check  # tsc --noEmit
pnpm new-post   # create a new post
```

## Deployment

Production runs on **Cloudflare Workers Static Assets** (manual deploy; pushing to main does NOT auto-publish):

```bash
pnpm build && pnpm wrangler deploy
```

Copy `.env.example` to `.env` before dev/build; missing `PUBLIC_*` variables silently degrade the related features. See [docs/deploy-cloudeflare-workers.md](docs/deploy-cloudeflare-workers.md).

## License

Distributed under the **MIT license**. See [LICENSE](./LICENSE).

## Copyright

- Copyright (c) 2024 [saicaca](https://github.com/saicaca) - [fuwari](https://github.com/saicaca/fuwari)
- Copyright (c) 2025 [CuteLeaf](https://github.com/CuteLeaf) - [Firefly](https://github.com/CuteLeaf/Firefly)
- Copyright (c) 2026 [lh](https://blog.5484826.xyz) - Personal Blog