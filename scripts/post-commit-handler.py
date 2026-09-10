#!/usr/bin/env python3
"""
Post-Commit Hook Handler for QuangPX Blog.

Triggers automated distribution workflows based on post frontmatter:
1. substack: true -> Publish / update post on Substack
2. tiktok_photo: true -> Generate photo carousel & schedule TikTok post (using pubDatetime)
"""

import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import zoneinfo

# Ensure unbuffered standard output for real-time console streaming in git hooks
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True)

# Ensure standard Homebrew and local user paths are available in PATH
EXTRA_PATHS = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    str(Path.home() / ".local/bin"),
    str(Path.home() / ".cargo/bin"),
]
for p in EXTRA_PATHS:
    if p not in os.environ.get("PATH", ""):
        os.environ["PATH"] = f"{p}:{os.environ.get('PATH', '')}"

ROOT_DIR = Path(__file__).resolve().parent.parent
LOCAL_TZ = zoneinfo.ZoneInfo("Asia/Ho_Chi_Minh")


def find_binary(name: str) -> str:
    """Find absolute path to binary, checking PATH and common macOS locations."""
    found = shutil.which(name)
    if found:
        return found
    candidates = [
        Path.home() / ".local" / "bin" / name,
        Path.home() / ".cargo" / "bin" / name,
        Path("/opt/homebrew/bin") / name,
        Path("/usr/local/bin") / name,
        Path("/usr/bin") / name,
    ]
    for c in candidates:
        if c.exists() and os.access(c, os.X_OK):
            return str(c)
    return name



def parse_frontmatter(content: str) -> Tuple[Dict, str]:
    """Parse YAML frontmatter from markdown."""
    if not content.startswith("---"):
        return {}, content
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content

    import yaml
    try:
        data = yaml.safe_load(parts[1]) or {}
    except Exception as e:
        print(f"[-] Warning: Failed to parse YAML frontmatter: {e}")
        data = {}
    return data, parts[2]


