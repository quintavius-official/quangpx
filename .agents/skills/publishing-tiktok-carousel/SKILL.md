---
name: publishing-tiktok-carousel
description: Use when uploading, drafting, scheduling, or publishing photo carousel slides to TikTok Studio using browser automation with Profile 5.
---

# Publish QuangPX Carousels to TikTok

Use this skill to automate uploading photo carousel slides to **TikTok Studio** (`https://www.tiktok.com/tiktokstudio/upload`), filling titles and captions with hashtags, saving as drafts, or scheduling publication for a specific date and time.

The slides are rendered from `src/content/posts/<slug>.carousel.json` into `output/carousels/<slug>/`.

---

## Architecture & Authentication

- **Chrome Profile:** Always uses **`Profile 5`** (`/Users/phuongquang/Library/Application Support/Google/Chrome-Profile5`), which retains active creator session cookies for TikTok.
- **Protocol:** Uses Chrome DevTools Protocol (CDP) via Puppeteer on remote debugging port `9223`.
- **Scripts:**
  - `scripts/publish-tiktok.py`: Top-level CLI for resolving carousels, parsing metadata, and passing arguments.
  - `scripts/upload-tiktok-browser.js`: Puppeteer CDP automation script that controls the browser, uploads slides, fills inputs natively, handles modals, and interacts with schedule pickers.

---

## Automated Workflow: Git Post-Commit Hook (Recommended)

You can trigger automated carousel generation and TikTok scheduling simply by setting frontmatter flags in the blog post markdown file (`src/content/posts/<slug>.md`):

```yaml
---
title: 'Bài viết của bạn'
pubDatetime: 2026-09-15T00:00:00Z
substack: true       # When true, post-commit hook publishes/updates to Substack
tiktok_photo: true   # When true, post-commit hook generates carousel & schedules TikTok post
---
```

When you commit this post (`git commit`), `.githooks/post-commit` (via `scripts/post-commit-handler.py`):
1. Detects `tiktok_photo: true`.
2. Generates the carousel slides automatically via `node scripts/generate-carousel.js <slug>`.
3. Derives the target schedule date and time from `pubDatetime` (e.g. evening 20:00 or specified time, adjusted for timezone `Asia/Ho_Chi_Minh`).
4. Launches the browser automation and schedules the post on TikTok Studio.

---

## Common Workflows (Manual CLI)

To schedule publication for tonight (e.g. at 20:00 or 20:30):

```bash
python3 scripts/publish-tiktok.py post --slug <slug> --schedule-time 20:00
```

- Automatically selects the **Schedule** option on TikTok Studio.
- Automatically confirms the *"Allow your video to be saved for scheduled posting?"* prompt.
- Selects the target hour (`20`) and minute (`00`) from the timepicker.
- Validates that no scheduling errors exist, then clicks **Schedule**.

### 2. Schedule for a Specific Future Date & Time

```bash
python3 scripts/publish-tiktok.py post --slug <slug> --schedule-date 2026-09-11 --schedule-time 20:30
```

*Note: TikTok requires scheduled times to be between 15 minutes and 10 days in advance.*

### 3. Background Music Selection (`--sound`)

You can specify a sound/music track or preset:
- **Default (Option 1)**: `"Dark and mysterious trap beat"` (`--sound 1` or default)
- **Option 2**: `"Mysterious Piano Nocturne"` (`--sound 2`)
- **Option 3**: `"Horror, Fear, Mystery, Suspense"` (`--sound 3`)
- **No music**: `--sound none`

Example:
```bash
python3 scripts/publish-tiktok.py post --slug seniority --sound 1
```

### 3. Save as Draft (Manual Review Later)

To upload slides, title, and description into TikTok Studio drafts without scheduling:

```bash
python3 scripts/publish-tiktok.py post --slug <slug>
# or explicitly:
python3 scripts/publish-tiktok.py post --slug <slug> --mode MEDIA_UPLOAD
```

### 4. Dry Run / Pre-Submission Inspection

To test slide upload, title entry, and caption paste while leaving the browser tab open for human inspection:

```bash
python3 scripts/publish-tiktok.py post --slug <slug> --dry-run
```

### 5. Direct Feed Publish (Immediate)

```bash
python3 scripts/publish-tiktok.py post --slug <slug> --mode DIRECT_POST
```

---

## Title & Caption Rules

1. **Title Input**:
   - TikTok Studio requires a catchy title for photo posts.
   - Sourced automatically from `meta.title` in `<slug>.carousel.json`.
   - Typed using native keystrokes (`page.type`) to trigger React internal state updates.

2. **Caption & Hashtags**:
   - Sourced from `meta.description` + `meta.tags` in `<slug>.carousel.json`.
   - Formatted with single spacing, without duplicate hashtags:
     ```text
     <Description text>

     #tag1 #tag2 #tag3 #tag4
     ```
   - Injected via `ClipboardEvent('paste')` into Draft.js, followed by `Escape` to dismiss TikTok's hashtag autocomplete popup.

---

## Troubleshooting & Best Practices

| Issue | Cause & Solution |
| --- | --- |
| **"Schedule at least 15 minutes in advance"** | The requested `--schedule-time` is in the past or less than 15 minutes away. Choose a time at least 20 minutes in the future. |
| **"Post is invalid"** | Usually indicates the Title input was empty. Ensure `--title` is provided or `meta.title` exists in `<slug>.carousel.json`. |
| **Login required prompt** | If TikTok session expires, Chrome will stay open on the login page. Log in manually in Chrome once, and Profile 5 will persist the session for future runs. |
| **Slide images missing** | Ensure `output/carousels/<slug>/slide_*.png` exist. If not generated yet, render them using the project's carousel generator first. |
