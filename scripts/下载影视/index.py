#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
影视封面下载 + TMDB 搜索 + 自动生成博客 md

用法:
    # 先设置 API key
    set TMDB_API_KEY=你的key              # Windows
    export TMDB_API_KEY=你的key            # Linux/Mac

    # 交互模式
    python fetch-media.py "星际穿越"

    # 指定类型 (movie / tv / anime / documentary)
    python fetch-media.py "黑暗荣耀" --type=tv

    # 快速模式（自动选第一个结果，status=已看，跳过确认）
    python fetch-media.py "你的名字" -y

    # 快速模式 + 预设状态和评分
    python fetch-media.py "你的名字" -y --status=2 --score=8

    # 手动模式（TMDB 搜不到时自动降级，也可带封面 URL）
    python fetch-media.py "冷门电影" -y --cover-url=https://xxx/poster.jpg

    # 通过参数传 API key
    python fetch-media.py "星际穿越" --api-key=你的key

TMDB 搜不到时自动降级为手动模式，交互填写所有字段。

默认 MD 输出目录: src/content/bangumi/anime/
封面不落本地：抓取后直接上传 CloudFlare ImgBed 图床（配置见根目录 .env 的 PUBLIC_IMAGEBED_*），md 的 image 用图床上传返回的真实 URL；
上传目录固定为 blog/anime、渠道名 blog（影视封面专用）。

TMDB API: https://developer.themoviedb.org/reference/intro/getting-started
"""

import json
import os
import sys
import urllib.request
import urllib.parse
from datetime import date

# Windows 终端 UTF-8 支持
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# ── 配置 ──────────────────────────────────────────────
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BLOG_BANGUMI_DIR = os.path.join(BASE_DIR, "src", "content", "bangumi", "anime")
TMDB_API_KEY = "8a9a0dd41f7b6fe6d4d20f6cc9bd26f2"

# 图床上传配置：读取根目录 .env 的 PUBLIC_IMAGEBED_*；
# 渠道名称与上传目录为影视封面专用（不与评论区共用 blog / blog/comment）
IMGBED_CHANNEL_NAME = "blog"
IMGBED_UPLOAD_FOLDER = "影视/封面"
TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

STATUS_LABELS = {1: "待看", 2: "已看", 3: "追更", 4: "搁置", 5: "弃坑"}
STATUS_PROMPT = "  ".join("{}:{}".format(k, v) for k, v in STATUS_LABELS.items())

GENRE_MAP = {
    28: "动作", 12: "冒险", 16: "动画", 35: "喜剧", 80: "犯罪",
    99: "纪录片", 18: "剧情", 10751: "家庭", 14: "奇幻", 36: "历史",
    27: "恐怖", 10402: "音乐", 9648: "悬疑", 10749: "爱情", 878: "科幻",
    10770: "电视电影", 53: "惊悚", 10752: "战争", 37: "西部",
    10759: "动作冒险", 10762: "儿童", 10763: "新闻", 10764: "真人秀",
    10765: "科幻悬疑", 10766: "肥皂剧", 10767: "脱口秀", 10768: "战争政治",
}

# ── 工具函数 ──────────────────────────────────────────

def fetch_bytes(url, referer=None, timeout=120):
    """抓取远程二进制内容到内存（不落盘），返回 bytes 或 None"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }
    if referer:
        headers["Referer"] = referer
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except Exception as e:
        print("  抓取失败: {}".format(e))
        return None


