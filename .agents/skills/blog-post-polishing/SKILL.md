---
name: blog-post-polishing
description: Use when reviewing, polishing, fact-checking, or translating a Vietnamese or English blog post while preserving the author's established voice, humor, and sarcasm.
---

# Blog Post Polishing

Review mechanics, clarity, and factual claims without replacing or editing the author.

## Voice Is an Invariant

Treat the original register, sentence rhythm, slang, code-switching, humor, sarcasm, rhetorical questions, and point of view as protected context when assessing a proposed correction. Do not recommend making a casual post formal, neutralizing a joke, softening an opinion, or making sarcasm literal.

Before assessing a repository post, compare it with the established style in relevant committed or published posts in the same language. If the source post materially departs from that style—especially by losing its usual humor or sarcasm—ask one concise question about the intended change and wait. Do not silently normalize the post to its prior style.

If there is no usable style reference, preserve the submitted post's own voice and do not invent one.

## Polish Mode: Review Only

Use for requests to proofread, polish, edit, review, or fact-check.

Never change a post, write a revised passage, or modify a file in this mode. A request to "polish" is a request for review, not approval to apply edits.

1. Identify clear spelling, typing, grammar, punctuation, broken Markdown, and wording that creates an unintended ambiguity. Preserve deliberate informal grammar and vocabulary.
2. Separate subjective views, predictions, jokes, and hyperbole from factual claims. Do not fact-correct an opinion or satire as though it were a factual error.
3. Verify factual assertions that could mislead readers. Browse for claims that are current, disputed, niche, numerical, attributed, or high-impact; prefer primary or authoritative sources. Do not browse merely to validate stable, uncontroversial common knowledge.
4. Return findings only. For every issue, quote the affected text, explain the concern, and offer a minimal proposed replacement when one is appropriate. For factual concerns, give the evidence and proposed correction; do not apply it.
5. Ask for explicit approval before changing any original sentence, factual claim, file, front matter, link, or Markdown structure. Approval must cover the proposed change; never treat a general request to polish as blanket approval.

## Translation Mode

Use when the user asks to translate a post between English and Vietnamese (or create a translated counterpart).

### Voice & Transcreation
- Translate for the target culture and its natural grammar, idioms, and reading rhythm; do not translate word-for-word when that loses the joke, sarcasm, or technical register.
- Keep the same level of informality, confidence, humor, and skepticism. Retain English technical terms (e.g., CI/CD, PR, pipeline, loops, Black Company) when that is natural for the target audience; otherwise use the locally conventional term.
- Verify facts and attributions under the same rules as Polish mode. Translate quoted text accurately; if a joke or culturally specific phrase cannot survive directly, use an equivalent effect rather than a neutral paraphrase. If a source sentence is factually suspect, flag it and seek approval before altering its meaning in the translation.

### Repository i18n Architecture & Frontmatter Requirements
When creating a translated blog post file in `src/content/posts/`, strictly follow the blog's i18n convention:

1. **Frontmatter Schema**:
   - `lang`: Must be explicitly set to `"vi"` (for Vietnamese) or `"en"` (for English).
   - `postSlug`: Both language versions of the post **must share the exact same `postSlug`** (e.g., `postSlug: "about-devops"`). This produces canonical URLs:
     - English: `/posts/<postSlug>`
     - Vietnamese: `/vi/posts/<postSlug>`
   - `translationKey`: Both language versions **must share the exact same `translationKey`** (e.g., `translationKey: "about-devops"`). This enables:
     - The automatic header language toggle (`EN` ↔ `VI`) to jump directly to the counterpart.
     - The cross-language banner (`🌐 Đọc bài viết này bằng Tiếng Việt →` / `🌐 Read this post in English →`) to automatically appear on the post.
   - If the original post lacks `postSlug` or `translationKey`, update the original post's frontmatter to include them so both sides are linked.

2. **File Naming & Placement**:
   - Save in `src/content/posts/`.
   - Astro Content Layer requires unique file-based IDs. Differentiate filenames by adding a language suffix (e.g., `<postSlug>-vietnamese.md` / `<postSlug>-vi.md` vs `<postSlug>-english.md` / `<postSlug>.md`). Never give two files the same filename even across languages.

3. **Internal Links Localization**:
   - In Vietnamese posts, link to Vietnamese routes: `/vi/posts/<target-slug>`, `/vi/tags/<tag>`, etc.
   - In English posts, link to English routes: `/posts/<target-slug>`, `/tags/<tag>`, etc.

