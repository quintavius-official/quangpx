#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "python-substack>=0.3.0",
#     "pyyaml>=6.0",
#     "python-dotenv>=1.0.0",
#     "curl-cffi>=0.7.0",
# ]
# ///

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dotenv import load_dotenv

# Monkey-patch requests.Session with curl_cffi to bypass Cloudflare bot challenge in CI
try:
    import curl_cffi.requests as cffi_requests
    import substack.api

    class ImpersonatedSession(cffi_requests.Session):
        def __init__(self, *args, **kwargs):
            kwargs.setdefault("impersonate", "chrome")
            super().__init__(*args, **kwargs)

        def mount(self, prefix, adapter):
            pass

    substack.api.requests.Session = ImpersonatedSession
    print("[+] Successfully monkey-patched substack with curl_cffi (Chrome impersonation).")
except Exception as e:
    print(f"[-] Warning: Failed to initialize curl_cffi: {e}")



def parse_frontmatter(content: str) -> Tuple[Dict, str]:
    """Parse YAML frontmatter and return (metadata, markdown_body)."""
    if not content.startswith("---"):
        return {}, content
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content

    frontmatter_raw = parts[1]
    body = parts[2].strip()

    import yaml
    try:
        metadata = yaml.safe_load(frontmatter_raw) or {}
    except Exception:
        metadata = {}
    return metadata, body

def upload_local_images(api, body: str, base_dir: Path) -> str:
    """Find local images in markdown, upload them to Substack S3, and replace with CDN URLs."""
    uploaded_cache = {}

    def replace_img(match):
        alt = match.group(1)
        src = match.group(2).strip()

        # If it's already an http/https URL, leave it as is
        if src.startswith("http://") or src.startswith("https://"):
            return match.group(0)

        # Resolve local file
        local_path = (base_dir / src).resolve()
        if not local_path.exists():
            cleaned_src = src.lstrip("./")
            local_path = (base_dir / cleaned_src).resolve()

        if local_path.exists():
            path_str = str(local_path)
            if path_str in uploaded_cache:
                s3_url = uploaded_cache[path_str]
            else:
                print(f"[*] Uploading local image to Substack S3: {local_path.name}...")
                upload_res = api.get_image(path_str)
                s3_url = upload_res.get("url")
                if s3_url:
                    uploaded_cache[path_str] = s3_url
                    print(f"[+] Image uploaded successfully -> {s3_url}")
                else:
                    print(f"[-] Warning: Failed to retrieve S3 URL for {local_path.name}")
                    return match.group(0)

            return f"![{alt}]({s3_url})"

        return match.group(0)

    # Replace markdown image syntax ![alt](path)
    return re.sub(r'!\[(.*?)\]\((.*?)\)', replace_img, body)

def process_markdown_links_and_footer(body: str, pub_url: str, add_footer: bool = True) -> str:
    """
    1. Replaces internal blog links (e.g. /vi/posts/<slug>) with Substack URLs.
    2. Sanitizes unsupported inline LaTeX math arrows (e.g. $\\rightarrow$).
    3. Optionally appends neutral footer note pointing to quangpx.com.
    """
    # 1. Convert internal post links to Substack URLs
    body = re.sub(
        r'\]\((?:https://quangpx\.com)?/(?:vi|en)/posts/([a-zA-Z0-9_-]+)\)',
        rf']({pub_url}/p/\1)',
        body
    )

    # 2. Sanitize inline LaTeX arrows/math that break Substack's ProseMirror schema
    body = re.sub(r'\$\s*\\rightarrow\s*\$', '→', body)
    body = re.sub(r'\$\s*\\leftarrow\s*\$', '←', body)
    body = re.sub(r'\$\s*\\Rightarrow\s*\$', '⇒', body)
    body = re.sub(r'\$\s*\\Leftarrow\s*\$', '⇐', body)

    # 3. Add neutral footer note if requested and not already present
    if add_footer:
        footer_text = "\n\n---\n\n*Đọc thêm các bài viết khác của tác giả tại [quangpx.com](https://quangpx.com).*"
        if "*Đọc thêm các bài viết khác" not in body:
            body = body + footer_text

    return body