def load_imgbed_config():
    """从根目录 .env 读取图床上传配置（URL / 鉴权 / 渠道）"""
    config = {
        "url": os.environ.get("PUBLIC_IMAGEBED_URL", ""),
        "token": os.environ.get("PUBLIC_IMAGEBED_API_TOKEN", ""),
        "auth_code": os.environ.get("PUBLIC_IMAGEBED_AUTH_CODE", ""),
        "channel": os.environ.get("PUBLIC_IMAGEBED_CHANNEL", ""),
    }
    env_path = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key in (
                    "PUBLIC_IMAGEBED_URL",
                    "PUBLIC_IMAGEBED_API_TOKEN",
                    "PUBLIC_IMAGEBED_AUTH_CODE",
                    "PUBLIC_IMAGEBED_CHANNEL",
                ):
                    # 环境变量名 → config 键名的显式映射（避免去掉前缀后与短键名不一致）
                    mapped = {
                        "PUBLIC_IMAGEBED_URL": "url",
                        "PUBLIC_IMAGEBED_API_TOKEN": "token",
                        "PUBLIC_IMAGEBED_AUTH_CODE": "auth_code",
                        "PUBLIC_IMAGEBED_CHANNEL": "channel",
                    }[key]
                    if not config[mapped]:
                        config[mapped] = value
    return config


def upload_multi_part(url, fields, filename, content, content_type, headers=None):
    """向图床 /upload 发送 multipart 上传，返回响应 bytes（b"..."）或 None"""
    boundary = "----traebounds{}".format(abs(hash(url)) % 10 ** 8)
    parts = []
    for name, value in fields.items():
        parts.append("--{}\r\nContent-Disposition: form-data; name=\"{}\"\r\n\r\n{}\r\n".format(
            boundary, name, value).encode("utf-8"))
    parts.append(
        "--{}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{}\"\r\n"
        "Content-Type: {}\r\n\r\n".format(boundary, filename, content_type).encode("utf-8"))
    parts.append(content)
    parts.append("\r\n--{}--\r\n".format(boundary).encode("utf-8"))
    body = b"".join(parts)
    merged = dict(headers or {})
    # 必须带浏览器 UA：图床的 Cloudflare WAF 会拦截 Python-urllib 请求（Error 1010）
    merged.setdefault("User-Agent",
                      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    merged.update({
        "Content-Type": "multipart/form-data; boundary={}".format(boundary),
        "Content-Length": str(len(body)),
    })
    try:
        req = urllib.request.Request(url, data=body, method="POST", headers=merged)
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.read()
    except Exception as e:
        print("  上传失败: {}".format(e))
        return None


def upload_cover_to_imgbed(source_url, title, default_ext=".jpg"):
    """抓取封面并上传到图床，返回可访问的图床完整 URL；无封面/失败返回 \"\" """
    if not source_url:
        print("  [无封面] 未获取到海报")
        return ""
    ext = default_ext
    lowered = source_url.lower()
    if lowered.endswith(".png") or "image/png" in lowered:
        ext = ".png"
    elif lowered.endswith(".webp") or "image/webp" in lowered:
        ext = ".webp"

    content = fetch_bytes(source_url, referer=source_url)
    if content is None:
        return ""

    cfg = load_imgbed_config()
    base = cfg["url"]
    if not cfg["url"]:
        print("  [配置缺失] 未配置 PUBLIC_IMAGEBED_URL（根目录 .env）")
        return ""
    base = base.removesuffix("/")
    upload_url = "{}/upload".format(base)
    # query 值需 URL 编码：目录名/渠道名可能含中文（urllib 对拼接后的整条中文 URL 做 ASCII 编码会抛错）
    from urllib.parse import urlencode
    query_params = {}
    if cfg.get("channel"):
        query_params["uploadChannel"] = cfg["channel"]
    if IMGBED_CHANNEL_NAME:
        query_params["channelName"] = IMGBED_CHANNEL_NAME
    if IMGBED_UPLOAD_FOLDER:
        query_params["uploadFolder"] = IMGBED_UPLOAD_FOLDER
    if query_params:
        upload_url += "?" + urlencode(query_params)

    ctype_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                 ".png": "image/png", ".webp": "image/webp"}
    content_type = ctype_map.get(ext, "image/jpeg")

    fields = {"name": "{}{}".format(title, ext)}
    if cfg.get("auth_code"):
        fields["password"] = cfg["auth_code"]
    headers = {"Accept": "application/json"}
    if cfg.get("token"):
        headers["Authorization"] = "Bearer {}".format(cfg["token"])

    print("  上传封面到图床: {}{}".format(title, ext))
    resp_body = upload_multi_part(
        upload_url, fields, "{}{}".format(title, ext), content, content_type, headers)
    if resp_body is None:
        return ""
    try:
        payload = json.loads(resp_body.decode("utf-8"))
    except Exception:
        print("  上传响应解析失败")
        return ""

    # 兼容图床返回：数组取首个 src，相对路径拼图床 origin（与前端 resolveImgbedSrc 对齐）
    def absolutize(src):
        """把图床返回的相对 src 转成绝对 URL；图床存储路径可能含中文，需 URL 编码但保留 / 分隔符"""
        if not src:
            return ""
        if src.startswith(("http://", "https://")):
            return src
        from urllib.parse import quote, urlsplit
        encoded = quote(src, safe="/")  # 编码中文等非 ASCII，保留 / 目录分隔符
        origin = "{}://{}".format(urlsplit(base).scheme, urlsplit(base).netloc)
        return origin + (encoded if encoded.startswith("/") else "/" + encoded)

    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict) and item.get("src"):
                return absolutize(item["src"])
    # 兜底解析 {data:{links:{url}}} / {data:{url}} / {url}
    def _find_url(obj):
        if isinstance(obj, dict):
            if isinstance(obj.get("url"), str) and obj["url"]:
                return obj["url"]
            for v in obj.values():
                r = _find_url(v)
                if r:
                    return r
        return ""
    return absolutize(_find_url(payload))


