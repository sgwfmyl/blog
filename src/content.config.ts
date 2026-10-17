import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const publicOrRemoteImage = z.string().refine((value) => {
	return (
		value.startsWith("/") ||
		value.startsWith("http://") ||
		value.startsWith("https://") ||
		value.startsWith("data:")
	);
});

const postsCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		// category 已废弃：改由文件夹路径自动推导（src/utils/category-tree.ts#getCategoryFromId），历史 frontmatter 中的 category 将被迁移脚本移除
		lang: z.string().optional().default(""),
		pinned: z.boolean().optional().default(false),
		author: z.string().optional().default(""),
		sourceLink: z.string().optional().default(""),
		licenseName: z.string().optional().default(""),
		licenseUrl: z.string().optional().default(""),
		comment: z.boolean().optional().default(true),
		// 同日期内排在该目录最后（order 降序，未写表示最小），见 src/utils/content-utils.ts#comparePostsByOrderAndDate
		order: z.number().optional(),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});

const specCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/spec" }),
	schema: z.object({}),
});

const momentsCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/moments" }),
	schema: ({ image }) =>
		z.object({
			id: z.string().optional().default(""),
			author: z.string().optional().default("lh"),
			avatar: z.string().optional().default("/assets/ziyuan/avatar01.webp"),
			pinned: z.boolean().optional().default(false),
			published: z.date(),
			images: z
				.array(image().or(z.string()))
				.or(z.string())
				.optional()
				.default([]),
			tags: z.array(z.string()).optional().default([]),
			location: z.string().optional().default(""),
			device: z.string().optional().default(""),
		}),
});

const bangumiCollection = defineCollection({
	loader: glob({
		pattern: "**/*.{md,mdx,yaml,yml}",
		base: "./src/content/bangumi",
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			name_cn: z.string().optional(),
			category: z.enum(["book", "anime", "game"]).default("anime"),
			subcategory: z.enum(["movie", "tv", "anime", "documentary"]).optional(),
			status: z.number().min(1).max(5).default(2), // 1: 想看, 2: 看过, 3: 在看, 4: 搁置, 5: 抛弃
			image: image().or(z.string()),
			link: z.string().optional(), // 对应文章的链接；为空时自动从文件路径推导
			score: z.number().min(0).max(10).optional(),
			comment: z.string().optional(),
			tags: z.array(z.string()).optional().default([]),
			published: z.date().optional(),
		}),
});

// 音乐歌单集合：单文件多歌单 JSON，曲目音频/歌词/封面由 Meting API 运行期解析
const musicCollection = defineCollection({
	loader: glob({ pattern: "*.json", base: "./src/content/music" }),
	schema: z.object({
		version: z.number().default(1),
		updated: z.string().optional().default(""),
		playlists: z.array(
			z.object({
				id: z.string(),
				name: z.string(),
				songs: z.array(
					z.object({
						name: z.string(),
						artist: z.string(),
						// 音乐平台：netease（网易云）/ tencent（QQ 音乐）
						server: z.enum(["netease", "tencent"]).default("netease"),
						// 平台歌曲 ID，缺省时运行期按 name+artist 搜索兜底
						id: z.string().optional().default(""),
					}),
				),
			}),
		),
	}),
});

const lifeCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/life" }),
	schema: z.object({
		label: z.string().optional().default(""),
		value: z.string().optional().default(""),
		title: z.string().optional().default(""),
		description: z.string().optional().default(""),
		date: z.coerce.date().optional(),
		createdAt: z.coerce.date().optional(),
		completedAt: z.coerce.date().optional(),
		content: z.string().optional().default(""),
		status: z.enum(["done", "todo"]).optional(),

		// Notebook
		name: z.string().optional().default(""),
		cover: z.string().optional().default(""),
		summary: z.string().optional().default(""),
		entries: z.number().optional().default(0),
		updatedAt: z.union([z.string(), z.date()]).optional(),
		tags: z.array(z.string()).optional().default([]),

		// Plan
		planName: z.string().optional().default(""),
		targetDesc: z.string().optional().default(""),
		dailyTarget: z.number().optional().default(1),
		monthlyTarget: z.number().optional().default(20),
		checkins: z.array(z.coerce.date()).optional().default([]),

		// Place
		id: z.string().optional().default(""),
		province: z.string().optional().default(""),
		city: z.string().optional().default(""),
		experience: z.string().optional().default(""),
		visitCount: z.number().optional().default(1),
		lat: z.number().optional(),
		lng: z.number().optional(),
		url: z.string().optional().default(""),
		urlLabel: z.string().optional().default(""),
		photos: z.array(z.string()).optional().default([]),

		// Legacy fields (keep compatibility with existing data)
		waterCups: z.number().optional(),
		meals: z
			.array(z.object({ name: z.string(), value: z.string() }))
			.optional()
			.default([]),
		streak: z.number().optional().default(0),
		progress: z.number().min(0).max(100).optional().default(0),
	}),
});

const albumCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx,json}", base: "./src/content/album" }),
	schema: ({ image }) => {
		const albumImage = publicOrRemoteImage.or(image()).or(z.string());

		return z.object({
			title: z.string(),
			subtitle: z.string().optional().default(""),
			cover: albumImage.optional(),
			date: z.coerce.date(),
			location: z.string().optional().default(""),
			photos: z
				.array(
					albumImage.or(
						z.object({
							src: z.string(),
							alt: z.string().optional(),
							caption: z.string().optional(),
						}),
					),
				)
				.optional()
				.default([]),
			tags: z.array(z.string()).optional().default([]),
			draft: z.boolean().optional().default(false),
			// 图床文件夹路径，设置后从 CloudFlare ImgBed 动态加载图片
			imgbedFolder: z.string().optional().default(""),
		});
	},
});

const ziyuanCollection = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/ziyuan" }),
	schema: z.union([
		z.object({
			title: z.string(),
			content: z.string(),
			closable: z.boolean().optional().default(true),
			link: z
				.object({
					enable: z.boolean().optional().default(true),
					text: z.string(),
					url: z.string(),
					external: z.boolean().optional().default(false),
				})
				.optional(),
			quotes: z.undefined().optional(),
		}),
		z.object({
			title: z.string(),
			quotes: z.array(
				z.object({
					text: z.string(),
					author: z.string(),
				}),
			),
			content: z.undefined().optional(),
			closable: z.undefined().optional(),
			link: z.undefined().optional(),
		}),
	]),
});

const friendsCollection = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/friends" }),
	schema: z.object({
		title: z.string(),
		imgurl: z.string(),
		desc: z.string(),
		siteurl: z.string(),
		tags: z.array(z.string()).optional().default([]),
		weight: z.number().optional().default(0),
		enabled: z.boolean().optional().default(true),
		added: z.date().optional(),
		group: z.enum(["friend", "other"]).optional().default("other"),
	}),
});

const tombstonesCollection = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/tombstones" }),
	schema: z.object({
		title: z.string(),
		avatar: z.string().optional(),
		note: z.string().optional(),
	}),
});

const daohangCollection = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/daohang" }),
	// 展示必需的四项：分类由文件夹决定，顺序按名称排（见 src/pages/projects.astro）
	// tags 可选：填了就在导航页该分类的标题行里变成一排子标签（筛选该分类里的卡片）
	schema: z.object({
		name: z.string(),
		url: z.string(),
		icon: z.string().optional().default(""),
		description: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
	}),
});

const changelogCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/changelog" }),
	schema: z.object({
		version: z.string(),
		date: z.date(),
		time: z.string().optional(),
		type: z.enum(["feature", "improvement", "fix", "removal"]),
		description: z.string(),
	}),
});

// 开发文档（Astro Starlight）：内容位于 src/content/docs/**
// 路由前缀由子目录名决定，故文档实际放在 src/content/docs/docs/** → 路由 /docs/**
// pagefind 默认 false：文档页不进站内 Pagefind 索引（公开但不收录）
const docsCollection = defineCollection({
	loader: docsLoader(),
	schema: docsSchema({
		extend: z.object({ pagefind: z.boolean().default(false) }),
	}),
});

export const collections = {
	posts: postsCollection,
	spec: specCollection,
	moments: momentsCollection,
	bangumi: bangumiCollection,
	music: musicCollection,
	life: lifeCollection,
	album: albumCollection,
	daohang: daohangCollection,
	ziyuan: ziyuanCollection,
	friends: friendsCollection,
	changelog: changelogCollection,
	tombstones: tombstonesCollection,
	docs: docsCollection,
};
