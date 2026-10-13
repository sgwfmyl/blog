export interface TtsVoiceOption {
	name: string;
	label: string;
}

export interface TtsConfig {
	enable: boolean;
	serverUrl: string;
	defaultVoice: string;
	voices: TtsVoiceOption[];
	speeds: number[];
	maxChars: number;
	requestTimeoutMs: number;
	speechChunkChars: number;
}

const rawServerUrl = import.meta.env.PUBLIC_TTS_SERVER || "";

export const ttsConfig: TtsConfig = {
	// 2026-10-14 起关闭：TTS 后端（scripts/TTS服务/）当前未部署，为避免误导暂隐藏朗读入口；
	// 重新启用：改回 true 并在 .env 配置 PUBLIC_TTS_SERVER
	enable: false,
	serverUrl: rawServerUrl.replace(/\/+$/, ""),
	defaultVoice: "zh-CN-XiaoxiaoNeural",
	voices: [
		{ name: "zh-CN-XiaoxiaoNeural", label: "晓晓（女声）" },
		{ name: "zh-CN-XiaoyiNeural", label: "晓伊（女声）" },
		{ name: "zh-CN-YunxiNeural", label: "云希（男声）" },
		{ name: "zh-CN-YunyangNeural", label: "云扬（男声·播报）" },
		{ name: "zh-CN-YunjianNeural", label: "云健（男声）" },
		{ name: "zh-CN-liaoning-XiaobeiNeural", label: "辽宁小北（女声·方言）" },
		{ name: "zh-CN-shaanxi-XiaoniNeural", label: "陕西小妮（女声·方言）" },
	],
	speeds: [0.8, 1, 1.25, 1.5, 2],
	maxChars: 20000,
	requestTimeoutMs: 8000,
	speechChunkChars: 160,
};
