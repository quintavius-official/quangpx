#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "tiktok-api-client>=0.0.15",
#     "requests>=2.31.0",
#     "python-dotenv>=1.0.0",
# ]
# ///

"""
publish-tiktok.py
-----------------
Automated TikTok Photo Mode (Carousel) publishing tool for QuangPX blog.
Supports 2 publishing methods:
  1. browser (default): Uses Chrome DevTools Protocol (CDP) to upload slides via your logged-in
                        Chrome Default profile in TikTok Studio without needing API approval.
  2. api: Uses the official TikTok Content Posting API via the tiktok-api-client library.

Usage:
  # Browser method (default, uses Chrome Default profile via CDP)
  uv run scripts/publish-tiktok.py post --slug seniority --dry-run
  uv run scripts/publish-tiktok.py post --slug seniority --title "Seniority trong công sở #career"
  uv run scripts/publish-tiktok.py post --slug seniority --mode DIRECT_POST

  # API method (via TikTok Content Posting API & OAuth)
  uv run scripts/publish-tiktok.py post --method api --slug seniority --dry-run
  uv run scripts/publish-tiktok.py post --method api --slug seniority --title "Seniority trong công sở"
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
from pathlib import Path
try:
    from dotenv import load_dotenv
    ROOT_DIR = Path(__file__).resolve().parent.parent
    load_dotenv(ROOT_DIR / ".env")
except ImportError:
    ROOT_DIR = Path(__file__).resolve().parent.parent

TOKENS_FILE = Path(__file__).resolve().parent / ".tiktok_tokens.json"
AUTH_STATE_FILE = Path(__file__).resolve().parent / ".tiktok_auth_state.json"

try:
    from tiktok_api_client import TikTok
    original_get_creator_info = TikTok.get_creator_info
    def patched_get_creator_info(self):
        try:
            return original_get_creator_info(self)
        except Exception as e:
            if "scope" in str(e).lower() or "403" in str(e):
                return {"creator_avatar_url": "", "creator_nickname": "TikTok Creator", "creator_username": "user"}
            raise e
    if TikTok:
        TikTok.get_creator_info = patched_get_creator_info
except ImportError:
    TikTok = None


def natural_sort_key(s: str):
    """Sort strings containing numbers naturally (e.g., slide_1, slide_2, ..., slide_10)."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]


def load_saved_tokens() -> Dict:
    """Load tokens from local cache or environment variables."""
    tokens = {}
    if TOKENS_FILE.exists():
        try:
            with open(TOKENS_FILE, "r", encoding="utf-8") as f:
                tokens = json.load(f)
        except Exception as e:
            print(f"[-] Warning reading {TOKENS_FILE.name}: {e}")

    # Fallback to .env if not found in JSON
    if not tokens.get("access_token") and os.getenv("TIKTOK_ACCESS_TOKEN"):
        tokens["access_token"] = os.getenv("TIKTOK_ACCESS_TOKEN")
    if not tokens.get("refresh_token") and os.getenv("TIKTOK_REFRESH_TOKEN"):
        tokens["refresh_token"] = os.getenv("TIKTOK_REFRESH_TOKEN")

    return tokens


def save_tokens(token_data: Dict):
    """Persist tokens to local JSON file."""
    try:
        with open(TOKENS_FILE, "w", encoding="utf-8") as f:
            json.dump(token_data, f, indent=2)
        print(f"[+] Saved tokens to {TOKENS_FILE.relative_to(ROOT_DIR)}")
    except Exception as e:
        print(f"[-] Failed to save tokens to file: {e}")