def tmdb_request(endpoint, api_key, params=None):
    """调用 TMDB API，返回 JSON 数据"""
    if params is None:
        params = {}
    params["api_key"] = api_key
    params["language"] = "zh-CN"
    url = "{}{}?{}".format(TMDB_BASE, endpoint, urllib.parse.urlencode(params))
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print("  TMDB API 请求失败: {}".format(e))
        return None


# ── 豆瓣搜索 ──────────────────────────────────────────

def douban_search(query):
    """豆瓣影视搜索，返回结果列表"""
    url = "https://movie.douban.com/j/subject_suggest?q={}".format(urllib.parse.quote(query))
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://movie.douban.com/",
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        results = []
        for item in data:
            if item.get("type") in ("movie", "tv"):
                results.append({
                    "title": item.get("title", ""),
                    "year": item.get("year", ""),
                    "poster_url": item.get("img", ""),
                    "id": item.get("id", ""),
                    "sub_title": item.get("sub_title", ""),
                    "source": "douban",
                })
        return results
    except Exception as e:
        print("  豆瓣搜索失败: {}".format(e))
        return []


def douban_get_detail(subject_id):
    """获取豆瓣影视详情"""
    url = "https://movie.douban.com/j/subject_abstract?subject_id={}".format(subject_id)
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://movie.douban.com/",
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data.get("subject", {})
    except Exception as e:
        print("  豆瓣详情获取失败: {}".format(e))
        return {}


# ── Bangumi 搜索 ──────────────────────────────────────

def bangumi_search(query):
    """Bangumi 动漫搜索，返回结果列表"""
    url = "https://api.bgm.tv/search/subject/{}?type=2&limit=10".format(urllib.parse.quote(query))
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        results = []
        for item in data.get("data", []):
            results.append({
                "title": item.get("name", ""),
                "original_title": item.get("name_cn", ""),
                "year": (item.get("date", "") or "")[:4],
                "poster_url": item.get("images", {}).get("large", ""),
                "id": item.get("id", ""),
                "summary": (item.get("summary", "") or "")[:120],
                "source": "bangumi",
            })
        return results
    except Exception as e:
        print("  Bangumi 搜索失败: {}".format(e))
        return []


