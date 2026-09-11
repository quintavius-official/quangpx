import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { html } from "satori-html";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { mdToCarousel } from "./md-to-carousel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Load fonts
const fontRegularPath = path.join(__dirname, "fonts/GoogleSansCode-Regular.ttf");
const fontBoldPath = path.join(__dirname, "fonts/GoogleSansCode-Bold.ttf");

if (!fs.existsSync(fontRegularPath) || !fs.existsSync(fontBoldPath)) {
  console.error("Font files not found in scripts/fonts!");
  process.exit(1);
}

const fontRegular = fs.readFileSync(fontRegularPath);
const fontBold = fs.readFileSync(fontBoldPath);

const BRAND = {
  name: "Hộp Đen",
  url: "hopden.substack.com",
  author: "QuangPX",
  primaryColor: "#00B4DB",
  secondaryColor: "#FF007F",
  accentOrange: "#FF5E3A",
  bgDark: "#0B0D17",
  cardBg: "rgba(20, 26, 41, 0.88)",
  textMuted: "#94A3B8",
};

/**
 * Prepares image buffers as base64 data URLs for Satori
 */
async function getImageDataUrl(imagePath, width = 1080, height = 920) {
  if (!fs.existsSync(imagePath)) return null;
  const buffer = await sharp(imagePath)
    .resize(width, height, { fit: "cover", position: "center" })
    .jpeg({ quality: 88 })
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

async function getFullBgDataUrl(imagePath) {
  if (!fs.existsSync(imagePath)) return null;
  const buffer = await sharp(imagePath)
    .resize(1080, 1920, { fit: "cover", position: "center" })
    .jpeg({ quality: 85 })
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

async function getLogoDataUrl(logoPath) {
  if (!fs.existsSync(logoPath)) return null;
  const buffer = await sharp(logoPath)
    .resize(72, 72, { fit: "contain" })
    .png()
    .toBuffer();
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

/**
 * Slide 1: Cover slide with background hero image & gradient fade
 */
function renderCoverSlide(slide, meta, coverDataUrl, logoDataUrl) {
  const imageSection = coverDataUrl
    ? `
      <div style="display: flex; position: relative; width: 1080px; height: 920px;">
        <img src="${coverDataUrl}" style="width: 1080px; height: 920px; object-fit: cover;" />
        <div style="display: flex; position: absolute; bottom: 0; left: 0; right: 0; height: 420px; background: linear-gradient(to bottom, transparent, ${BRAND.bgDark});"></div>
      </div>
    `
    : "";

  const logoImg = logoDataUrl
    ? `<img src="${logoDataUrl}" style="width: 56px; height: 56px; border-radius: 14px;" />`
    : "";

  const raw = `
    <div style="display: flex; flex-direction: column; width: 1080px; height: 1920px; background-color: ${BRAND.bgDark}; color: white; font-family: 'Google Sans Code';">
      ${imageSection}

      <div style="display: flex; flex-direction: column; justify-content: space-between; flex: 1; padding: ${coverDataUrl ? "20px 80px 80px 80px" : "120px 80px 80px 80px"};">
        <div style="display: flex; flex-direction: column;">
          <div style="display: flex; align-items: center; margin-bottom: 32px;">
            <span style="display: flex; font-size: 24px; font-weight: 700; color: ${BRAND.primaryColor}; background-color: rgba(0, 180, 219, 0.12); border: 2px solid rgba(0, 180, 219, 0.4); padding: 8px 24px; border-radius: 9999px; letter-spacing: 2px;">
              ${slide.category || "CAREER & CULTURE"}
            </span>
          </div>

          <h1 style="font-size: 88px; font-weight: 700; line-height: 1.15; margin: 0 0 36px 0; color: #FFFFFF;">
            ${slide.title || meta.title || "Seniority"}
          </h1>

          <p style="font-size: 40px; font-weight: 400; line-height: 1.5; color: ${BRAND.textMuted}; margin: 0;">
            ${slide.subtitle || meta.description || ""}
          </p>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #1E293B; padding-top: 36px;">
          <div style="display: flex; align-items: center; gap: 20px;">
            ${logoImg}
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 28px; font-weight: 700; color: #F8FAFC;">${BRAND.name}</span>
              <span style="font-size: 22px; color: #64748B; margin-top: 2px;">${BRAND.url}</span>
            </div>
          </div>
          <span style="font-size: 28px; font-weight: 700; color: ${BRAND.primaryColor};">
            ${slide.pageIndicator}
          </span>
        </div>
      </div>
    </div>
  `;

  return html(raw);
}

/**
 * Slide Type: Insight / Quote Card (with full-bleed background image)
 */
function renderQuoteSlide(slide, meta, bgDataUrl, logoDataUrl) {
  const logoImg = logoDataUrl
    ? `<img src="${logoDataUrl}" style="width: 44px; height: 44px; border-radius: 10px;" />`
    : "";

  const bgSection = bgDataUrl
    ? `
      <img src="${bgDataUrl}" style="position: absolute; top: 0; left: 0; width: 1080px; height: 1920px; object-fit: cover;" />
      <div style="display: flex; position: absolute; top: 0; left: 0; width: 1080px; height: 1920px; background: rgba(11, 13, 23, 0.88);"></div>
    `
    : "";

  const takeawayHtml = slide.takeaway
    ? `
      <div style="display: flex; flex-direction: column; border-top: 1px solid rgba(255, 255, 255, 0.12); padding-top: 36px;">
        <p style="font-size: 34px; line-height: 1.6; color: #CBD5E1; margin: 0;">
          ${slide.takeaway}
        </p>
      </div>
    `
    : "";

  const raw = `
    <div style="display: flex; position: relative; width: 1080px; height: 1920px; background-color: ${BRAND.bgDark}; color: white; font-family: 'Google Sans Code';">
      ${bgSection}

      <div style="display: flex; flex-direction: column; justify-content: space-between; width: 1080px; height: 1920px; padding: 90px 80px 80px 80px;">
        <!-- Top header bar -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="display: flex; font-size: 24px; font-weight: 700; color: ${BRAND.primaryColor}; background-color: rgba(0, 180, 219, 0.15); border: 2px solid rgba(0, 180, 219, 0.5); padding: 8px 24px; border-radius: 9999px; letter-spacing: 2px;">
            ${slide.tag || "INSIGHT"}
          </span>
          <div style="display: flex; align-items: center; gap: 14px;">
            ${logoImg}
            <span style="font-size: 24px; color: #94A3B8;">${BRAND.name}</span>
          </div>
        </div>

        <!-- Main Content Block -->
        <div style="display: flex; flex-direction: column; justify-content: center; gap: 48px; margin: auto 0; padding: 20px 0;">
          <h2 style="font-size: 64px; font-weight: 700; line-height: 1.25; color: #FFFFFF; margin: 0;">
            ${slide.headline}
          </h2>

          <!-- Featured Quote Box -->
          <div style="display: flex; flex-direction: column; background-color: ${BRAND.cardBg}; border-radius: 20px; padding: 48px; border: 1px solid rgba(255, 255, 255, 0.1); border-left: 10px solid ${BRAND.primaryColor};">
            <span style="font-size: 72px; line-height: 0.8; color: ${BRAND.primaryColor}; margin-bottom: 20px; font-family: serif;">“</span>
            <p style="font-size: 40px; font-weight: 400; line-height: 1.5; color: #F1F5F9; margin: 0; font-style: italic;">
              ${slide.quote}
            </p>
          </div>

          ${takeawayHtml}
        </div>

        <!-- Bottom Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid rgba(255, 255, 255, 0.15); padding-top: 36px;">
          <span style="font-size: 24px; color: #94A3B8;">${BRAND.url}</span>
          <span style="font-size: 28px; font-weight: 700; color: ${BRAND.primaryColor};">
            ${slide.pageIndicator}
          </span>
        </div>
      </div>
    </div>
  `;

  return html(raw);
}

/**
 * Slide Type: Comparison / Analysis (with full-bleed background image)
 */
function renderComparisonSlide(slide, meta, bgDataUrl, logoDataUrl) {
  const logoImg = logoDataUrl
    ? `<img src="${logoDataUrl}" style="width: 44px; height: 44px; border-radius: 10px;" />`
    : "";

  const bgSection = bgDataUrl
    ? `
      <img src="${bgDataUrl}" style="position: absolute; top: 0; left: 0; width: 1080px; height: 1920px; object-fit: cover;" />
      <div style="display: flex; position: absolute; top: 0; left: 0; width: 1080px; height: 1920px; background: rgba(11, 13, 23, 0.88);"></div>
    `
    : "";

  const raw = `
    <div style="display: flex; position: relative; width: 1080px; height: 1920px; background-color: ${BRAND.bgDark}; color: white; font-family: 'Google Sans Code';">
      ${bgSection}

      <div style="display: flex; flex-direction: column; justify-content: space-between; width: 1080px; height: 1920px; padding: 90px 80px 80px 80px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="display: flex; font-size: 24px; font-weight: 700; color: ${BRAND.secondaryColor}; background-color: rgba(255, 0, 127, 0.15); border: 2px solid rgba(255, 0, 127, 0.4); padding: 8px 24px; border-radius: 9999px; letter-spacing: 2px;">
            ${slide.tag || "ANALYSIS"}
          </span>
          <div style="display: flex; align-items: center; gap: 14px;">
            ${logoImg}
            <span style="font-size: 24px; color: #94A3B8;">${BRAND.name}</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; justify-content: center; gap: 40px; margin: auto 0;">
          <h2 style="font-size: 64px; font-weight: 700; line-height: 1.25; color: #FFFFFF; margin: 0 0 10px 0;">
            ${slide.headline}
          </h2>

          <!-- Card 1 -->
          <div style="display: flex; flex-direction: column; background-color: ${BRAND.cardBg}; border: 2px solid rgba(0, 180, 219, 0.5); border-radius: 20px; padding: 48px;">
            <span style="font-size: 34px; font-weight: 700; color: ${BRAND.primaryColor}; margin-bottom: 18px;">
              ${slide.item1Title}
            </span>
            <p style="font-size: 34px; line-height: 1.55; color: #CBD5E1; margin: 0;">
              ${slide.item1Text}
            </p>
          </div>

          <!-- Card 2 -->
          <div style="display: flex; flex-direction: column; background-color: ${BRAND.cardBg}; border: 2px solid rgba(255, 0, 127, 0.5); border-radius: 20px; padding: 48px;">
            <span style="font-size: 34px; font-weight: 700; color: ${BRAND.secondaryColor}; margin-bottom: 18px;">
              ${slide.item2Title}
            </span>
            <p style="font-size: 34px; line-height: 1.55; color: #CBD5E1; margin: 0;">
              ${slide.item2Text}
            </p>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid rgba(255, 255, 255, 0.15); padding-top: 36px;">
          <span style="font-size: 24px; color: #94A3B8;">${BRAND.url}</span>
          <span style="font-size: 28px; font-weight: 700; color: ${BRAND.secondaryColor};">
            ${slide.pageIndicator}
          </span>
        </div>
      </div>
    </div>
  `;

  return html(raw);
}

/**
 * Strips markdown formatting for clean text rendering in Satori
 */
function formatMarkdownInline(str) {
  if (!str) return "";
  return str
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}

/**
 * Calculates responsive typography, gaps, and box paddings based on total character count
 * so text fills the vertical canvas comfortably without overflowing.
 */
function calculateDynamicStyles(slide) {
  if (slide.fontSize) {
    const fs = slide.fontSize;
    return {
      fontSize: fs,
      lineHeight: 1.6,
      blockGap: 24,
      boxPadding: "28px 32px",
      boxFontSize: fs - 2,
      quoteFontSize: fs + 2,
      sidenoteFontSize: Math.max(22, fs - 2),
      headlineFontSize: Math.min(50, fs + 16),
    };
  }

  // Calculate approximate text density
  let totalChars = 0;
  if (slide.headline) totalChars += slide.headline.length * 2.2 + 80;
  if (slide.paragraphs) {
    totalChars += slide.paragraphs.reduce((sum, p) => sum + p.length, 0);
  }
  if (slide.boxes) {
    totalChars += slide.boxes.reduce((sum, b) => sum + (b.title ? b.title.length : 0) + (b.text ? b.text.length : 0), 0) * 1.15;
  }
  if (slide.quote) totalChars += slide.quote.length * 1.15;
  if (slide.sidenote) totalChars += slide.sidenote.length * 1.15;

  let fontSize;
  let lineHeight;
  let blockGap;
  let boxPadding;

  if (totalChars <= 220) {
    // Very short text: fill slide with prominent, readable typography
    fontSize = 38;
    lineHeight = 1.68;
    blockGap = 32;
    boxPadding = "36px 40px";
  } else if (totalChars <= 380) {
    // Medium-short text
    fontSize = 34;
    lineHeight = 1.62;
    blockGap = 26;
    boxPadding = "32px 36px";
  } else if (totalChars <= 550) {
    // Standard reading size
    fontSize = 31;
    lineHeight = 1.58;
    blockGap = 22;
    boxPadding = "28px 32px";
  } else if (totalChars <= 720) {
    // Longer text: scale down to guarantee zero overflow
    fontSize = 28;
    lineHeight = 1.54;
    blockGap = 18;
    boxPadding = "24px 28px";
  } else {
    // Very dense text / large callout cards
    fontSize = 25;
    lineHeight = 1.48;
    blockGap = 14;
    boxPadding = "20px 24px";
  }

  return {
    fontSize,
    lineHeight,
    blockGap,
    boxPadding,
    boxFontSize: Math.max(22, fontSize - 2),
    quoteFontSize: fontSize + 2,
    sidenoteFontSize: Math.max(22, fontSize - 2),
    headlineFontSize: Math.min(46, fontSize + 12),
  };
}

/**
 * Slide Type: Long-form Editorial / Reader Slide (for storytelling, essays, and dense reading)
 */
function renderReaderSlide(slide, meta, bgDataUrl, logoDataUrl) {
  const logoImg = logoDataUrl
    ? `<img src="${logoDataUrl}" style="width: 44px; height: 44px; border-radius: 10px;" />`
    : "";

  const bgSection = bgDataUrl
    ? `
      <img src="${bgDataUrl}" style="position: absolute; top: 0; left: 0; width: 1080px; height: 1920px; object-fit: cover;" />
      <div style="display: flex; position: absolute; top: 0; left: 0; width: 1080px; height: 1920px; background: rgba(11, 13, 23, 0.88);"></div>
    `
    : "";

  const styles = calculateDynamicStyles(slide);
  const bodyFontSize = styles.fontSize;

  const paragraphsHtml = (slide.paragraphs || []).map(p => `
    <p style="font-size: ${bodyFontSize}px; line-height: ${styles.lineHeight}; color: #E2E8F0; margin: 0 0 ${Math.max(12, styles.blockGap - 6)}px 0;">
      ${formatMarkdownInline(p)}
    </p>
  `).join("");

  const boxesHtml = (slide.boxes || []).map(b => {
    const isPink = b.accent === BRAND.secondaryColor || b.accent === "pink" || b.accent === "#FF007F";
    const accentColor = isPink ? BRAND.secondaryColor : BRAND.primaryColor;
    const bgRgba = isPink ? "rgba(255, 0, 127, 0.08)" : "rgba(0, 180, 219, 0.08)";
    const borderRgba = isPink ? "rgba(255, 0, 127, 0.3)" : "rgba(0, 180, 219, 0.3)";
    const textParagraphs = (b.text || "").split("\n\n").map(tp => `
      <p style="font-size: ${b.fontSize || styles.boxFontSize}px; line-height: ${styles.lineHeight}; color: #E2E8F0; margin: 0 0 10px 0;">
        ${formatMarkdownInline(tp)}
      </p>
    `).join("");
    return `
      <div style="display: flex; flex-direction: column; background: ${bgRgba}; border: 1px solid ${borderRgba}; border-left: 8px solid ${accentColor}; border-radius: 16px; padding: ${styles.boxPadding}; margin: 8px 0;">
        ${b.title ? `<span style="font-size: ${styles.boxFontSize + 2}px; font-weight: 700; color: ${accentColor}; margin-bottom: 12px; letter-spacing: 1px;">${formatMarkdownInline(b.title)}</span>` : ""}
        <div style="display: flex; flex-direction: column;">
          ${textParagraphs}
        </div>
      </div>
    `;
  }).join("");

  const quoteHtml = slide.quote
    ? `
      <div style="display: flex; flex-direction: column; background: rgba(255, 0, 127, 0.08); border-left: 8px solid ${BRAND.secondaryColor}; border-radius: 16px; padding: ${styles.boxPadding}; margin: 8px 0;">
        <p style="font-size: ${slide.quoteFontSize || styles.quoteFontSize}px; font-weight: 600; line-height: 1.55; color: #FFFFFF; margin: 0; font-style: italic;">
          “${formatMarkdownInline(slide.quote)}”
        </p>
      </div>
    `
    : "";

  const sidenoteHtml = slide.sidenote
    ? `
      <div style="display: flex; flex-direction: column; background: rgba(0, 180, 219, 0.08); border: 1px solid rgba(0, 180, 219, 0.3); border-left: 8px solid ${BRAND.primaryColor}; border-radius: 16px; padding: ${styles.boxPadding}; margin: 8px 0;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <span style="font-size: ${styles.sidenoteFontSize - 4}px; font-weight: 700; color: ${BRAND.primaryColor}; letter-spacing: 2px;">
            SIDE NOTE / TỰ SỰ CỦA TÁC GIẢ
          </span>
        </div>
        <p style="font-size: ${slide.sidenoteFontSize || styles.sidenoteFontSize}px; font-style: italic; line-height: ${styles.lineHeight}; color: #CBD5E1; margin: 0;">
          ${formatMarkdownInline(slide.sidenote)}
        </p>
      </div>
    `
    : "";

  const takeawayHtml = slide.takeaway
    ? `
      <div style="display: flex; flex-direction: column; border-top: 1px solid rgba(255, 255, 255, 0.12); padding-top: 20px;">
        <p style="font-size: ${styles.fontSize}px; line-height: ${styles.lineHeight}; color: #94A3B8; margin: 0;">
          ${formatMarkdownInline(slide.takeaway)}
        </p>
      </div>
    `
    : "";

  const raw = `
    <div style="display: flex; position: relative; width: 1080px; height: 1920px; background-color: ${BRAND.bgDark}; color: white; font-family: 'Google Sans Code';">
      ${bgSection}

      <div style="display: flex; flex-direction: column; justify-content: space-between; width: 1080px; height: 1920px; padding: 90px 80px 80px 80px;">
        <!-- Top header bar -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="display: flex; font-size: 24px; font-weight: 700; color: ${BRAND.primaryColor}; background-color: rgba(0, 180, 219, 0.15); border: 2px solid rgba(0, 180, 219, 0.5); padding: 8px 24px; border-radius: 9999px; letter-spacing: 2px;">
            ${slide.tag || "ESSAY"}
          </span>
          <div style="display: flex; align-items: center; gap: 14px;">
            ${logoImg}
            <span style="font-size: 24px; color: #94A3B8;">${BRAND.name}</span>
          </div>
        </div>

        <!-- Main Reading Block: Centered vertically and flex: 1 to fill available height comfortably -->
        <div style="display: flex; flex-direction: column; justify-content: center; flex: 1; gap: ${styles.blockGap}px; padding: 20px 0;">
          ${slide.headline ? `
            <h2 style="font-size: ${styles.headlineFontSize}px; font-weight: 700; line-height: 1.3; color: #FFFFFF; margin: 0 0 16px 0;">
              ${formatMarkdownInline(slide.headline)}
            </h2>
          ` : ""}

          <div style="display: flex; flex-direction: column;">
            ${paragraphsHtml}
          </div>

          ${boxesHtml}
          ${quoteHtml}
          ${sidenoteHtml}
          ${takeawayHtml}
        </div>

        <!-- Bottom Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid rgba(255, 255, 255, 0.15); padding-top: 36px;">
          <span style="font-size: 24px; color: #94A3B8;">${BRAND.url}</span>
          <span style="font-size: 28px; font-weight: 700; color: ${BRAND.primaryColor};">
            ${slide.pageIndicator}
          </span>
        </div>
      </div>
    </div>
  `;

  return html(raw);
}

/**
 * Slide Type: Outro / CTA (with full-bleed background image)
 */
function renderCtaSlide(slide, meta, bgDataUrl, logoDataUrl) {
  const logoImg = logoDataUrl
    ? `<img src="${logoDataUrl}" style="width: 120px; height: 120px; border-radius: 28px; margin-bottom: 10px;" />`
    : "";

  const bgSection = bgDataUrl
    ? `
      <img src="${bgDataUrl}" style="position: absolute; top: 0; left: 0; width: 1080px; height: 1920px; object-fit: cover;" />
      <div style="display: flex; position: absolute; top: 0; left: 0; width: 1080px; height: 1920px; background: rgba(11, 13, 23, 0.90);"></div>
    `
    : "";

  const raw = `
    <div style="display: flex; position: relative; width: 1080px; height: 1920px; background-color: ${BRAND.bgDark}; color: white; font-family: 'Google Sans Code';">
      ${bgSection}

      <div style="display: flex; flex-direction: column; justify-content: space-between; width: 1080px; height: 1920px; padding: 100px 80px 80px 80px;">
        <div style="display: flex; align-items: center;">
          <span style="display: flex; font-size: 24px; font-weight: 700; color: ${BRAND.primaryColor}; background-color: rgba(0, 180, 219, 0.15); border: 2px solid rgba(0, 180, 219, 0.4); padding: 8px 24px; border-radius: 9999px; letter-spacing: 2px;">
            HỘP ĐEN
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 40px; margin: auto 0;">
          ${logoImg}

          <h2 style="font-size: 78px; font-weight: 700; line-height: 1.15; color: #FFFFFF; margin: 0;">
            ${slide.headline || BRAND.name}
          </h2>

          <p style="font-size: 40px; line-height: 1.55; color: ${BRAND.textMuted}; margin: 0;">
            ${slide.subtitle || "Nơi mổ xẻ những sự thật trần trụi, cạm bẫy ngầm và hồ sơ quyền lực nơi công sở."}
          </p>

          <!-- CTA Box -->
          <div style="display: flex; flex-direction: column; background: linear-gradient(135deg, rgba(0, 180, 219, 0.2), rgba(255, 0, 127, 0.2)); border: 2px solid rgba(0, 180, 219, 0.5); border-radius: 24px; padding: 48px; margin-top: 20px;">
            <span style="font-size: 28px; font-weight: 700; color: #94A3B8; letter-spacing: 2px; margin-bottom: 14px;">
              ĐỌC TRỌN BỘ BÀI VIẾT TẠI:
            </span>
            <span style="font-size: 44px; font-weight: 700; color: #38BDF8; word-break: break-all;">
              ${BRAND.url}
            </span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid rgba(255, 255, 255, 0.15); padding-top: 36px;">
          <span style="font-size: 28px; font-weight: 700; color: #F8FAFC;">Tác giả: ${BRAND.author}</span>
          <span style="font-size: 28px; font-weight: 700; color: ${BRAND.primaryColor};">
            ${slide.pageIndicator}
          </span>
        </div>
      </div>
    </div>
  `;

  return html(raw);
}

/**
 * Main generator function
 */
export async function generateCarousel(options) {
  const { postFile, slides, outputDir, targetPage = null } = options;

  if (targetPage !== null) {
    if (isNaN(targetPage) || targetPage < 1 || targetPage > slides.length) {
      console.error(`❌ Trang không hợp lệ: ${targetPage}. Tổng số slide: ${slides.length}`);
      process.exit(1);
    }
  }

  console.log(`\n========================================`);
  console.log(`Generating Carousel: ${postFile}`);
  console.log(`Output: ${outputDir}`);
  if (targetPage !== null) {
    console.log(`Target: Slide ${targetPage} of ${slides.length}`);
  } else {
    console.log(`Total Slides: ${slides.length}`);
  }
  console.log(`========================================\n`);

  fs.mkdirSync(outputDir, { recursive: true });

  // Resolve cover image and full background data URL
  let coverDataUrl = null;
  let bgDataUrl = null;
  if (slides[0]?.coverImage) {
    coverDataUrl = await getImageDataUrl(slides[0].coverImage, 1080, 920);
    bgDataUrl = await getFullBgDataUrl(slides[0].coverImage);
  }

  const logoPath = path.join(__dirname, "assets/cd-logo.png");
  const logoDataUrl = await getLogoDataUrl(logoPath);

  for (let i = 0; i < slides.length; i++) {
    const slideNumber = i + 1;
    if (targetPage !== null && slideNumber !== targetPage) {
      continue;
    }

    const slide = slides[i];
    const isLast = slideNumber === slides.length;
    slide.pageIndicator = `${slideNumber} / ${slides.length} ${isLast ? "•" : "→"}`;

    let markupNode;
    if (slide.type === "cover") {
      markupNode = renderCoverSlide(slide, {}, coverDataUrl, logoDataUrl);
    } else if (slide.type === "comparison") {
      markupNode = renderComparisonSlide(slide, {}, bgDataUrl, logoDataUrl);
    } else if (slide.type === "cta") {
      markupNode = renderCtaSlide(slide, {}, bgDataUrl, logoDataUrl);
    } else if (slide.type === "reader" || slide.type === "story") {
      markupNode = renderReaderSlide(slide, {}, bgDataUrl, logoDataUrl);
    } else {
      markupNode = renderQuoteSlide(slide, {}, bgDataUrl, logoDataUrl);
    }

    const svg = await satori(markupNode, {
      width: 1080,
      height: 1920,
      fonts: [
        {
          name: "Google Sans Code",
          data: fontRegular,
          weight: 400,
          style: "normal",
        },
        {
          name: "Google Sans Code",
          data: fontBold,
          weight: 700,
          style: "normal",
        },
      ],
    });

    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1080 } });
    const pngData = resvg.render().asPng();

    const outputPath = path.join(
      outputDir,
      `slide_${String(slideNumber).padStart(2, "0")}.png`
    );
    fs.writeFileSync(outputPath, pngData);
    console.log(`✓ Slide ${slideNumber}/${slides.length} -> ${outputPath}`);
  }

  if (targetPage !== null) {
    console.log(`\n✨ Hoàn thành! Đã tạo slide ${targetPage} tại: ${outputDir}\n`);
  } else {
    console.log(`\n✨ Hoàn thành! Toàn bộ slide đã được lưu tại: ${outputDir}\n`);
  }
}