def get_tiktok_client(args: argparse.Namespace) -> TikTok:
    """Initialize TikTok client with credentials and saved tokens."""
    client_key = getattr(args, "client_key", None) or os.getenv("TIKTOK_CLIENT_KEY")
    client_secret = getattr(args, "client_secret", None) or os.getenv("TIKTOK_CLIENT_SECRET")
    redirect_uri = getattr(args, "redirect_uri", None) or os.getenv("TIKTOK_REDIRECT_URI") or "https://quangpx.com/api/tiktok/callback"

    if not client_key or not client_secret:
        print("[-] Error: TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET must be set in .env or via CLI.")
        sys.exit(1)

    scopes = ["user.info.basic", "video.upload"]
    if getattr(args, "enable_publish_scope", False) or os.getenv("TIKTOK_SCOPE_PUBLISH", "false").lower() == "true":
        scopes.append("video.publish")

    tik = TikTok(
        client_key=client_key,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
        scopes=scopes,
    )
    # Assign custom scopes (workaround for tiktok-api-client internal bug)
    tik.AUTH_SCOPE = scopes

    # Attach loaded token data if available
    tokens = load_saved_tokens()
    if tokens:
        tik.token_data = tokens
        tik.access_token = tokens.get("access_token")

    return tik


def handle_auth(args: argparse.Namespace):
    """OAuth 2.0 PKCE Authorization flow."""
    tik = get_tiktok_client(args)

    # If code is provided directly, perform exchange
    if args.code:
        code = args.code
        # Extract code from full redirect URL if user pasted the entire URL
        if "code=" in code:
            parsed = urllib.parse.urlparse(code)
            params = urllib.parse.parse_qs(parsed.query)
            if "code" in params:
                code = params["code"][0]

        # Restore code_verifier from auth state file if available
        if AUTH_STATE_FILE.exists():
            try:
                with open(AUTH_STATE_FILE, "r", encoding="utf-8") as f:
                    state_data = json.load(f)
                    if "code_verifier" in state_data:
                        tik.code_verifier = state_data["code_verifier"]
            except Exception:
                pass

        print(f"[*] Exchanging authorization code for tokens...")
        try:
            token_data = tik.exchange_code_for_token(code=code)
            save_tokens(token_data)
            print("[+] OAuth authorization successful!")
            print(f"    Access Token:  {token_data.get('access_token', '')[:15]}...")
            print(f"    Expires in:    {token_data.get('expires_in')} seconds")
            print(f"    Refresh Token: {token_data.get('refresh_token', '')[:15]}...")
            # Clean up state file
            if AUTH_STATE_FILE.exists():
                AUTH_STATE_FILE.unlink()
        except Exception as e:
            print(f"[-] Token exchange failed: {e}")
            sys.exit(1)
        return

    # If user requests refresh
    if args.refresh:
        tokens = load_saved_tokens()
        refresh_token = tokens.get("refresh_token")
        if not refresh_token:
            print("[-] No refresh token found. Please run 'uv run scripts/publish-tiktok.py auth' first.")
            sys.exit(1)
        print("[*] Refreshing access token...")
        try:
            new_tokens = tik.refresh_access_token(refresh_token=refresh_token)
            save_tokens(new_tokens)
            print("[+] Token refreshed successfully!")
        except Exception as e:
            print(f"[-] Failed to refresh token: {e}")
            sys.exit(1)
        return

    # Otherwise, generate new Authorization URL
    auth_url = tik.get_authorization_url()

    # Save code_verifier so it can be used for exchange later
    try:
        with open(AUTH_STATE_FILE, "w", encoding="utf-8") as f:
            json.dump({"code_verifier": tik.code_verifier}, f)
    except Exception:
        pass

    print("\n================ TIKTOK OAUTH 2.0 PKCE ================")
    print("1. Open this URL in your web browser:")
    print(f"\n   {auth_url}\n")
    print("2. Log in with your TikTok creator account and authorize the app.")
    print("3. You will be redirected to your Redirect URI:")
    print(f"   {tik.redirect_uri}?code=...&state=...")
    print("=======================================================\n")

    user_input = input("Paste the authorization 'code' (or full redirected URL) here: ").strip()
    if not user_input:
        print("[-] No code provided. Aborted.")
        return

    # Run exchange immediately
    args.code = user_input
    handle_auth(args)


