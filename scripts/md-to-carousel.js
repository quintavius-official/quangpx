import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

/**
 * Parses YAML frontmatter from markdown file
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const rawYaml = match[1];
  const body = content.slice(match[0].length).trim();
  const frontmatter = {};

  let currentKey = null;
  let isArray = false;

  for (const line of rawYaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("- ") && currentKey && isArray) {
      frontmatter[currentKey].push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ""));
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx !== -1) {
      const key = trimmed.slice(0, colonIdx).trim();
      const val = trimmed.slice(colonIdx + 1).trim();

      if (val === "") {
        currentKey = key;
        isArray = true;
        frontmatter[key] = [];
      } else {
        currentKey = null;
        isArray = false;
        frontmatter[key] = val.replace(/^["']|["']$/g, "");
      }
    }
  }

  return { frontmatter, body };
}

/**
 * Splits a long paragraph (> maxChars) at natural sentence boundaries
 * without breaking ellipses (...) or quoted dialogue
 */
export function splitParagraphIntoSentences(text, maxChars = 560) {
  if (text.length <= maxChars) return [text];

  // Match sentences ending in . ! ? followed by space and uppercase / Vietnamese letter
  const sentences = text.split(/(?<=[.!?]["'\u201d\u2019]?)\s+(?=[A-ZÀ-ỸĐ])/u);
  if (sentences.length <= 1) return [text];

  const chunks = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (currentChunk && (currentChunk.length + trimmed.length) > maxChars) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmed;
    } else {
      currentChunk += (currentChunk ? " " : "") + trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Parses markdown body into structured semantic blocks
 */
export function parseMarkdownBlocks(body) {
  const rawBlocks = body.split(/\r?\n\s*\r?\n/);
  const blocks = [];

  for (const raw of rawBlocks) {
    const text = raw.trim();
    if (!text) continue;

    // Check for Markdown Headings (#, ##, ###, etc.)
    const headingMatch = text.match(/^(#{1,6})\s+(.+)$/m);
    if (headingMatch && text.startsWith("#")) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim()
      });
      continue;
    }

    // Check for Standalone Images (![alt](path)) -> skip in reader slides
    if (text.match(/^!\[.*?\]\(.*?\)$/)) {
      continue;
    }

    // Check for Horizontal Rule
    if (text.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      blocks.push({ type: "break" });
      continue;
    }

    // Check for Blockquote
    if (text.startsWith(">")) {
      const cleaned = text
        .split("\n")
        .map(l => l.replace(/^>\s?/, "").trim())
        .join("\n")
        .trim();

      // Case 1: Clarification note with (*)
      if (cleaned.startsWith("(*)")) {
        blocks.push({
          type: "box",
          title: "(*) ĐỊNH NGHĨA / CHÚ THÍCH",
          text: cleaned.replace(/^\(\*\)\s*/, "").replace(/\*\*/g, ""),
          accent: "#00B4DB"
        });
      } else if (cleaned.toLowerCase().includes("side note")) {
        // Case 2: Side Note
        const noteText = cleaned
          .replace(/^\*?side note:?\*?\s*/i, "")
          .replace(/\*+$/g, "")
          .trim();
        blocks.push({
          type: "sidenote",
          text: noteText
        });
      } else if (cleaned.includes("**Góc 101:") || cleaned.includes("101 Corner:")) {
        // Case 3: Concept 101 comparison
        const lines = cleaned.split("\n").map(l => l.trim()).filter(Boolean);
        const titleLine = lines[0].replace(/\*\*/g, "").trim();
        const introLines = [];
        const boxItems = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const itemMatch = line.match(/^[-*]\s+\*\*([^*]+)\*\*\s*(.*)$/);
          if (itemMatch) {
            boxItems.push({
              title: itemMatch[1].trim(),
              text: itemMatch[2].trim()
            });
          } else {
            introLines.push(line);
          }
        }

        blocks.push({
          type: "concept_101",
          title: titleLine,
          intro: introLines.join(" "),
          items: boxItems
        });
      } else {
        // Case 4: General Quote
        blocks.push({
          type: "quote",
          text: cleaned.replace(/^["'“”]|["'“”]$/g, "").trim()
        });
      }
      continue;
    }

    // Regular Paragraph
    // Strip markdown links [text](url) -> text, and normalize bold/italic
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1");

    // Split long paragraphs if needed
    const chunks = splitParagraphIntoSentences(cleanText, 560);
    for (const chunk of chunks) {
      blocks.push({
        type: "paragraph",
        text: chunk
      });
    }
  }

  return blocks;
}

/**
 * Deterministically chunks blocks into reader slides
 */
export function mdToCarousel(mdContent, postSlug = "") {
  const { frontmatter, body } = parseFrontmatter(mdContent);
  const blocks = parseMarkdownBlocks(body);

  const category = (
    (Array.isArray(frontmatter.tags) ? frontmatter.tags[0] : frontmatter.tags) ||
    "CAREER & CULTURE"
  ).toUpperCase();

  const slides = [];

  // Slide 1: Cover Slide
  slides.push({
    type: "cover",
    category,
    title: frontmatter.title || "The Corporate Dispatch",
    subtitle: frontmatter.description || "",
    coverImage: frontmatter.ogImage || `./${postSlug}.png`
  });

  let currentHeading = null;
  let isFirstSlideUnderHeader = false;
  let currentSlide = null;

  function finalizeSlide() {
    if (!currentSlide) return;
    const hasContent =
      (currentSlide.paragraphs && currentSlide.paragraphs.length > 0) ||
      (currentSlide.boxes && currentSlide.boxes.length > 0) ||
      currentSlide.quote ||
      currentSlide.sidenote;

    if (hasContent) {
      slides.push(currentSlide);
    }
    currentSlide = null;
  }

  function startNewSlide() {
    finalizeSlide();
    currentSlide = {
      type: "reader",
      tag: currentHeading ? currentHeading.toUpperCase() : category,
      paragraphs: []
    };

    // STRICT RULE: ONLY set headline if this slide immediately follows an explicit markdown header (#, ##, ###)
    if (isFirstSlideUnderHeader && currentHeading) {
      currentSlide.headline = currentHeading;
      isFirstSlideUnderHeader = false;
    }
  }

  for (const block of blocks) {
    if (block.type === "heading") {
      finalizeSlide();
      currentHeading = block.text;
      isFirstSlideUnderHeader = true;
      continue;
    }

    if (block.type === "break") {
      finalizeSlide();
      continue;
    }

    if (!currentSlide) {
      startNewSlide();
    }

    if (block.type === "paragraph") {
      const currentLength = (currentSlide.paragraphs || []).reduce(
        (sum, p) => sum + p.length,
        0
      );

      // Group paragraphs if total chars <= 560 and max 2 paragraphs per slide
      if (
        currentSlide.paragraphs.length >= 2 ||
        (currentLength > 0 && currentLength + block.text.length > 560) ||
        currentSlide.boxes ||
        currentSlide.quote ||
        currentSlide.sidenote
      ) {
        startNewSlide();
      }

      currentSlide.paragraphs.push(block.text);
    } else if (block.type === "box") {
      finalizeSlide();
      startNewSlide();
      currentSlide.boxes = [
        {
          title: block.title,
          text: block.text,
          accent: block.accent || "#00B4DB"
        }
      ];
      finalizeSlide();
    } else if (block.type === "sidenote") {
      const currentLength = (currentSlide.paragraphs || []).reduce(
        (sum, p) => sum + p.length,
        0
      );
      // Can attach to preceding short paragraph if <= 350 chars
      if (currentSlide.paragraphs.length > 1 || currentLength > 350 || currentSlide.boxes || currentSlide.quote) {
        startNewSlide();
      }
      currentSlide.sidenote = block.text;
      finalizeSlide();
    } else if (block.type === "quote") {
      const currentLength = (currentSlide.paragraphs || []).reduce(
        (sum, p) => sum + p.length,
        0
      );
      if (currentSlide.paragraphs.length > 1 || currentLength > 350 || currentSlide.boxes || currentSlide.sidenote) {
        startNewSlide();
      }
      currentSlide.quote = block.text;
      finalizeSlide();
    } else if (block.type === "concept_101") {
      finalizeSlide();
      // Slide 1 of Concept 101: Intro + Item 1 (Control)
      startNewSlide();
      if (block.intro) {
        currentSlide.paragraphs.push(block.intro);
      }
      if (block.items && block.items.length > 0) {
        const item1 = block.items[0];
        currentSlide.boxes = [
          {
            title: `1. ${item1.title.toUpperCase()} (Control)`,
            text: item1.text,
            accent: "#00B4DB"
          }
        ];
      }
      finalizeSlide();

      // Slide 2 of Concept 101: Item 2 (Manipulation)
      if (block.items && block.items.length > 1) {
        for (let i = 1; i < block.items.length; i++) {
          startNewSlide();
          const item = block.items[i];
          currentSlide.boxes = [
            {
              title: `${i + 1}. ${item.title.toUpperCase()} (Manipulation)`,
              text: item.text,
              accent: "#FF007F"
            }
          ];
          finalizeSlide();
        }
      }
    }
  }

  finalizeSlide();

  // Last Slide: Outro CTA
  slides.push({
    type: "cta",
    tag: "THE CORPORATE DISPATCH",
    headline: "Quên System Design đi.",
    subtitle: "Nơi mổ xẻ những sự thật trần trụi, cạm bẫy ngầm và trò chơi quyền lực nơi công sở."
  });

  return { meta: frontmatter, slides };
}

// CLI Execution if run directly: node scripts/md-to-carousel.js <slug>
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const slug = process.argv[2] || "seniority";
  const postPathVi = path.join(rootDir, `src/content/posts/${slug}-vi.md`);
  const postPathDirect = path.join(rootDir, `src/content/posts/${slug}.md`);
  const targetPath = fs.existsSync(postPathVi) ? postPathVi : postPathDirect;

  if (!fs.existsSync(targetPath)) {
    console.error(`Post markdown file not found: ${targetPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(targetPath, "utf-8");
  const result = mdToCarousel(content, slug);
  const outJsonPath = path.join(rootDir, `src/content/posts/${slug}.carousel.json`);
  fs.writeFileSync(outJsonPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`✓ Deterministically generated ${result.slides.length} slides from ${path.basename(targetPath)} -> ${path.basename(outJsonPath)}`);
}