// Check for companion JSON file or fallback
const args = process.argv.slice(2);

// Parse page options: --page 1, -p 1, --slide 1, -s 1, --page=1
let targetPage = null;
const pageFlagIdx = args.findIndex(a => a === "--page" || a === "-p" || a === "--slide" || a === "-s");
if (pageFlagIdx !== -1 && args[pageFlagIdx + 1]) {
  targetPage = parseInt(args[pageFlagIdx + 1], 10);
} else {
  const inlinePageFlag = args.find(a => a.startsWith("--page=") || a.startsWith("--slide="));
  if (inlinePageFlag) {
    targetPage = parseInt(inlinePageFlag.split("=")[1], 10);
  }
}

// Extract non-flag arguments
const cleanArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--page" || args[i] === "-p" || args[i] === "--slide" || args[i] === "-s") {
    i++; // skip value
    continue;
  }
  if (args[i].startsWith("-")) {
    continue;
  }
  cleanArgs.push(args[i]);
}

let postName = "seniority";
if (cleanArgs.length > 0) {
  if (isNaN(Number(cleanArgs[0]))) {
    postName = cleanArgs[0];
    if (targetPage === null && cleanArgs.length > 1 && !isNaN(Number(cleanArgs[1]))) {
      targetPage = parseInt(cleanArgs[1], 10);
    }
  } else {
    // e.g. `node scripts/generate-carousel.js 1`
    targetPage = parseInt(cleanArgs[0], 10);
  }
}