def handle_info(args: argparse.Namespace):
    """Query and display creator info."""
    tik = get_tiktok_client(args)
    tokens = load_saved_tokens()
    if not tokens.get("access_token"):
        print("[-] No access token available. Run 'uv run scripts/publish-tiktok.py auth' first.")
        sys.exit(1)

    print("[*] Fetching creator info from TikTok...")
    try:
        info = tik.get_creator_info()
        print(json.dumps(info, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"[-] Error fetching creator info: {e}")


def resolve_chrome_profile(input_dir: Optional[str] = None, input_name: Optional[str] = None) -> Tuple[str, str]:
    """
    Resolve Chrome User Data Dir (root) and Profile Name.
    Supports passing a direct profile directory (e.g. ".../Google/Chrome/Profile 5")
    or root user data dir with profile name.
    """
    default_chrome_root = str(Path.home() / "Library/Application Support/Google/Chrome")
    raw_path = (
        input_dir
        or os.environ.get("TIKTOK_CHROME_PROFILE_DIR")
        or os.environ.get("TIKTOK_CHROME_PROFILE")
        or str(Path(default_chrome_root) / "Profile 5")
    )
    raw_path = str(Path(raw_path).expanduser().resolve())
    raw_name = input_name or os.environ.get("TIKTOK_CHROME_PROFILE_NAME")

    base_name = Path(raw_path).name
    is_subfolder = (
        bool(re.match(r"^Profile\s*\d+$", base_name, re.IGNORECASE))
        or base_name.lower() == "default"
        or (Path(raw_path) / "Preferences").exists()
    )

    if is_subfolder:
        user_data_dir = str(Path(raw_path).parent)
        profile_name = raw_name or base_name
    else:
        user_data_dir = raw_path
        if raw_name:
            profile_name = raw_name
        else:
            match = re.search(r"Profile\s*(\d+)", raw_path, re.IGNORECASE)
            profile_name = f"Profile {match.group(1)}" if match else "Profile 5"

    return user_data_dir, profile_name


def handle_post_browser(args: argparse.Namespace, image_files: List[Path], title: str, desc: Optional[str]):
    """Upload photo carousel to TikTok Studio via Chrome CDP browser automation."""
    node_script = ROOT_DIR / "scripts" / "upload-tiktok-browser.js"
    if not node_script.exists():
        print(f"[-] Error: Browser automation script not found at {node_script}")
        sys.exit(1)

    user_data_dir, profile_name = resolve_chrome_profile(args.profile_dir, args.profile_name)

    cmd = [
        "node",
        str(node_script),
        "--slides",
        *[str(img.resolve()) for img in image_files],
        "--title",
        title,
        "--desc",
        desc or "",
        "--privacy",
        args.privacy,
        "--mode",
        args.mode,
        "--profile-dir",
        user_data_dir,
        "--profile-name",
        profile_name,
    ]
    if getattr(args, "schedule_time", None):
        cmd.extend(["--schedule-time", args.schedule_time])
    if getattr(args, "schedule_date", None):
        cmd.extend(["--schedule-date", args.schedule_date])
    if getattr(args, "sound", None):
        cmd.extend(["--sound", args.sound])
    if args.restart_browser:
        cmd.append("--restart-browser")
    if args.dry_run:
        cmd.append("--dry-run")

    print("[*] Executing browser upload via Chrome CDP...")
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"[-] Browser upload process failed with exit code {e.returncode}")
        sys.exit(e.returncode)


