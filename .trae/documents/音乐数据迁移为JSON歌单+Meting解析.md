# 音乐数据迁移：md 单曲文件 → JSON 歌单 + Meting 解析

## Context（为什么改）

现状：94 首音乐以「一首一个 md」存在 bangumi collection（`src/content/bangumi/music/*.md`），音频/歌词来自图床 `img.tsh520.cn` 直链；meting 配置（`mu.tsh520.cn`）实测 404 且因 `mode: local` 从未被调用。问题：文件多、图床单点依赖、音频无法复用通用歌单格式。

目标：音乐数据改为「单文件多歌单 JSON」存入新建 collection；播放时的音频/歌词/封面全部由运行期 Meting API（`https://mus.5484826.xyz/api`，mikus-loli/Meting-API，实测 CORS `*`）解析；音乐从 bangumi 移除；把散落 4 处的解析逻辑统一到 MusicManager。

已确认决策：删 /bangumi 音乐卡片；数组顺序即播放顺序；单文件多歌单、播放器合并播；封面全用 meting；新建 collection。

## 数据结构（最终定稿）

```json
{
  "version": 1,
  "updated": "2026-10-08",
  "playlists": [
    {
      "id": "default",
      "name": "博客歌单",
      "songs": [
        { "name": "カワキヲアメク", "artist": "美波", "server": "netease", "id": "1342950406" }
      ]
    }
  ]
}
```

字段：`name`/`artist` 必填（展示 + search 兜底关键词）；`server` 缺省 `netease`；`id`（meting 歌曲 id）可选——有则 `type=song&id=` 确定性解析，缺则运行时按 name+artist 搜索。不存音频地址、不存 pic。

## 已实测的接口事实

* `type=song&id={有效id}` → `[{title, author, pic, url, lrc}]`；`type=search` 仅 netease 可用，返回同结构数组

* 返回的 `url`/`lrc` 是 **http 包装链接**（`http://mus.5484826.xyz/api?…&type=url|pic|lrc&id=…`），必须升级 https（否则 HTTPS 页面混合内容拦截）

* `type=url` → 302 到网易 CDN 签名直链，该 CDN 带 `Access-Control-Allow-Origin: *` + `Accept-Ranges: bytes`，与 `audio.crossOrigin='anonymous'` 频谱兼容

## 实施步骤

### 1. 新增 music collection