# ── 搜索与详情 ────────────────────────────────────────

def search_multi(query, api_key):
    """搜索影视，返回结果列表"""
    data = tmdb_request("/search/multi", api_key, {"query": query})
    if not data or "results" not in data:
        return []
    results = []
    for item in data["results"]:
        media_type = item.get("media_type", "")
        if media_type not in ("movie", "tv"):
            continue
        results.append(item)
    return results


def get_movie_detail(movie_id, api_key):
    return tmdb_request("/movie/{}".format(movie_id), api_key)


def get_tv_detail(tv_id, api_key):
    return tmdb_request("/tv/{}".format(tv_id), api_key)


def extract_info(item, api_key):
    """从搜索结果条目提取完整信息"""
    media_type = item.get("media_type", "movie")
    detail = None

    if media_type == "movie":
        detail = get_movie_detail(item["id"], api_key)
        title = detail.get("title", item.get("title", "?")) if detail else item.get("title", "?")
        original_title = detail.get("original_title", "") if detail else ""
        year = (detail.get("release_date", "") or "")[:4] if detail else ""
        genres = detail.get("genres", []) if detail else []
        tagline = detail.get("tagline", "") if detail else ""
    else:
        detail = get_tv_detail(item["id"], api_key)
        title = detail.get("name", item.get("name", "?")) if detail else item.get("name", "?")
        original_title = detail.get("original_name", "") if detail else ""
        year = (detail.get("first_air_date", "") or "")[:4] if detail else ""
        genres = detail.get("genres", []) if detail else []
        tagline = detail.get("tagline", "") if detail else ""

    poster_path = item.get("poster_path") or (detail.get("poster_path") if detail else None)
    overview = detail.get("overview", "") if detail else ""

    return {
        "title": title,
        "original_title": original_title,
        "year": year,
        "media_type": media_type,
        "poster_path": poster_path,
        "genres": genres,
        "overview": overview,
        "tagline": tagline,
    }


# ── 子分类判断 ────────────────────────────────────────

def determine_subcategory(media_type, genres, user_type=None):
    """根据 media_type 和 genre 判断 subcategory"""
    if user_type:
        type_map = {
            "movie": "movie", "tv": "tv",
            "anime": "anime", "documentary": "documentary",
        }
        if user_type in type_map:
            return type_map[user_type]

    genre_names = [g.get("name", "") for g in genres]

    if media_type == "movie":
        if any("动画" in n for n in genre_names):
            return "anime"
        if any("纪录" in n for n in genre_names):
            return "documentary"
        return "movie"
    elif media_type == "tv":
        if any("动画" in n for n in genre_names):
            return "anime"
        if any("纪录" in n for n in genre_names):
            return "documentary"
        return "tv"
    return "movie"


# ── Markdown 生成 ──────────────────────────────────────

def write_markdown(md_path, title, name_cn, category, subcategory, status,
                   image_path, score, tags, published_str, comment):
    if tags:
        tags_block = "tags:\n" + "\n".join("  - {}".format(t) for t in tags)
    else:
        tags_block = "tags: []"
    md = """---
title: {title}
name_cn: {name_cn}
category: {category}
subcategory: {subcategory}
status: {status}
image: {image}
score: {score}
{tags_block}
published: {published}
---
{comment}
""".format(
        title=title,
        name_cn=name_cn,
        category=category,
        subcategory=subcategory,
        status=status,
        image=image_path,
        score=score,
        tags_block=tags_block,
        published=published_str,
        comment=comment,
    )
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md)


# ── 主流程 ────────────────────────────────────────────

