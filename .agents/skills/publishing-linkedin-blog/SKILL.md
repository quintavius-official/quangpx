---
name: publishing-linkedin-blog
description: Use when publishing or previewing a QuangPX blog post on LinkedIn, including requests to find a blog article, create an external link card, or post through the owner's personal LinkedIn profile.
---

# Publish QuangPX blog posts to LinkedIn

Use this skill only for posts sourced from this repository's `src/content/posts/` and published through the personal LinkedIn profile. The public destination is always the matching `https://quangpx.com/posts/.../` URL.

## Resolve the blog post first

Never infer a URL from a title, filename, `canonicalURL`, or a URL supplied by the user. Resolve it from source with the helper:

```bash
node .agents/skills/publishing-linkedin-blog/scripts/find-post.mjs --query 'post title or filename'
```

For an unambiguous file, use `--file src/content/posts/...md`. The helper emits the exact article URL, frontmatter title/description, and eligible local content assets.

- If it reports `ambiguous`, show the candidates and ask the user to select one.
- Do not publish drafts (`draft: true`).
- Use the helper's `url`, not `canonicalURL`; the card must lead to quangpx.com.

## Personal-profile API workflow

Use `lkdn` and the official LinkedIn OAuth API only. Do not use a LinkedIn Page, organization URN, cookies, Voyager endpoints, browser automation, or Playwright.

Load the git-ignored `.env` without printing it, then establish the author from the token:

```bash
set -a; . ./.env; set +a
lkdn profile whoami
```

Use only the returned `person_urn` (`urn:li:person:...`) as `--author`. Stop if it is missing or is not a person URN. Never accept or substitute `urn:li:organization:...`.

Create an article card with `lkdn post create`, setting `--article-url` to the helper's `url`, title and (when non-empty) description from the helper, and the requested visibility. Add `--article-thumbnail <asset>` only when the user has approved a relevant local image from `assets`; never attach an unrelated image.

## Approval boundary

Publishing is an external, irreversible action. Before the first publish attempt in a request, show the exact caption, selected source file, quangpx.com URL, visibility, author type (**personal profile**), and thumbnail choice. Publish only after the user explicitly approves that preview. Report the resulting post URN and LinkedIn feed URL; do not read back credentials.

## Common mistakes

| Mistake | Required correction |
| --- | --- |
| Same/similar titles, including language variants | Resolve with the helper and ask when more than one candidate matches. |
| `canonicalURL` points to LinkedIn | Use the helper's quangpx.com URL. |
| User asks to publish "as Page" | Explain this project skill is personal-profile-only and stop. |
| Link card has no explicitly chosen image | Omit the thumbnail rather than choose an arbitrary asset. |
| Token, client secret, or `.env` shown in output | Stop and redact; credentials must remain local. |