const forceFromMd = args.includes("--from-md");
const outputFolder = path.join(rootDir, "output/carousels", postName);

const companionJsonPath = path.join(
  rootDir,
  "src/content/posts",
  `${postName}.carousel.json`
);

let slidesToRun;

const postPathVi = path.join(rootDir, `src/content/posts/${postName}-vi.md`);
const postPathDirect = path.join(rootDir, `src/content/posts/${postName}.md`);
const mdPath = fs.existsSync(postPathVi) ? postPathVi : (fs.existsSync(postPathDirect) ? postPathDirect : null);

let isMdNewer = false;
if (fs.existsSync(companionJsonPath) && mdPath) {
  const mdMtime = fs.statSync(mdPath).mtimeMs;
  const jsonMtime = fs.statSync(companionJsonPath).mtimeMs;
  if (mdMtime > jsonMtime) {
    isMdNewer = true;
  }
}

// If explicitly requested, JSON doesn't exist, or markdown is newer than JSON, generate from markdown
if (forceFromMd || !fs.existsSync(companionJsonPath) || isMdNewer) {
  if (mdPath) {
    console.log(`Generating slides deterministically from markdown: ${mdPath}`);
    const mdContent = fs.readFileSync(mdPath, "utf-8");
    const generatedData = mdToCarousel(mdContent, postName);
    fs.writeFileSync(companionJsonPath, JSON.stringify(generatedData, null, 2), "utf-8");
    slidesToRun = generatedData.slides;
  }
}

if (!slidesToRun && fs.existsSync(companionJsonPath)) {
  console.log(`Loaded custom slides definition from: ${companionJsonPath}`);
  const rawData = JSON.parse(fs.readFileSync(companionJsonPath, "utf-8"));
  slidesToRun = rawData.slides;
}

if (!slidesToRun) {
  console.error(`Could not find or generate slides for post: ${postName}`);
  process.exit(1);
}

// Resolve cover image path
if (
  slidesToRun[0]?.coverImage &&
  !path.isAbsolute(slidesToRun[0].coverImage)
) {
  slidesToRun[0].coverImage = path.resolve(
    rootDir,
    "src/content/posts",
    slidesToRun[0].coverImage
  );
}

generateCarousel({
  postFile: postName,
  slides: slidesToRun,
  outputDir: outputFolder,
  targetPage,
}).catch(console.error);