def process(query, api_key, user_type=None, fast_mode=False,
            preset_status=None, preset_score=None, cover_url=""):
    """主流程：TMDB → 豆瓣 → Bangumi → 手动模式"""

    # 1. TMDB 搜索
    print("\n[TMDB] 搜索: {}".format(query))
    results = search_multi(query, api_key)

    # 2. TMDB 无结果 → 豆瓣搜索
    if not results:
        print("  TMDB 未找到结果")
        print("\n[豆瓣] 搜索: {}".format(query))
        douban_results = douban_search(query)
        if douban_results:
            print("\n搜索结果 (豆瓣):\n")
            for i, item in enumerate(douban_results[:10]):
                year_str = "({})".format(item["year"]) if item["year"] else ""
                print("  [{:2d}] {} {}".format(i + 1, item["title"], year_str))
                if item.get("sub_title"):
                    print("       {}".format(item["sub_title"]))

            if fast_mode:
                pick = 1
                print("\n快速模式: 自动选择第 1 个")
            else:
                try:
                    choice = input("\n选择序号 (1-{}, 默认 1): ".format(min(len(douban_results), 10))).strip()
                    pick = int(choice) if choice else 1
                    if pick < 1 or pick > min(len(douban_results), 10):
                        print("无效选择")
                        return False
                except (ValueError, KeyboardInterrupt, EOFError):
                    print()
                    pick = 1

            selected = douban_results[pick - 1]
            return process_douban(selected, user_type, fast_mode, preset_status, preset_score, cover_url)
        else:
            print("  豆瓣也未找到结果")

    # 3. TMDB 和豆瓣都无结果 → Bangumi 搜索
    if not results:
        print("\n[Bangumi] 搜索: {}".format(query))
        bangumi_results = bangumi_search(query)
        if bangumi_results:
            print("\n搜索结果 (Bangumi):\n")
            for i, item in enumerate(bangumi_results[:10]):
                year_str = "({})".format(item["year"]) if item["year"] else ""
                title_display = item["original_title"] or item["title"]
                print("  [{:2d}] {} {}".format(i + 1, title_display, year_str))
                if item.get("summary"):
                    print("       {}...".format(item["summary"][:80]))

            if fast_mode:
                pick = 1
                print("\n快速模式: 自动选择第 1 个")
            else:
                try:
                    choice = input("\n选择序号 (1-{}, 默认 1): ".format(min(len(bangumi_results), 10))).strip()
                    pick = int(choice) if choice else 1
                    if pick < 1 or pick > min(len(bangumi_results), 10):
                        print("无效选择")
                        return False
                except (ValueError, KeyboardInterrupt, EOFError):
                    print()
                    pick = 1

            selected = bangumi_results[pick - 1]
            return process_bangumi(selected, user_type, fast_mode, preset_status, preset_score, cover_url)
        else:
            print("  Bangumi 也未找到结果，切换到手动模式")
            return process_manual(query, user_type, fast_mode, preset_status, preset_score, cover_url)

    # 2. 展示结果
    print("\n搜索结果:\n")
    display_results = results[:10]
    for i, item in enumerate(display_results):
        media_type = item.get("media_type", "?")
        type_tag = "[电影]" if media_type == "movie" else "[剧集]" if media_type == "tv" else "[?]"
        t = item.get("title") or item.get("name") or "?"
        year = (item.get("release_date") or item.get("first_air_date") or "")[:4]
        year_str = "({})".format(year) if year else ""
        overview = (item.get("overview") or "")[:80]
        print("  [{:2d}] {} {} {}".format(i + 1, type_tag, t, year_str))
        if overview:
            print("       {}".format(overview))

    # 3. 选择
    if len(display_results) == 1:
        pick = 1
    elif fast_mode:
        pick = 1
        print("\n快速模式: 自动选择第 1 个")
    else:
        try:
            choice = input("\n选择序号 (1-{}, 默认 1): ".format(len(display_results))).strip()
            pick = int(choice) if choice else 1
            if pick < 1 or pick > len(display_results):
                print("无效选择")
                return False
        except (ValueError, KeyboardInterrupt, EOFError):
            print()
            pick = 1

    selected = display_results[pick - 1]
    print("\n获取详情...")

    # 4. 获取详情
    info = extract_info(selected, api_key)

    title = info["title"]
    original_title = info["original_title"]
    year = info["year"]
    media_type = info["media_type"]
    poster_path = info["poster_path"]
    overview = info["overview"]
    tagline = info["tagline"]

    # 类型标签（从 genre 获取中文名，取前 5 个）
    genre_tags = [g.get("name", "") for g in info["genres"] if g.get("name")]
    if not genre_tags:
        genre_tags = ["电影"] if media_type == "movie" else ["剧集"]

    subcategory = determine_subcategory(media_type, info["genres"], user_type)

    print("\n" + "=" * 50)
    print("  标题: {}".format(title))
    if original_title and original_title != title:
        print("  原名: {}".format(original_title))
    print("  类型: {} → subcategory: {}".format(
        "电影" if media_type == "movie" else "电视剧", subcategory))
    if year:
        print("  年份: {}".format(year))
    if tagline:
        print("  标语: {}".format(tagline))
    print("  标签: {}".format(", ".join(genre_tags)))
    if overview:
        print("  简介: {}...".format(overview[:120]))
    print("=" * 50)

    # 5. 上传封面到图床（获取真实可访问 URL，不落本地）
    poster_url = ""
    if poster_path:
        poster_url = "{}{}".format(TMDB_IMAGE_BASE, poster_path)
    image_path = upload_cover_to_imgbed(poster_url, title)

    if fast_mode:
        status = preset_status or 2
        score = preset_score or 0
        tags = genre_tags
        comment = ""
        print("\n快速模式: status={}({}), score={}, tags={}".format(
            status, STATUS_LABELS.get(status, "?"), score, tags))
    else:
        # status
        print("\n状态: {}".format(STATUS_PROMPT))
        if preset_status:
            status = preset_status
            print("  [预设] status = {} ({})".format(status, STATUS_LABELS.get(status, "?")))
        else:
            try:
                s = input("  选择状态 (默认 2): ").strip()
                status = int(s) if s else 2
            except (ValueError, EOFError):
                status = 2

        # score
        if preset_score is not None:
            score = preset_score
            print("  [预设] score = {}".format(score))
        else:
            try:
                s = input("  评分 0-10 (默认 0): ").strip()
                score = int(s) if s else 0
            except (ValueError, EOFError):
                score = 0

        # tags
        print("  当前标签: {}".format(", ".join(genre_tags)))
        t = input("  修改标签 (回车确认，逗号分隔): ").strip()
        if t:
            tags = [x.strip() for x in t.split(",") if x.strip()]
        else:
            tags = genre_tags

        # comment
        comment = input("  评价/备注 (可选): ").strip()

    # 6. 生成 md
    os.makedirs(BLOG_BANGUMI_DIR, exist_ok=True)
    md_file = "{}.md".format(title)
    md_path = os.path.join(BLOG_BANGUMI_DIR, md_file)

    # name_cn: 如果 title 是中文则 title 即为 name_cn，否则用 original_title
    name_cn = title
    published_str = date.today().isoformat()
    category = "anime"  # bangumi 中影视统一用 anime 类别

    if os.path.exists(md_path):
        print("  [跳过] 已有 md: {}".format(md_file))
    else:
        write_markdown(md_path, title, name_cn, category, subcategory, status,
                       image_path, score, tags, published_str, comment)
        print("  [MD] {}".format(md_file))

    print("\n完成: {}".format(title))
    return True