* [content.config.ts](file:///e:/_Server/blog/src/content.config.ts)：仿 `notebooksCollection`（L150-L172，glob 已支持 json）新增 `musicCollection`：`glob({ pattern: "*.json", base: "./src/content/music" })`，schema 为上述 JSON 结构（zod），并注册进 `collections` 导出（L368-L385 附近）

* 新建 `src/content/music/playlist.json`（内容由步骤 2 生成）

### 2. 一次性迁移脚本（Node，用完删除，遵守 §22）

* `scripts/迁移音乐歌单/`：读取 94 个 `src/content/bangumi/music/*.md`，提取 `title`/`artist` 生成 `playlist.json`（`songs[].id` 留空，走运行时搜索）；随后批量删除 94 个 md

* 用后立即删除脚本目录

### 3. 共享工具

* 新建 `src/utils/music-playlist.ts`：`getMergedMusicPlaylist()` —— `getCollection("music")` 合并所有 `playlists[].songs`，统一映射为 `{ name, artist, server, id }`（避免 5 处组件重复 getCollection+merge）

### 4. 配置更新

* [musicConfig.ts](file:///e:/_Server/blog/src/config/musicConfig.ts#L10-L17)：`meting.api` → `https://mus.5484826.xyz/api?server=:server&type=:type&id=:id`；`fallbackApis` → `[]`；注释更新 `mode` 语义（曲目固定来自 JSON collection）

* 同步 [src/config/README.md](file:///e:/_Server/blog/src/config/README.md) 音乐配置说明

### 5. MusicManager 重写解析逻辑（核心）

[MusicManager.astro](file:///e:/_Server/blog/src/components/features/MusicManager.astro)：

* **frontmatter（L10-L37）**：改用 `getMergedMusicPlaylist()` 取代 bangumi 过滤；去掉 `metingApiBase`/`bangumiPlaylist`

* **内联脚本**：

  * 删除 `fetchMetingData`（L164-L201）、批量 `resolveMetingTracks`（L390-L415）、`_externalLoaded` 与 `loadExternalPlaylist` 的外部加载分支（`init` 直接从注入 JSON 建 playlist，保留 `loadExternalPlaylist` API 空实现以防他处引用）

  * 新增 `ensureTrackResolved(track)`：有 `id` → `type=song&id=`；无 → `type=search`，关键词 `"{name} {artist}"`，校验首条 `author` 与 `artist` 有包含关系，否则回退仅 name 搜索；`url`/`lrc` 统一 http→https 升级

  * 缓存：`localStorage["firefly-music-resolve-v1"]`，key 为 `server:name:artist` 或 `server:id`，value `{url,pic,lrc,ts}`，TTL 30 天，**只存包装链接不存签名直链**

  * `loadTrack` 改异步：先 `ensureTrackResolved` 再赋 `audio.src`；解析失败 `console.warn` + `emit("fm:error")` + 自动跳下一首；成功则后台预取下一首（随机/列表模式按序）

  * 删除 `https://mu.tsh520.cn/api` 硬编码

### 6. 播放器与入口统一

* [MusicPlayer.astro](file:///e:/_Server/blog/src/components/features/MusicPlayer.astro)：删除 `externalPlaylist`/`metingApiBase` props、`resolveMetingTracks`（L196-L221）、`loadExternalIfProvided` 分支（L701-L717），纯 UI 读 `mgr.getState()`

* [widget/Music.astro](file:///e:/_Server/blog/src/components/widget/Music.astro)、[UnifiedDock.astro](file:///e:/_Server/blog/src/components/layout/UnifiedDock.astro#L157)、[FloatingDock.astro](file:///e:/_Server/blog/src/components/controls/FloatingDock.astro#L194)：删除各自 getCollection 构建块与 `metingApiBase`，改为 `<MusicPlayer />` 无 props

* [pages/music/index.astro](file:///e:/_Server/blog/src/pages/music/index.astro)：删除 `collectionPlaylist` 构建（L18-L54）与整段内联脚本（L65-L132）——[VisualizerControls.svelte](file:///e:/_Server/blog/src/components/features/music-visualizer/VisualizerControls.svelte#L195-L209) 的 `onMount` 已会 `mgr.init()`，playlist 由 MusicManager 自注入

### 7. bangumi 清理

* [content.config.ts](file:///e:/_Server/blog/src/content.config.ts#L79-L96)：`category` 枚举去掉 `"music"`，删 `artist/audioUrl/lrcUrl/metingServer/metingId` 字段

* [bangumi.astro](file:///e:/_Server/blog/src/pages/bangumi.astro#L21-L35)：删 `categoryMap.music`；`displayCategories`（L135）去掉 `"music"`

* [content-utils.ts](file:///e:/_Server/blog/src/utils/content-utils.ts#L170)、[RecentItems.astro](file:///e:/_Server/blog/src/components/widget/RecentItems.astro#L80)：删 `category === "music"` 分支

* [SiteStats.astro](file:///e:/_Server/blog/src/components/widget/SiteStats.astro#L41)：音乐不再纳入统计

* 94 个 md 已由步骤 2 删除；`.pages.yml` 未声明 bangumi，无需改动

### 8. 收尾

* 新增 changelog `src/content/changelog/2026-10-08-music-json-meting.md`：`version: "v1.52.0"`，`type: feature`（最新 v1.51.0 → minor）

* `pnpm exec biome ci ./src --reporter=github` 全绿

* 若改动涉及架构文档，同步 CLAUDE.md §20

## 验证

1. curl 冒烟：`search` 返回结构、`type=song` 可用性、`type=url` 302 目标 CDN 带 `ACAO: *`
2. `pnpm build` + `pnpm check`
3. 浏览器实测（`pnpm dev`）：播歌有声、封面/歌词来自网易、切歌/上一首/随机、进度条拖动、3D 频谱有数据、Swup 跳转后仍可播、清 localStorage 后首播有延迟而再次播放秒开（缓存命中）
4. 抽查 5\~8 首不同风格（英文/中文/韩文标题）匹配正确性；不匹配的应静默跳过并触发下一首而非卡死

## 风险与说明

* **搜索匹配质量**：`Insomnia불면증Inst` 等已清洗标题可能匹配到翻唱或搜不到 → 策略为跳过该曲；后续可对个别曲目手工在 JSON 填 `id` 修正

* **单点依赖**：`mus.5484826.xyz`（Cloudflare 海外），无图床兜底

* **首次播放延迟**：每曲首次需一次 meting 请求（数百 ms），此后 30 天缓存命中

