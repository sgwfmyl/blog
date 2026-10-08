---
version: "v1.57.0"
date: 2026-10-08
time: "02:40"
type: feature
description: 音乐歌单从 bangumi 单曲 md 迁移为 JSON（music content collection），音频/封面/歌词不再走图床直链，改为播放时经 Meting API 懒解析并缓存 30 天
---

## 音乐歌单迁移：JSON 数据源 + Meting API 懒解析

音频方案整体替换：歌单不再由 94 个 bangumi md 单文件承载，音频/封面/歌词不再依赖图床直链，改由 Meting API 在播放时按需解析。

- **歌单数据源 JSON 化**：删除 `src/content/bangumi/music/` 全部 94 个 md 与 bangumi 页音乐 Tab；新增 `src/content/music/playlist.json`（music content collection，glob JSON loader + zod 校验），结构为 `{version, updated, playlists: [{id, name, songs: [{name, artist, server, id}]}]}`，`server` 默认 `netease`、`id` 可选（留空时运行时搜索兜底），见 [music-playlist.ts](file:///e:/_Server/blog/src/utils/music-playlist.ts)。
- **播放时懒解析**：音频/封面/歌词由 MusicManager 在播放当前曲目时才请求 Meting API（`mus.5484826.xyz`），有 `metingId` 走 `type=song&id=`、无则按「歌名 + 歌手」搜索并做作者包含匹配，结果 http→https 升级后写入 localStorage 缓存 30 天——规避该公共实例的严格限流（429）与构建期批量解析。
- **前端播放不动**：MusicManager/MusicPlayer/widget/Music、两个 dock、music 页仅替换数据源注入与删除批量解析，`fm:*` 事件体系、`window.__fireflyMusic` 单例守卫、播放 UI 结构均保持原样。
- **配置收敛**：`musicConfig.ts` 的 `meting.api` 指向 `mus.5484826.xyz`（弃用已死域名 `mu.tsh520.cn`），`fallbackApis` 清空，`local.playlist` 置空——歌单只由 music collection 提供。

> 验证：`pnpm build` 534 页通过（含 pagefind 索引）；`pnpm check` 0 error（34 hints 均为既有告警）；本次改动的 11 个文件 `biome ci` 全绿（全仓 293 个 format 差异为历史遗留，未动）。