# ── 豆瓣模式 ────────────────────────────────────────────

def process_douban(selected, user_type=None, fast_mode=False,
                   preset_status=None, preset_score=None, cover_url=""):
    """处理豆瓣搜索结果"""
    title = selected["title"]
    year = selected.get("year", "")
    poster_url = selected.get("poster_url", "")

    # 获取详情
    detail = douban_get_detail(selected["id"]) if selected.get("id") else {}
    genres = detail.get("genres", [])
    genre_tags = genres if genres else ["电影"]

    subcategory = user_type or "movie"
    if any("纪录" in g for g in genre_tags):
        subcategory = "documentary"
    elif any("动画" in g for g in genre_tags):
        subcategory = "anime"

    print("\n" + "=" * 50)
    print("  标题: {}".format(title))
    print("  来源: 豆瓣")
    if year:
        print("  年份: {}".format(year))
    print("  标签: {}".format(", ".join(genre_tags)))
    print("=" * 50)

    return finalize(title, title, subcategory, genre_tags, poster_url,
                    fast_mode, preset_status, preset_score, cover_url)


# ── Bangumi 模式 ────────────────────────────────────────

def process_bangumi(selected, user_type=None, fast_mode=False,
                    preset_status=None, preset_score=None, cover_url=""):
    """处理 Bangumi 搜索结果"""
    title = selected["original_title"] or selected["title"]
    year = selected.get("year", "")
    poster_url = selected.get("poster_url", "")

    genre_tags = ["动漫"]
    subcategory = user_type or "anime"

    print("\n" + "=" * 50)
    print("  标题: {}".format(title))
    print("  来源: Bangumi")
    if year:
        print("  年份: {}".format(year))
    print("  标签: {}".format(", ".join(genre_tags)))
    print("=" * 50)

    return finalize(title, title, subcategory, genre_tags, poster_url,
                    fast_mode, preset_status, preset_score, cover_url)