def get_substack_api():
    """Initializes and returns a Substack Api client using environment variables."""
    load_dotenv()
    
    pub_url = os.getenv("PUBLICATION_URL", "https://quangpx.substack.com")
    cookies_string = os.getenv("COOKIES_STRING") or os.getenv("SUBSTACK_COOKIES")
    cookies_path = os.getenv("COOKIES_PATH")
    email = os.getenv("EMAIL")
    password = os.getenv("PASSWORD")

    if not (cookies_string or cookies_path or (email and password)):
        print("[-] Error: Missing Substack credentials in environment or .env (COOKIES_STRING / SUBSTACK_COOKIES).")
        sys.exit(1)

    from substack import Api
    api = Api(
        cookies_string=cookies_string,
        cookies_path=cookies_path,
        email=email,
        password=password,
        publication_url=pub_url,
    )
    return api, pub_url

def process_post(
    api,
    file_path: Path,
    pub_url: str,
    published_posts_map: Dict[str, int],
    publish_now: bool = True,
    dry_run: bool = False,
    target_lang: str = "vi",
    include_drafts: bool = False,
) -> Optional[str]:
    """
    Processes a single markdown file: checks frontmatter, uploads images, formats links,
    and creates or updates the post on Substack.
    Returns: 'created', 'updated', 'skipped', or None on failure.
    """
    if not file_path.exists() or not file_path.suffix.lower() == ".md":
        print(f"[-] Skipping non-markdown or non-existent file: {file_path}")
        return "skipped"

    raw_content = file_path.read_text(encoding="utf-8")
    metadata, raw_body = parse_frontmatter(raw_content)

    title = metadata.get("title", file_path.stem)
    subtitle = metadata.get("description", "")
    tags = metadata.get("tags", [])
    slug = metadata.get("postSlug", file_path.stem)
    is_draft = metadata.get("draft", False)
    post_lang = metadata.get("lang", "")

    # Language filter
    if target_lang != "any" and post_lang and post_lang != target_lang:
        print(f"[*] Skipping {file_path.name} (lang: '{post_lang}', target: '{target_lang}')")
        return "skipped"

    # Draft filter
    if is_draft and not include_drafts:
        print(f"[*] Skipping draft post: {file_path.name} (draft: true)")
        return "skipped"

    print(f"\n==================================================")
    print(f"[*] Processing: {title} (slug: {slug})")
    print(f"    Source: {file_path}")

    if dry_run:
        status = "UPDATE" if slug in published_posts_map else "CREATE"
        print(f"[DRY-RUN] Action: {status} on Substack (ID: {published_posts_map.get(slug, 'new')})")
        return "updated" if status == "UPDATE" else "created"

    from substack.post import Post

    # Upload local images and format content
    content = upload_local_images(api, raw_body, file_path.parent)
    content = process_markdown_links_and_footer(content, pub_url)

    existing_id = published_posts_map.get(slug)

    # Build post object
    post = Post(
        title=title,
        subtitle=subtitle or "",
        user_id=api.get_user_id(),
        audience="everyone",
        write_comment_permissions="everyone",
    )
    post.from_markdown(content, api=api)
    draft_dict = post.get_draft()

    if existing_id:
        print(f"[*] Updating existing post #{existing_id} ('{title}')...")
        api.put_draft(
            existing_id,
            draft_title=title,
            draft_subtitle=subtitle or "",
            draft_body=draft_dict["draft_body"],
            search_engine_title=title,
            search_engine_description=subtitle or "",
        )
        if publish_now:
            api.publish_draft(existing_id, send=False)
        print(f"[+] Successfully updated: '{title}' -> {pub_url}/p/{slug}")
        return "updated"
    else:
        print(f"[*] Creating & publishing new post: '{title}'...")
        primary_tags = tags[:1] if tags else None
        result = api.create_draft_from_markdown(
            title=title,
            markdown=content,
            subtitle=subtitle,
            slug=slug,
            tags=primary_tags,
            publish=publish_now,
            send=False,
        )
        draft = result.get("draft", {})
        canonical_slug = draft.get("slug", slug)
        print(f"[+] Successfully published: '{title}' -> {pub_url}/p/{canonical_slug}")
        return "created"