def handle_post(args: argparse.Namespace):
    """Prepare and upload/post a photo carousel."""
    # 1. Resolve carousel folder
    if args.dir:
        carousel_dir = Path(args.dir).resolve()
    elif args.slug:
        carousel_dir = (ROOT_DIR / "output" / "carousels" / args.slug).resolve()
        if not carousel_dir.exists():
            carousel_dir = (ROOT_DIR / "output" / args.slug).resolve()
    else:
        print("[-] Error: Please specify either --slug <slug> or --dir <path>.")
        sys.exit(1)

    if not carousel_dir.exists() or not carousel_dir.is_dir():
        print(f"[-] Error: Carousel directory not found: {carousel_dir}")
        sys.exit(1)

    # 2. Find and sort slide images
    supported_exts = {".png", ".jpg", ".jpeg", ".webp"}
    image_files = [f for f in carousel_dir.iterdir() if f.suffix.lower() in supported_exts]
    image_files.sort(key=lambda p: natural_sort_key(p.name))

    if not image_files:
        print(f"[-] Error: No images (.png, .jpg, .webp) found in {carousel_dir}")
        sys.exit(1)

    if len(image_files) > 35:
        print(f"[-] Warning: TikTok allows a maximum of 35 photos. Found {len(image_files)} images. Only the first 35 will be used.")
        image_files = image_files[:35]

    print(f"[*] Found {len(image_files)} slide(s) in {carousel_dir.name}:")
    for idx, img in enumerate(image_files, 1):
        print(f"    [{idx:02d}] {img.name}")

    slug_name = args.slug or carousel_dir.name
    title = args.title
    desc = args.desc
    if not title or not desc:
        carousel_json = ROOT_DIR / "src" / "content" / "posts" / f"{slug_name}.carousel.json"
        if carousel_json.exists():
            try:
                with open(carousel_json, "r", encoding="utf-8") as f:
                    cdata = json.load(f)
                    meta = cdata.get("meta", {})
                    if not title:
                        title = meta.get("title", f"Carousel: {slug_name}")
                    if not desc:
                        tags_str = " ".join([f"#{t.lower().replace(' ', '')}" for t in meta.get("tags", [])])
                        raw_desc = meta.get("description", "")
                        desc = f"{raw_desc}\n\n{tags_str}".strip()
            except Exception:
                pass
    if not title:
        title = f"Carousel: {slug_name}"

    post_mode = args.mode  # "MEDIA_UPLOAD" or "DIRECT_POST"
    privacy_level = args.privacy  # "PUBLIC_TO_EVERYONE", "SELF_ONLY", "MUTUAL_FOLLOW_FRIENDS"
    method = getattr(args, "method", "browser")

    # If browser method is chosen (default): upload via Chrome CDP directly using local files
    if method == "browser":
        print("\n----------------- BROWSER POST DETAILS -----------------")
        print(f"Method:        Browser (Chrome CDP via Default Profile)")
        print(f"Profile:       {args.profile_dir}")
        print(f"Title:         {title}")
        print(f"Mode:          {post_mode} ({'Draft' if post_mode == 'MEDIA_UPLOAD' else 'Direct to Feed'})")
        print(f"Privacy Level: {privacy_level}")
        print(f"Image Count:   {len(image_files)}")
        print(f"Dry Run:       {args.dry_run}")
        print("---------------------------------------------------------\n")
        handle_post_browser(args, image_files, title, desc)
        return

    # 3. Handle --copy-to-public (API method only)
    if args.copy_to_public:
        public_dest = ROOT_DIR / "public" / "carousels" / slug_name
        if not args.dry_run:
            public_dest.mkdir(parents=True, exist_ok=True)
            print(f"[*] Copying {len(image_files)} image(s) to public/carousels/{slug_name}...")
            for img in image_files:
                shutil.copy2(img, public_dest / img.name)
            print(f"[+] Files copied. Accessible after deployment at: https://quangpx.com/carousels/{slug_name}/")
        else:
            print(f"[*] [DRY-RUN] Would copy {len(image_files)} image(s) to public/carousels/{slug_name}")

    # 4. Construct image URLs
    base_url = args.base_url
    if not base_url:
        base_url = f"https://quangpx.com/carousels/{slug_name}"
    base_url = base_url.rstrip("/")

    photo_images = [f"{base_url}/{img.name}" for img in image_files]

    # Title & Post settings
    title = args.title or f"Carousel: {slug_name}"
    post_mode = args.mode  # "MEDIA_UPLOAD" or "DIRECT_POST"
    privacy_level = args.privacy  # "PUBLIC_TO_EVERYONE", "SELF_ONLY", "MUTUAL_FOLLOW_FRIENDS"
    cover_index = args.cover_index  # 1-based index (1 to N)

    print("\n----------------- POST DETAILS -----------------")
    print(f"Title:         {title}")
    print(f"Mode:          {post_mode} ({'Inbox/Drafts' if post_mode == 'MEDIA_UPLOAD' else 'Direct to Feed'})")
    print(f"Privacy Level: {privacy_level}")
    print(f"Cover Index:   {cover_index} ({image_files[cover_index - 1].name})")
    print(f"Image Count:   {len(photo_images)}")
    print(f"Cover URL:     {photo_images[cover_index - 1]}")
    print("------------------------------------------------\n")

    if args.dry_run:
        print("[*] [DRY-RUN] Verification complete. Payload looks good:")
        payload = {
            "post_mode": post_mode,
            "media_type": "PHOTO",
            "title": title,
            "privacy_level": privacy_level,
            "photo_cover_index": cover_index,
            "photo_images": photo_images,
        }
        print(json.dumps(payload, indent=2))
        print("[+] Dry run succeeded! No API calls made.")
        return

    # 5. Connect and call TikTok API
    tik = get_tiktok_client(args)
    tokens = load_saved_tokens()
    access_token = tokens.get("access_token")
    if not access_token:
        print("[-] No access token found. Please run 'uv run scripts/publish-tiktok.py auth' first.")
        sys.exit(1)

    print(f"[*] Sending photo carousel to TikTok via Content Posting API...")
    try:
        response = tik.create_photo(
            post_mode=post_mode,
            title=title,
            privacy_level=privacy_level,
            description=args.desc or "",
            disable_comment=args.disable_comments,
            auto_add_music=args.auto_music,
            photo_cover_index=cover_index,
            photo_images=photo_images,
            access_token=access_token,
        )

        print("[+] TikTok response received:")
        print(json.dumps(response, indent=2, ensure_ascii=False))

        # Extract publish ID if present
        publish_id = None
        upload_resp = response.get("photo_upload_response", {})
        data = upload_resp.get("data", {})
        publish_id = data.get("publish_id")

        if publish_id:
            print(f"\n[+] Success! Publish ID: {publish_id}")
            if post_mode == "MEDIA_UPLOAD":
                print("[*] The carousel has been uploaded to your TikTok inbox!")
                print("    Open the TikTok mobile app -> Check Inbox notifications to review and publish.")
            else:
                print("[*] Checking upload status...")
                try:
                    status = tik.check_upload_status(publish_id=publish_id, access_token=access_token)
                    print(json.dumps(status, indent=2, ensure_ascii=False))
                except Exception as e:
                    print(f"[-] Warning: Failed to check immediate status: {e}")
        else:
            print("[-] Warning: No publish_id returned in response.")

    except Exception as e:
        print(f"[-] Failed to upload carousel: {e}")
        sys.exit(1)


