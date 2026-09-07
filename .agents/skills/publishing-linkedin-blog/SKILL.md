---
name: publishing-linkedin-blog
description: Use when drafting captions, previewing, or publishing a QuangPX blog post on LinkedIn. Formats ready-to-schedule captions and link previews by default; publishes via CLI only on explicit user request.
---

# Prepare and Publish QuangPX Blog Posts to LinkedIn

Use this skill for posts sourced from this repository's `src/content/posts/` and targeted for the author's personal LinkedIn profile. The public destination is always the matching `https://quangpx.com/posts/.../` (or `/vi/posts/.../` for Vietnamese) URL.

## Default Workflow: Caption & Preview Generation for Scheduling

**By default, the user schedules posts manually via LinkedIn.** Do not execute CLI publishing commands (`lkdn post create`) unless the user explicitly asks to publish directly.

1. **Resolve the blog post:**
   Never guess a URL. Always resolve from source with the helper:
   ```bash
   node .agents/skills/publishing-linkedin-blog/scripts/find-post.mjs --query 'post title or filename'
   ```
   Or specify an unambiguous file with `--file src/content/posts/...md`.
   - If ambiguous, list candidate files/languages and ask the user to choose.
   - Do not publish drafts (`draft: true`).
   - Use the helper's `url`, not `canonicalURL`.

2. **Generate ready-to-schedule caption options:**
   Follow the **Caption and Status Style** below. Present 1–2 polished, copy-paste-ready caption options alongside:
   - Article URL (from helper)
   - Article Title and Description
   - Suggested local thumbnail asset from `assets` (if available)

---

## Caption and Status Style

Keep the caption concise, punchy, and true to the author's established voice:

- **Tone & Humor:** Sarcastic, witty, and grounded in real engineering trenches. Draw sharp parallels between software engineering / architecture rigor (threat modeling, unit test coverage, zero-days, input sanitization, anti-patterns, flaky assertions) and corporate absurdities / management manipulation (empty promises, $2 coffee chats, budgetless titles, bailing water while being scolded for not playing the violin).
- **Format:**
  - 1–2 short, punchy paragraphs or structured bullet points highlighting the irony.
  - Focus on practical self-defense: framing the insights as threat modeling, firewalling career energy, and recognizing organizational anti-patterns before being exploited.
  - **No marketing fluff or CTAs:** Avoid engagement bait, generic hype, or explicit call-to-actions (no "click the link below", "read more here", "share your thoughts", etc.).
  - **Language:** Strictly match the language of the post (`en` for English posts, `vi` for Vietnamese posts).
- **Hashtags:** Always include **3 to 5 researched, topic-relevant hashtags** at the bottom.
  - For career, management, and corporate dark patterns topics, use the proven formula:
    `#SoftwareEngineering #Leadership #WorkplaceCulture #CareerAdvice` (or local/specific equivalents when relevant).

---

## Direct Publishing via CLI (Strictly on Explicit Request Only)

Only execute this workflow when the user explicitly requests to publish immediately via CLI (e.g., "publish now via CLI", "đăng bài lên LinkedIn ngay bằng CLI").

1. **Personal-profile API workflow:**
   Use `lkdn` and the official LinkedIn OAuth API only. Do not use a LinkedIn Page, organization URN, cookies, or browser automation.
   Load `.env` without printing it, and confirm the author URN:
   ```bash
   set -a; . ./.env; set +a
   lkdn profile whoami
   ```
   Use only the returned `person_urn` (`urn:li:person:...`) as `--author`. Never accept `urn:li:organization:...`.

2. **Approval boundary:**
   Publishing is external and irreversible. Before running `lkdn post create`, show the exact caption, quangpx.com URL, visibility, author URN, and thumbnail choice. Run the command only after explicit confirmation.

---

## Common Mistakes

| Mistake | Required correction |
| --- | --- |
| Running `lkdn post create` by default | **Do not call CLI publish automatically.** Default behavior is to return captions and preview metadata for manual scheduling. |
| Generic, boring, or corporate promotional captions | Write with sarcastic, witty engineering analogies (code smells vs org smells, threat modeling corporate politics) and zero marketing fluff. |
| Missing or excessive hashtags | Always include exactly 3 to 5 researched hashtags at the bottom (avoid hashtag stuffing). |
| Inferring URLs or using `canonicalURL` | Always resolve with `find-post.mjs` and use the quangpx.com URL. |
| Same/similar titles across languages | Check `lang` and confirm whether the user wants the English or Vietnamese version. |
| Token, client secret, or `.env` exposed | Never print `.env` or credentials in terminal outputs. |
