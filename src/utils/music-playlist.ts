import { getCollection } from "astro:content";

export interface MusicPlaylistTrack {
	name: string;
	artist: string;
	/** 音乐平台：netease / tencent */
	server: "netease" | "tencent";
	/** 平台歌曲 ID，为空时运行期按 name+artist 搜索兜底 */
	metingId: string;
}

/**
 * 合并所有歌单为一个播放列表（数组顺序即播放顺序）。
 * 音频/歌词/封面不在 JSON 中，由播放器运行期通过 Meting API 解析。
 */
export async function getMergedMusicPlaylist(): Promise<MusicPlaylistTrack[]> {
	const entries = await getCollection("music");
	return entries.flatMap((entry) =>
		entry.data.playlists.flatMap((playlist) =>
			playlist.songs.map((song) => ({
				name: song.name,
				artist: song.artist,
				server: song.server,
				metingId: song.id,
			})),
		),
	);
}