def handle_status(args: argparse.Namespace):
    """Check status of an existing publish ID."""
    if not args.id:
        print("[-] Error: Please specify publish ID with --id <publish_id>.")
        sys.exit(1)

    tik = get_tiktok_client(args)
    tokens = load_saved_tokens()
    access_token = tokens.get("access_token")
    if not access_token:
        print("[-] No access token found. Please run 'uv run scripts/publish-tiktok.py auth' first.")
        sys.exit(1)

    try:
        status = tik.check_upload_status(publish_id=args.id, access_token=access_token)
        print(json.dumps(status, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"[-] Failed to fetch status for {args.id}: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Publish Photo Mode (Carousels) to TikTok via official Content Posting API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # Command: auth
    auth_parser = subparsers.add_parser("auth", help="Authorize TikTok app via OAuth 2.0 PKCE")
    auth_parser.add_argument("--code", help="Authorization code or redirected URL returned from TikTok")
    auth_parser.add_argument("--refresh", action="store_true", help="Refresh existing access token")
    auth_parser.add_argument("--client-key", help="TikTok Developer Client Key")
    auth_parser.add_argument("--client-secret", help="TikTok Developer Client Secret")
    auth_parser.add_argument("--redirect-uri", help="Registered Redirect URI")
    auth_parser.add_argument("--enable-publish-scope", action="store_true", help="Request video.publish in addition to video.upload")

    # Command: info
    info_parser = subparsers.add_parser("info", help="Display TikTok creator account information")

    # Command: post
    post_parser = subparsers.add_parser("post", help="Upload/publish a photo carousel")
    post_parser.add_argument("--method", choices=["browser", "api"], default="browser",
                             help="Publishing method: 'browser' (default, uses Chrome CDP with Default profile) or 'api' (official TikTok Content Posting API)")
    default_dir_or_profile = (
        os.environ.get("TIKTOK_CHROME_PROFILE_DIR")
        or os.environ.get("TIKTOK_CHROME_PROFILE")
        or str(Path.home() / "Library/Application Support/Google/Chrome/Profile 5")
    )
    _, default_profile_name = resolve_chrome_profile(default_dir_or_profile)

    post_parser.add_argument("--profile-dir",
                             default=default_dir_or_profile,
                             help=f"Chrome profile or user data directory (default: {default_dir_or_profile})")
    post_parser.add_argument("--profile-name", default=default_profile_name,
                             help=f"Chrome profile name inside user data dir (default: {default_profile_name})")
    post_parser.add_argument("--restart-browser", action="store_true",
                             help="If Chrome is already open, cleanly restart it with CDP remote debugging enabled")
    post_parser.add_argument("--slug", help="Slug name of the carousel (e.g., 'seniority' in output/carousels/seniority)")
    post_parser.add_argument("--dir", help="Explicit path to directory containing carousel slide images")
    post_parser.add_argument("--title", help="Caption or title of the post (e.g. 'Seniority trong công sở #career')")
    post_parser.add_argument("--desc", help="Optional description")
    post_parser.add_argument("--mode", choices=["MEDIA_UPLOAD", "DIRECT_POST"], default="MEDIA_UPLOAD",
                             help="MEDIA_UPLOAD (sends to TikTok Drafts/Inbox) or DIRECT_POST (publishes straight to feed). Default: MEDIA_UPLOAD")
    post_parser.add_argument("--privacy", choices=["PUBLIC_TO_EVERYONE", "SELF_ONLY", "MUTUAL_FOLLOW_FRIENDS"],
                             default="PUBLIC_TO_EVERYONE", help="Post privacy level (default: PUBLIC_TO_EVERYONE)")
    post_parser.add_argument("--base-url", help="Public base URL for hosted images (default: https://quangpx.com/carousels/<slug>)")
    post_parser.add_argument("--cover-index", type=int, default=1, help="1-based index of cover slide (default: 1)")
    post_parser.add_argument("--copy-to-public", action="store_true", help="Copy images from output/ to public/ for Astro hosting")
    post_parser.add_argument("--schedule-time", help="Schedule post time (e.g. '20:00' or '20:30') for TikTok Studio")
    post_parser.add_argument("--schedule-date", help="Schedule post date (e.g. '2026-09-10', default: today) for TikTok Studio")
    post_parser.add_argument("--sound", default="Dark and mysterious trap beat",
                             help="Sound/music search keyword or preset (1: 'Dark and mysterious trap beat' [default], 2: 'Mysterious Piano Nocturne', 3: 'Horror, Fear, Mystery, Suspense', 'recommend', or 'none'). Default: 'Dark and mysterious trap beat'")
    post_parser.add_argument("--disable-comments", action="store_true", help="Disable comments on the post")
    post_parser.add_argument("--auto-music", action="store_true", default=True, help="Auto add background music (default: True)")
    post_parser.add_argument("--dry-run", action="store_true", help="Validate and preview payload without sending API requests")

    # Command: status
    status_parser = subparsers.add_parser("status", help="Check status of a previous publish ID")
    status_parser.add_argument("--id", required=True, help="Publish ID returned from TikTok")

    args = parser.parse_args()

    if args.command == "auth":
        handle_auth(args)
    elif args.command == "info":
        handle_info(args)
    elif args.command == "post":
        handle_post(args)
    elif args.command == "status":
        handle_status(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
