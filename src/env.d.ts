/// <reference types="astro/client" />

/**
 * Cloudflare Workers 运行时类型声明（阶段 3 引入）。
 *
 * `cloudflare:workers` 是 workerd 运行时注入的虚拟模块，`env` 导出当前请求的
 * bindings / secrets / vars 集合。Astro 6+ 已移除 `Astro.locals.runtime.env`，
 * SSR 端点统一改用 `import { env } from "cloudflare:workers"` 访问。
 *
 * 此处采用最小化 D1 / KV 接口，避免引入 @cloudflare/workers-types 依赖。
 * 新增 binding（如 Durable Object / 队列）时在此扩展 CloudflareEnv。
 */

interface D1Result<T = Record<string, unknown>> {
	results?: T[];
	success: boolean;
	meta?: unknown;
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
	run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
	all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
	exec(query: string): Promise<unknown>;
}

interface KVNamespace {
	get(key: string): Promise<string | null>;
	put(
		key: string,
		value: string,
		options?: { expirationTtl?: number },
	): Promise<void>;
	delete(key: string): Promise<void>;
}

interface CloudflareEnv {
	/** 管理员会话 + 登录限流（D1 强一致） */
	DB: D1Database;
	/** GitHub 私有内容缓存 */
	ADMIN_KV: KVNamespace;
	/** 登录密码（wrangler secret 配置） */
	ADMIN_PASSWORD: string;
	/** GitHub 私有仓库只读 PAT */
	GH_PAT: string;
	GH_OWNER: string;
	GH_REPO: string;
}

declare module "cloudflare:workers" {
	export const env: CloudflareEnv;
}