def update_about_page(api, pub_url: str, about_path: Path, dry_run: bool = False) -> bool:
    """Updates Substack publication's subscribe_content (About page) from markdown."""
    if not about_path.exists():
        print(f"[-] About file not found: {about_path}")
        return False

    print(f"\n==================================================")
    print(f"[*] Updating Substack About page from: {about_path}")

    raw_content = about_path.read_text(encoding="utf-8")
    metadata, body = parse_frontmatter(raw_content)

    if dry_run:
        print("[DRY-RUN] Action: UPDATE Substack About page (subscribe_content)")
        return True

    from substack.post import Post

    content = upload_local_images(api, body, about_path.parent)
    content = process_markdown_links_and_footer(content, pub_url, add_footer=False)

    post = Post(
        title=metadata.get("title", "About"),
        subtitle=metadata.get("description", ""),
        user_id=api.get_user_id(),
        audience="everyone",
        write_comment_permissions="everyone",
    )
    post.from_markdown(content, api=api)
    draft_body = post.get_draft()["draft_body"]

    res = api._session.put(
        f"{pub_url.rstrip('/')}/api/v1/publication",
        json={"subscribe_content": draft_body},
    )
    if res.status_code == 200:
        print(f"[+] Successfully updated About page -> {pub_url}/about")
        return True
    else:
        print(f"[-] Error updating About page ({res.status_code}): {res.text[:200]}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Publish or update posts to Substack from Markdown files.")
    parser.add_argument("files", nargs="*", help="Markdown file(s) to publish/update")
    parser.add_argument("--all", action="store_true", help="Process all posts in src/content/posts")
    parser.add_argument("--about", action="store_true", help="Sync About page (src/content/pages/about-substack.md) to Substack")
    parser.add_argument("--lang", default="vi", help="Language filter ('vi', 'en', or 'any'). Default: 'vi'")
    parser.add_argument("--include-drafts", action="store_true", help="Include files with draft: true in frontmatter")
    parser.add_argument("--draft-only", action="store_true", help="Save to Substack as draft without publishing live")
    parser.add_argument("--dry-run", action="store_true", help="Preview actions without updating Substack")
    args = parser.parse_args()

    # Determine files to process
    target_files: List[Path] = []
    if args.about:
        about_file = Path("src/content/pages/about-substack.md").resolve()
        api, pub_url = get_substack_api()
        success = update_about_page(api, pub_url, about_file, dry_run=args.dry_run)
        if not args.all and not args.files:
            sys.exit(0 if success else 1)

    if args.all:
        posts_dir = Path("src/content/posts").resolve()
        if posts_dir.exists():
            target_files = sorted(list(posts_dir.glob("*.md")))
        else:
            print(f"[-] Directory not found: {posts_dir}")
            sys.exit(1)
    elif args.files:
        for f in args.files:
            p = Path(f).resolve()
            if p.exists() and p.is_file():
                target_files.append(p)
            elif p.is_dir():
                target_files.extend(sorted(list(p.glob("*.md"))))
            else:
                print(f"[-] Warning: File or directory not found: {f}")
    elif not args.about:
        parser.print_help()
        sys.exit(0)

    if not target_files:
        print("[-] No markdown files found to process.")
        sys.exit(0)

    print(f"[*] Found {len(target_files)} candidate markdown file(s).")

    # Connect to Substack API
    api, pub_url = get_substack_api()

    # Cache published posts to map slug -> post id
    published_map = {}
    try:
        print("[*] Fetching existing published posts from Substack...")
        res = api.get_published_posts()
        for p in res.get("posts", []):
            slug = p.get("slug")
            if slug:
                published_map[slug] = p.get("id")
        print(f"[+] Found {len(published_map)} existing post(s) on Substack.")
    except Exception as e:
        print(f"[-] Warning fetching existing posts: {e}")

    counts = {"created": 0, "updated": 0, "skipped": 0, "failed": 0}
    publish_now = not args.draft_only

    for file_path in target_files:
        try:
            res = process_post(
                api=api,
                file_path=file_path,
                pub_url=pub_url,
                published_posts_map=published_map,
                publish_now=publish_now,
                dry_run=args.dry_run,
                target_lang=args.lang,
                include_drafts=args.include_drafts,
            )
            if res in counts:
                counts[res] += 1
            else:
                counts["failed"] += 1
        except Exception as e:
            print(f"[-] Error processing {file_path.name}: {e}")
            counts["failed"] += 1

    print("\n==================================================")
    print(f"[*] Done! Summary: {counts['created']} created, {counts['updated']} updated, {counts['skipped']} skipped, {counts['failed']} failed.")
    if counts["failed"] > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
