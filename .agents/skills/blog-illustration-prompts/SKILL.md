---
name: blog-illustration-prompts
description: Use when a user wants one or more ready-to-paste AI image prompts for editorial blog illustrations, especially abstract, light-toned, luxury visual concepts.
---

# Blog Illustration Workflow

Use exactly one mode based on the user's current request.

| User signal | Mode | Outcome |
| --- | --- | --- |
| They request illustrations or image ideas | Prompt mode | Return prompts only. |
| They explicitly say the images are generated and ask to add/embed them | Integration mode | Normalize assets and embed them. |

Do not generate images in either mode.

## Prompt Mode

Return only one complete, ready-to-paste prompt in a fenced code block for each requested image. Do not include introductions, explanations, headings, summaries, citations, file paths, or next steps. If an essential visual requirement is unclear, ask exactly one concise clarifying question and do nothing else.

Each prompt must include an `Asset filename:` line derived from the target post's slug or theme: `<post-slug>.png` (or `<post-slug>-<concept>.png` / `<post-slug>-<number>.png` when a post receives multiple illustrations, e.g. `fake-incentives.png`, `senior-borderland.png`). Never use generic names like `image_1.png` or `image_2.png` to avoid cross-post collisions. This tells the downstream workflow how each generated file must be named before Markdown embedding.

Never inspect files, browse, write or edit files, create specifications or plans, run tests, or invoke other workflows in Prompt mode. If asked to generate, save, or insert an image before the user confirms it has been generated, return the corresponding prompts only.

### Art Direction

Unless the user overrides it, retain this house style:

- Abstract painterly editorial illustration; elegant, symbolic, and restrained.
- Light, airy daylight—not dark, dystopian, neon, or corporate-stock imagery.
- Palette: ivory, warm sand, pale sky blue, luminous amber, and brushed gold.
- Materials: oil-paint texture, subtle paper grain, translucent layers, and soft gold reflections.
- Default format: wide 3:2 landscape, 1536 × 1024 px, with generous negative space.
- Avoid real brands, logos, real-person likenesses, watermarks, UI, extra readable text, and propaganda-like optimism. Add readable text only when the user explicitly supplies it, and quote it verbatim.

For a group of images, keep the style, palette, lighting, and level of abstraction consistent while giving each image one distinct conceptual focus.

Write each prompt in this form:

```text
Use case: stylized-concept
Asset type: editorial illustration for a blog post
Asset filename: <post-slug>.png
Primary request: <one visual metaphor tied to the relevant passage>
Style/medium: abstract light-toned painterly editorial art, elegant and symbolic, oil-paint texture and fine grain
Composition/framing: wide 3:2 landscape image, <subject placement and negative space>
Lighting/mood: airy soft daylight, <emotional tone>
Color palette: ivory, warm sand, pale sky blue, luminous amber, brushed gold
Materials/textures: <only scene-relevant materials>
Text (verbatim): "<only if requested>"
Constraints: <subject-specific invariants>
Avoid: real brands, logos, real-person likenesses, watermarks, UI, unrelated readable text, <scene-specific exclusions>
```

Translate the author’s claim into a visual metaphor; do not merely illustrate nouns. Use a sculptural ultra-luxury limited-edition whiskey decanter only when luxury or prestige packaging is central to the idea; never name, copy, or imitate a real brand. Keep speculative technology and post-scarcity scenes reflective and unresolved, rather than celebratory or apocalyptic.

## Integration Mode

Start only after the user explicitly confirms that the requested images already exist. Do not call an image-generation tool.

1. Identify the original post and locate a translated counterpart, if one exists. If the user does not identify a post, use the latest eligible original post and its matching translation. If the pairing or image-to-passage mapping is ambiguous, ask one concise question before changing files.
2. Locate the generated images. Match them to the requested concepts in prompt order. If multiple candidate files could fit, ask the user instead of guessing.
3. Before embedding, normalize each file to match its corresponding `Asset filename:` from the prompt (`<post-slug>.png` or `<post-slug>-<descriptor>.png`). Keep one shared copy for the original and translation; never duplicate it per language. Put shared assets in a location both Markdown files can reference, preferably their common content directory.
4. Do not overwrite an existing asset file that differs from the generated image. Stop and ask the user to choose a safe filename or replace it explicitly. Preserve an already-correct filename without moving it.
5. Embed each shared asset into the original post beside the passage its prompt illustrates, then embed the exact same asset path at the corresponding passage in the translation. Use alt text in each post's language.
6. Run the relevant project validation or build command. Report the image paths, edited post paths, and validation result. If there is no translation, embed only in the original post and state that no translation was found.

Do not create a specification or plan in either mode.