def calculate_schedule(pub_datetime_val) -> Tuple[str, str]:
    """
    Derives valid schedule date (YYYY-MM-DD) and time (HH:MM) from pubDatetime for TikTok Studio.
    Ensures schedule is at least 15 minutes in advance and within TikTok limits.
    """
    now_local = datetime.now(LOCAL_TZ)

    dt = None
    if isinstance(pub_datetime_val, datetime):
        dt = pub_datetime_val
    elif pub_datetime_val:
        clean_str = str(pub_datetime_val).strip()
        try:
            dt = datetime.fromisoformat(clean_str.replace("Z", "+00:00"))
        except Exception:
            try:
                dt = datetime.strptime(clean_str[:10], "%Y-%m-%d")
            except Exception:
                dt = now_local
    else:
        dt = now_local

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=LOCAL_TZ)
    else:
        dt = dt.astimezone(LOCAL_TZ)

    target_date = dt.date()
    today_date = now_local.date()

    # If published date was in the past, schedule for today
    if target_date < today_date:
        target_date = today_date

    # Determine hour and minute
    # If explicit time was specified (not 00:00 and not 07:00 from UTC midnight)
    has_explicit_time = (dt.hour not in (0, 7)) or (dt.minute != 0)
    if has_explicit_time and target_date > today_date:
        minute = round(dt.minute / 5.0) * 5
        hour = dt.hour
        if minute == 60:
            minute = 0
            hour = (hour + 1) % 24
        target_time = f"{hour:02d}:{minute:02d}"
    else:
        # Default evening prime posting time: 20:00
        target_time = "20:00"

    # TikTok requires scheduling at least 15 minutes in advance
    target_dt = datetime.combine(
        target_date,
        datetime.strptime(target_time, "%H:%M").time(),
        tzinfo=LOCAL_TZ,
    )
    if target_dt <= now_local + timedelta(minutes=15):
        suggested = now_local + timedelta(minutes=30)
        s_min = (suggested.minute // 5 + 1) * 5
        s_hour = suggested.hour
        if s_min >= 60:
            s_min = 0
            s_hour = (s_hour + 1) % 24
        target_time = f"{s_hour:02d}:{s_min:02d}"
        target_date = suggested.date()

    return target_date.strftime("%Y-%m-%d"), target_time


def resolve_slug(meta: Dict, file_path: Path) -> str:
    """Extract canonical slug from metadata or filename."""
    if meta.get("postSlug"):
        return meta["postSlug"]
    stem = file_path.stem
    for suffix in ("-vi", "-en", "-vietnamese", "-english"):
        if stem.endswith(suffix):
            return stem[: -len(suffix)]
    return stem


def handle_substack(file_path: Path):
    """Publish or update single post on Substack."""
    print(f"\n[Substack] 📡 Publishing post to Substack: {file_path.name}")
    script_path = ROOT_DIR / "scripts" / "publish-substack.py"
    uv_bin = find_binary("uv")
    cmd = [uv_bin, "run", str(script_path), str(file_path.resolve())]
    try:
        subprocess.run(cmd, check=True, cwd=ROOT_DIR)
        print(f"[Substack] [+] Successfully synced {file_path.name} to Substack.")
    except subprocess.CalledProcessError as e:
        print(f"[Substack] [-] Failed to publish {file_path.name} to Substack (exit {e.returncode}).")


def handle_tiktok(meta: Dict, file_path: Path):
    """Generate carousel slides and schedule post to TikTok Studio."""
    slug = resolve_slug(meta, file_path)
    print(f"\n[TikTok] 🎬 Initiating TikTok Carousel workflow for slug: '{slug}'")

    # 1. Generate carousel slides from markdown
    print(f"[TikTok] 📸 Generating carousel slides (node scripts/generate-carousel.js {slug} --from-md)...")
    gen_script = ROOT_DIR / "scripts" / "generate-carousel.js"
    node_bin = find_binary("node")
    try:
        subprocess.run([node_bin, str(gen_script), slug, "--from-md"], check=True, cwd=ROOT_DIR)
        print(f"[TikTok] [+] Carousel slides generated successfully.")
    except subprocess.CalledProcessError as e:
        print(f"[TikTok] [-] Failed to generate carousel for {slug} (exit {e.returncode}).")
        return

    # 2. Calculate schedule time from pubDatetime
    pub_val = meta.get("pubDatetime")
    sched_date, sched_time = calculate_schedule(pub_val)
    print(f"[TikTok] 🕒 Target schedule time: {sched_date} at {sched_time} (from pubDatetime: {pub_val})")

    # 3. Schedule post via Chrome CDP
    print(f"[TikTok] 🚀 Scheduling post on TikTok Studio...")
    pub_script = ROOT_DIR / "scripts" / "publish-tiktok.py"
    py_bin = sys.executable or find_binary("python3")
    sound = meta.get("tiktok_sound") or meta.get("sound") or "Dark and mysterious trap beat"
    post_cmd = [
        py_bin,
        str(pub_script),
        "post",
        "--slug",
        slug,
        "--schedule-date",
        sched_date,
        "--schedule-time",
        sched_time,
        "--sound",
        str(sound),
    ]
    try:
        subprocess.run(post_cmd, check=True, cwd=ROOT_DIR)
        print(f"[TikTok] [+] Successfully scheduled '{slug}' on TikTok for {sched_date} {sched_time}!")
    except subprocess.CalledProcessError as e:
        print(f"[TikTok] [-] Failed to schedule post on TikTok (exit {e.returncode}).")
        print(f"[TikTok] 💡 Mẹo: Đảm bảo Chrome (Profile 5) đang chạy và đã đăng nhập TikTok Studio.")
        print(f"[TikTok] 💡 Bạn cũng có thể chạy lệnh thủ công bất cứ lúc nào:")
        print(f"         {py_bin} scripts/publish-tiktok.py post --slug {slug} --schedule-date {sched_date} --schedule-time {sched_time}")



def get_changed_files_from_git() -> List[Path]:
    """Inspect git HEAD commit for modified markdown files."""
    try:
        res = subprocess.run(
            ["git", "diff-tree", "-r", "--no-commit-id", "--name-only", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
            cwd=ROOT_DIR,
        )
        changed = [ROOT_DIR / line.strip() for line in res.stdout.strip().splitlines() if line.strip()]
        return changed
    except Exception as e:
        print(f"[-] Warning: Failed to query git diff-tree: {e}")
        return []


def main():
    # Allow passing explicit files as CLI arguments
    if len(sys.argv) > 1:
        target_files = [Path(p).resolve() for p in sys.argv[1:]]
    else:
        target_files = get_changed_files_from_git()

    # Check for Substack About page update
    about_path = ROOT_DIR / "src" / "content" / "pages" / "about-substack.md"
    if about_path in target_files and about_path.exists():
        print("[*] Detected change in Substack About page. Syncing...")
        try:
            subprocess.run(
                ["uv", "run", str(ROOT_DIR / "scripts" / "publish-substack.py"), "--about"],
                cwd=ROOT_DIR,
            )
        except Exception as e:
            print(f"[-] Failed to sync about page: {e}")

    # Filter to posts in src/content/posts/*.md
    post_files = [
        f for f in target_files
        if f.exists()
        and f.suffix.lower() == ".md"
        and "src/content/posts" in str(f)
    ]

    if not post_files:
        # Nothing to do
        sys.exit(0)

    print("\n" + "=" * 60)
    print("🚀 [Post-Commit Hook] Processing committed blog posts...")
    print("=" * 60)

    for pfile in post_files:
        try:
            content = pfile.read_text(encoding="utf-8")
            meta, _ = parse_frontmatter(content)
        except Exception as e:
            print(f"[-] Error reading {pfile.name}: {e}")
            continue

        title = meta.get("title", pfile.stem)
        is_draft = meta.get("draft", False)
        do_substack = bool(meta.get("substack", False))
        do_tiktok = bool(meta.get("tiktok_photo", False))

        print(f"\n📄 Inspecting: {title} ({pfile.name})")
        print(f"   - draft:        {is_draft}")
        print(f"   - substack:     {do_substack}")
        print(f"   - tiktok_photo: {do_tiktok}")

        if is_draft:
            print(f"   [*] Skipping draft post.")
            continue

        # 1. Substack workflow
        if do_substack:
            handle_substack(pfile)
        else:
            print(f"   [*] Substack: OFF (substack: false)")

        # 2. TikTok Carousel workflow
        if do_tiktok:
            handle_tiktok(meta, pfile)
        else:
            print(f"   [*] TikTok:   OFF (tiktok_photo: false)")

    print("\n" + "=" * 60)
    print("✅ [Post-Commit Hook] All tasks completed.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