4. **Tags & Distribution Strategy**:
   - Technical / English posts: Maintain clean, standard technical tags (e.g., `DevOps`, `CI/CD`, `Automation`, `SRE`).
   - Vietnamese workplace / career posts (especially the "Trò Chơi Công Sở" series): **Do NOT use generic English tags** like `Career`, `Culture`, `Leadership`, `Psychology`, or `Dark Corporation`. These fail to capture search traffic and kill distribution on TikTok and Substack.
   - Use the repository's dedicated trending hashtag tool (`scripts/update-trending-hashtags.py`) to derive high-converting, unaccented, lowercase tags (e.g., `trochoicongso`, `chuyencongso`, `dramacongso`, `toxicworkplace`, `tamlycongso`, `banhve`, `danit`).

## Automated Trending Hashtag Synchronization

For any Vietnamese post in `src/content/posts/` (especially when polishing, reviewing, or prepping for multi-platform distribution via Substack and TikTok), use `scripts/update-trending-hashtags.py` to ensure optimal discovery.

### The 5–7 Hashtag Formula for TikTok Vietnam
TikTok algorithms penalize hashtag stuffing while rewarding focused, high-intent clusters. The script balances exactly 5 to 7 tags per post:
1. **Brand Anchor:** Always `#trochoicongso` (builds series equity and connects content across platforms).
2. **Mass Reach (500M - 2B+ views):** `#chuyencongso`, `#dramacongso` (broad algorithmic distribution).
3. **Topic-Specific Pain Point:** Directly matched to the article's core thesis:
   - Bánh vẽ chức danh: `#banhve`, `#thangtien`
   - Dời cọc gôn: `#doicocgon`, `#kpi`
   - Chiếc lồng cào bằng: `#caobang`, `#lechvanhoa`, `#tallpoppysyndrome`
   - Kẻ gác cổng thông tin: `#kegaccong`, `#daudachinhtri`, `#batdoixungthongtin`
   - Vòng vây thầm lặng: `#baoluclanh`, `#colap`, `#quietfiring`
4. **Workplace Reality & Psychology:** `#tamlycongso`, `#toxicworkplace`, `#reviewcongty`, `#gockhuatcongso`.
5. **Audience Persona:** `#danit`, `#senior`, `#kinhnghiemdilam`.

### Execution Commands

```bash
# Preview hashtags for a specific post without modifying files
python3 scripts/update-trending-hashtags.py --slug <postSlug> --dry-run
# Or preview for all posts in the series:
npm run hashtags:dry-run

# Apply updates to markdown frontmatter and companion carousel JSON
python3 scripts/update-trending-hashtags.py --slug <postSlug>
# Or update all posts:
npm run hashtags:update
```

### What the Script Synchronizes
1. **Markdown Frontmatter (`src/content/posts/*-vi.md`)**:
   - Updates `tags:` with clean, unaccented, slug-friendly strings.
   - Automatically sanitizes YAML by removing duplicate keys (e.g. duplicate `prePublish: true`).
2. **Companion Carousel JSON (`src/content/posts/<slug>.carousel.json`)**:
   - Updates `meta.tags`. This is critical because `scripts/publish-tiktok.py` parses `meta.tags` when uploading carousels to TikTok Studio, appending `#hashtag` formatted tags directly into the video caption.
3. **Dynamic Resolution**: Supports both pre-configured series posts and newly added Vietnamese posts dynamically via `--slug <postSlug>`.

## Editing Boundaries

- Never invent sources, facts, anecdotes, citations, or stronger claims.
- Never turn a prediction into a fact, a joke into a literal assertion, or a hedged claim into certainty.
- Never change the post's thesis, target audience, or cultural voice without explicit approval.
- In Polish mode, never make an edit before explicit approval, even for an obvious typo or a clearly verified factual error.
- If a style mismatch, missing source text, unclear translation target, or material fact issue blocks faithful work, ask one concise question and wait. Do not create a specification or plan.

## Completion Check

- Before handing off a Polish-mode review, confirm that no change has been applied. State what was fact-checked, every proposed correction, and any remaining uncertainty.
- When approved frontmatter edits or trending hashtag synchronizations are applied, always run `npx astro check` to verify zero YAML syntax errors and validate schema integrity.