# ── 公共收尾逻辑 ─────────────────────────────────────────

def finalize(title, name_cn, subcategory, genre_tags, poster_url,
             fast_mode=False, preset_status=None, preset_score=None, cover_url=""):
    """公共收尾：确认字段 → 下载封面 → 生成 md"""

    if fast_mode:
        status = preset_status or 2
        score = preset_score or 0
        tags = genre_tags
        comment = ""
        print("\n快速模式: status={}({}), score={}, tags={}".format(
            status, STATUS_LABELS.get(status, "?"), score, tags))
    else:
        print("\n状态: {}".format(STATUS_PROMPT))
        if preset_status:
            status = preset_status
            print("  [预设] status = {} ({})".format(status, STATUS_LABELS.get(status, "?")))
        else:
            try:
                s = input("  选择状态 (默认 2): ").strip()
                status = int(s) if s else 2
            except (ValueError, EOFError):
                status = 2

        if preset_score is not None:
            score = preset_score
            print("  [预设] score = {}".format(score))
        else:
            try:
                s = input("  评分 0-10 (默认 0): ").strip()
                score = int(s) if s else 0
            except (ValueError, EOFError):
                score = 0

        print("  当前标签: {}".format(", ".join(genre_tags)))
        t = input("  修改标签 (回车确认，逗号分隔): ").strip()
        if t:
            tags = [x.strip() for x in t.split(",") if x.strip()]
        else:
            tags = genre_tags

        comment = input("  评价/备注 (可选): ").strip()

    # 上传封面到图床（获取真实可访问 URL，不落本地）
    image_path = upload_cover_to_imgbed(cover_url or poster_url, title)

    # 生成 md
    os.makedirs(BLOG_BANGUMI_DIR, exist_ok=True)
    md_file = "{}.md".format(title)
    md_path = os.path.join(BLOG_BANGUMI_DIR, md_file)

    if os.path.exists(md_path):
        print("  [跳过] 已有 md: {}".format(md_file))
    else:
        write_markdown(md_path, title, name_cn, "anime", subcategory, status,
                       image_path, score, tags, date.today().isoformat(), comment)
        print("  [MD] {}".format(md_file))

    print("\n完成: {}".format(title))
    return True


# ── 手动模式 ────────────────────────────────────────────

