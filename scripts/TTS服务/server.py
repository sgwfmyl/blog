"""博客文章朗读服务（edge-tts 代理）。

接口：
- GET  /health        健康检查
- GET  /voices        可用音色列表（缓存 1 天）
- POST /tts           {text, voice} -> {id}，文本仅内存暂存 10 分钟
- GET  /audio/{id}    流式返回 mp3；完整合成后落盘缓存，命中时支持 Range

环境变量：
- PORT             监听端口（默认 8000）
- CACHE_DIR        音频缓存目录（默认 ./cache）
- CACHE_MAX_MB     缓存上限 MB（默认 2048，超出按 mtime 淘汰）
- ALLOWED_ORIGINS  允许的跨域来源，逗号分隔
- EDGE_TTS_PROXY   调用微软语音服务的代理（可选，如 http://127.0.0.1:7890；容器内 127.0.0.1 指容器自身，代理跑在宿主机时需填宿主网关，如 http://172.17.0.1:7890）
"""

import asyncio
import hashlib
import os
import re
import time
from importlib.metadata import version as pkg_version
from pathlib import Path

import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

MAX_TEXT_CHARS = 20000
CHUNK_CHARS = 3000
TEXT_TTL_SECONDS = 600
MAX_CONCURRENT_SYNTH = 3
VOICE_CACHE_SECONDS = 86400

CACHE_DIR = Path(os.getenv("CACHE_DIR", "./cache"))
CACHE_MAX_MB = int(os.getenv("CACHE_MAX_MB", "2048"))
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "https://blog.tsh520.cn,http://localhost:4321,http://localhost:4500",
    ).split(",")
    if origin.strip()
]
PROXY = os.getenv("EDGE_TTS_PROXY") or None

app = FastAPI(title="blog-tts")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

_texts: dict[str, tuple[str, str, float]] = {}
_locks: dict[str, asyncio.Lock] = {}
_semaphore = asyncio.Semaphore(MAX_CONCURRENT_SYNTH)
_voices_cache: tuple[float, list[dict[str, str]]] | None = None


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT_CHARS)
    voice: str = Field(default="zh-CN-XiaoxiaoNeural")


def make_id(text: str, voice: str) -> str:
    return hashlib.sha256(f"{voice}|{text}".encode("utf-8")).hexdigest()[:32]


def cache_file(cid: str) -> Path:
    return CACHE_DIR / f"{cid}.mp3"


def split_text(text: str, limit: int = CHUNK_CHARS) -> list[str]:
    """按行聚合到 <= limit 字；超长段落再按句末标点切。"""
    units = [line.strip() for line in text.splitlines() if line.strip()]
    chunks: list[str] = []
    current = ""
    for unit in units:
        if len(current) + len(unit) + 1 <= limit:
            current = f"{current}\n{unit}".strip()
            continue
        if current:
            chunks.append(current)
        if len(unit) <= limit:
            current = unit
            continue
        buff = ""
        for sentence in re.split(r"(?<=[。！？!?；;])\s*", unit):
            if len(buff) + len(sentence) <= limit:
                buff += sentence
                continue
            if buff:
                chunks.append(buff)
            while len(sentence) > limit:
                chunks.append(sentence[:limit])
                sentence = sentence[limit:]
            buff = sentence
        current = buff
    if current:
        chunks.append(current)
    return chunks or [text[:limit]]


def cleanup_cache() -> None:
    try:
        files = sorted(
            (path for path in CACHE_DIR.glob("*.mp3") if path.is_file()),
            key=lambda path: path.stat().st_mtime,
        )
    except OSError:
        return
    total = 0
    for path in files:
        try:
            total += path.stat().st_size
        except OSError:
            continue
    limit = CACHE_MAX_MB * 1024 * 1024
    for path in files:
        if total <= limit:
            break
        try:
            size = path.stat().st_size
        except OSError:
            continue
        total -= size
        try:
            path.unlink(missing_ok=True)
        except OSError:
            continue
    cutoff = time.time() - 3600
    for path in CACHE_DIR.glob("*.part"):
        try:
            if path.stat().st_mtime < cutoff:
                path.unlink(missing_ok=True)
        except OSError:
            continue


async def synth(text: str, voice: str):
    for chunk in split_text(text):
        async with _semaphore:
            communicate = edge_tts.Communicate(chunk, voice, proxy=PROXY)
            async for message in communicate.stream():
                if message["type"] == "audio":
                    yield message["data"]


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "edge_tts": pkg_version("edge-tts")}


@app.get("/voices")
async def voices() -> dict[str, list[dict[str, str]]]:
    global _voices_cache
    now = time.time()
    if _voices_cache and now - _voices_cache[0] < VOICE_CACHE_SECONDS:
        return {"voices": _voices_cache[1]}
    raw = await edge_tts.list_voices()
    picked = [
        {
            "name": voice["ShortName"],
            "gender": voice["Gender"],
            "locale": voice["Locale"],
        }
        for voice in raw
        if voice["Locale"].startswith(("zh-CN", "en-US"))
    ]
    _voices_cache = (now, picked)
    return {"voices": picked}


@app.post("/tts")
async def create_tts(req: TTSRequest) -> dict[str, str]:
    now = time.time()
    expired = [
        key for key, value in _texts.items() if now - value[2] > TEXT_TTL_SECONDS
    ]
    for key in expired:
        _texts.pop(key, None)
    cid = make_id(req.text, req.voice)
    _texts[cid] = (req.text, req.voice, now)
    return {"id": cid}


@app.get("/audio/{cid}")
async def get_audio(cid: str):
    if not cid.isalnum():
        raise HTTPException(status_code=400, detail="非法 id")
    path = cache_file(cid)
    if path.exists():
        return FileResponse(path, media_type="audio/mpeg")

    entry = _texts.get(cid)
    if not entry or time.time() - entry[2] > TEXT_TTL_SECONDS:
        raise HTTPException(status_code=404, detail="id 不存在或已过期，请重新发起朗读")
    text, voice, _ = entry

    lock = _locks.setdefault(cid, asyncio.Lock())

    async def stream():
        async with lock:
            try:
                data = path.read_bytes()
            except OSError:
                data = b""
            if data:
                _texts.pop(cid, None)
                _locks.pop(cid, None)
                yield data
                return
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(".part")
            try:
                with open(tmp, "wb") as handle:
                    async for data in synth(text, voice):
                        handle.write(data)
                        yield data
                os.replace(tmp, path)
                _texts.pop(cid, None)
                _locks.pop(cid, None)
                await asyncio.to_thread(cleanup_cache)
            except (Exception, asyncio.CancelledError):
                tmp.unlink(missing_ok=True)
                raise

    return StreamingResponse(stream(), media_type="audio/mpeg")
