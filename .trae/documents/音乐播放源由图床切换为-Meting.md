# 音乐播放源：图床直链 → Meting 解析

## Context（为什么改）

现状：曲目列表来自 `bangumi` content collection（94 首，`category: music`），每首的 `audioUrl` / `lrcUrl` 指向图床 `img.tsh520.cn`，播放时 `<audio src>` 直接用这个直链；meting 是**死配置**——`mode: "local"`，且 94 首的 `audioUrl` 都非空，使 `resolveMetingTracks` 的 `!track.url` 判定永不成立（实测 `metingId` 命中 0 条）。

目标：**曲目列表来源保持不变**，把播放所需的 音频 / 歌词 / 封面 改为运行时从自部署 Meting API `https://mus.5484826.xyz/api`（mikus-loli/Meting-API）解析；完全弃用图床音频与歌词；把散落的解析逻辑统一到 MusicManager 单一来源。

## 已实测的接口事实（决定实现细节）

- 实例：mikus-loli/Meting-API v1.1.2，`Server: cloudflare`，响应头 `access-control-allow-origin: *`（CORS 可用）
- `server` 支持 `netease` / `tencent`；`search` **仅 netease 支持**（tencent 返回 400）
- `GET /api?server=netease&type=search&id={关键词}` → `[{title, author, pic, url, lrc}]`
- 返回的 `url` / `lrc` 是**包装链接且为 http**：`http://mus.5484826.xyz/api?server=netease&type=url|pic|lrc&id=xxx` —— 必须升级为 https，否则在 HTTPS 页面被按混合内容拦截（音频直接不播）；`pic` 已是 https 的网易 CDN 直链
- `type=url` → 302 到网易 CDN **签名直链**（含时效 token）；该 CDN 返回 `Access-Control-Allow-Origin: *` 与 `Accept-Ranges: bytes`，与现有 `audio.crossOrigin = 'anonymous'` 兼容，3D 可视化频谱不受影响
- 结论：`<audio src>` / 封面 `<img>` / lrc fetch 一律使用**包装链接**（`…/api?type=url|pic|lrc&id=…`），由浏览器每次 302 到新的签名直链，规避直链过期问题

## 方案

### 1. 配置 `src/config/musicConfig.ts`

- `meting.api` → `https://mus.5484826.xyz/api?server=:server&type=:type&id=:id`
- 新增 `meting.searchServer?: "netease" | "tencent"`（默认 `netease`），专用于按歌名搜索
- `fallbackApis` → `[]`（只剩一个可用实例；原 `mu.tsh520.cn` 实测 404）
- `mode` 语义收敛为「直连歌单（`type=song|playlist`）」，注释注明本项目曲目列表固定来自 bangumi
- 同步 `src/types/config.ts` 中 `MusicPlayerConfig.meting` 类型

### 2. MusicManager 成为唯一解析者（核心）

改 `src/components/features/MusicManager.astro` 内联脚本，沿用现有 `state.playlist` / `emit()` / `getState()` 契约：

- **解析优先级**：条目已有 `metingServer` + `metingId` → `type=song&id=`；否则 → `type=search`，关键词 `"{title} {artist}"`
- **匹配校验**（防 Karaoke / 翻唱 / 同名）：首条 `author` 与 `artist` 有包含关系则采用；否则退回仅 `"{title}"` 搜索并取第一条 author 匹配的；仍不中则标记该曲 `resolved = false`
- **协议升级**：`url` / `lrc` 统一 `/^http:\/\// → https://`
- **懒解析 + 预取**：不在 `init()` 时批量解析 94 首；播放某首前解析它并预取下一首，避免一次性爆发 94 个请求
- **缓存**：`localStorage['firefly-music-meting-v1']`，key 为 `server|title|artist`，value 为 `{id, url, pic, lrc, ts}`（只存包装链接，不存签名直链），TTL 30 天，版本号进 key 便于整体失效
- **失败处理**：`console.warn` + `emit('fm:error')`（复用现有 `musicError` 文案，**不新增 i18n key**，避免 §7 的五语言同步），随后跳下一首；不做图床兜底
- 移除已失效的 `!track.url` 判定逻辑

### 3. 统一入口（删除 4 处重复实现）

- [MusicPlayer.astro](file:///e:/_Server/blog/src/components/features/MusicPlayer.astro)：删除本地 `resolveMetingTracks`、`externalPlaylist` / `metingApiBase` props 与 `loadExternalIfProvided` 分支，仅保留 UI 状态同步
- [UnifiedDock.astro](file:///e:/_Server/blog/src/components/layout/UnifiedDock.astro) / [FloatingDock.astro](file:///e:/_Server/blog/src/components/controls/FloatingDock.astro) / [widget/Music.astro](file:///e:/_Server/blog/src/components/widget/Music.astro)：删除各自的 `getCollection("bangumi")` 构建块与 `metingApiBase`，不再传 `externalPlaylist`
- [pages/music/index.astro](file:///e:/_Server/blog/src/pages/music/index.astro)：删除整段内联脚本与 `collectionPlaylist` 构建（[VisualizerControls.svelte](file:///e:/_Server/blog/src/components/features/music-visualizer/VisualizerControls.svelte#L195-L209) 的 `onMount` 已会 `mgr.init()` 并监听 `fm:init`）
- 顺带消除 6 处硬编码 `https://mu.tsh520.cn/api` 兜底

### 4. 数据清理（弃用图床）

- 用一次性 **Node** 脚本批量删除 94 个 `src/content/bangumi/music/*.md` 中的 `audioUrl` / `lrcUrl` 两行（代表文件：[FreeLoop.md](file:///e:/_Server/blog/src/content/bangumi/music/FreeLoop.md#L7-L8)）；**保留 `image`** —— schema 必填且番组卡片 / OG 图仍在用
- [content.config.ts](file:///e:/_Server/blog/src/content.config.ts#L90-L95) 移除 `audioUrl` / `lrcUrl` 声明（`metingServer` / `metingId` 保留，兼容手动指定）
- 脚本用后立即删除（§22 清临时文件）
- 注：`scripts/下载音乐/fetch-lrc.py` 仍会生成这两个字段，属另一次任务，本次不动

### 5. 文档与收尾

- `src/config/README.md` 同步音乐配置说明
- 新增 changelog `src/content/changelog/2026-10-06-music-meting-source.md`：version `v1.51.0` → **`v1.52.0`**（feature → minor）
- `pnpm exec biome ci ./src --reporter=github` 全绿

## 验证

1. curl 冒烟：`search` → 取 `url` → 302 目标 CDN 是否带 `ACAO: *`
2. `pnpm build` + `pnpm check`
3. 浏览器实测（`pnpm dev`）：播歌有声、封面 / 歌词来自网易、切歌 / 上一首 / 随机模式、进度条拖动（Range 生效）、3D 可视化频谱有数据、Swup 跳转后仍能播、清 localStorage 后首播延迟与缓存命中的对比
4. 抽查 5~8 首不同风格（英文 / 中文 / 韩文标题）的匹配正确性

## 风险与后续

- **匹配质量**：`Insomnia불면증Inst`、`TellMe韩文版` 这类标题已被清洗过，可能搜不到或匹配到翻唱 → 当前策略是标记失败并跳过；若实际体验差，可后续改为「脚本回填 `metingId`」以换取确定性
- **单点依赖**：`mus.5484826.xyz`（Cloudflare / 海外机房），且按你的选择不再有图床兜底
- 首次播放需一次网络往返（数百 ms 量级），此后命中缓存