def process_manual(title, user_type=None, fast_mode=False,
                   preset_status=None, preset_score=None, cover_url=""):
    print("\n" + "=" * 50)
    print("  标题: {}".format(title))
    print("=" * 50)

    if fast_mode:
        subcategory = user_type or "movie"
        status = preset_status or 2
        score = preset_score or 0
        tags = []
        comment = ""
        cover_url_input = cover_url
        print("快速模式: subcategory={}, status={}({}), score={}".format(
            subcategory, status, STATUS_LABELS.get(status, "?"), score))
    else:
        # subcategory
        print("\n类型: movie=电影 / tv=电视剧 / anime=动画 / documentary=纪录片")
        sc = input("  选择类型 (默认 movie): ").strip()
        subcategory = sc if sc in ("movie", "tv", "anime", "documentary") else "movie"

        # status
        print("状态: {}".format(STATUS_PROMPT))
        if preset_status:
            status = preset_status
            print("  [预设] status = {} ({})".format(status, STATUS_LABELS.get(status, "?")))
        else:
            try:
                s = input("  选择状态 (默认 2): ").strip()
                status = int(s) if s else 2
            except (ValueError, EOFError):
                status = 2

        # score
        if preset_score is not None:
            score = preset_score
            print("  [预设] score = {}".format(score))
        else:
            try:
                s = input("  评分 0-10 (默认 0): ").strip()
                score = int(s) if s else 0
            except (ValueError, EOFError):
                score = 0

        # tags
        t = input("  标签 (逗号分隔): ").strip()
        tags = [x.strip() for x in t.split(",") if x.strip()] if t else []

        # comment
        comment = input("  评价/备注 (可选): ").strip()

        # cover URL (可选)
        cover_url_input = input("  封面图 URL (可选，回车跳过): ").strip()

    # 上传封面到图床（如果提供了 URL；获取真实可访问 URL，不落本地）
    if not cover_url_input and fast_mode:
        print("  封面: [无] (手动模式下用 --cover-url= 参数传入)")
    image_path = upload_cover_to_imgbed(cover_url_input, title)

    # 生成 md
    os.makedirs(BLOG_BANGUMI_DIR, exist_ok=True)
    md_file = "{}.md".format(title)
    md_path = os.path.join(BLOG_BANGUMI_DIR, md_file)

    if os.path.exists(md_path):
        print("  [跳过] 已有 md: {}".format(md_file))
    else:
        write_markdown(md_path, title, title, "anime", subcategory, status,
                       image_path, score, tags, date.today().isoformat(), comment)
        print("  [MD] {}".format(md_file))

    print("\n完成: {}".format(title))
    return True


# ── main ──────────────────────────────────────────────

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__.strip())
        sys.exit(0)

    query = sys.argv[1]
    api_key = None
    user_type = None
    fast_mode = False
    preset_status = None
    preset_score = None
    cover_url = ""

    for a in sys.argv[2:]:
        if a.startswith("--api-key="):
            api_key = a.split("=", 1)[1]
        elif a.startswith("--type="):
            user_type = a.split("=", 1)[1]
        elif a in ("-y", "--yes"):
            fast_mode = True
        elif a.startswith("--status="):
            try:
                preset_status = int(a.split("=", 1)[1])
            except ValueError:
                print("无效 status: {}".format(a))
                sys.exit(1)
        elif a.startswith("--score="):
            try:
                preset_score = int(a.split("=", 1)[1])
            except ValueError:
                print("无效 score: {}".format(a))
                sys.exit(1)
        elif a.startswith("--cover-url="):
            cover_url = a.split("=", 1)[1]

    # API key 优先级: 命令行参数 > 环境变量 > 内置 key
    if not api_key:
        api_key = os.environ.get("TMDB_API_KEY", "")
    if not api_key:
        api_key = TMDB_API_KEY

    process(query, api_key, user_type, fast_mode, preset_status, preset_score, cover_url)


if __name__ == "__main__":
    main()
