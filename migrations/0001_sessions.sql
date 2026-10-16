-- 管理员会话（D1 强一致存储，替代旧 HMAC 无状态 Cookie 方案）
-- token_hash：session token 的 SHA-256 十六进制哈希（主键）。
-- 强一致意味着删除记录即立刻失效，改密码/踢人可通过清空表实现全端登出。
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

-- 登录限流（按客户端 IP，替代旧 ADMIN_KV 限流计数）
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  until INTEGER NOT NULL DEFAULT 0
);