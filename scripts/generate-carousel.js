import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { html } from "satori-html";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

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
  name: "The Corporate Dispatch",
  url: "corpdispatch.substack.com",
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
            THE CORPORATE DISPATCH
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 40px; margin: auto 0;">
          ${logoImg}

          <h2 style="font-size: 78px; font-weight: 700; line-height: 1.15; color: #FFFFFF; margin: 0;">
            ${slide.headline || "Quên System Design đi."}
          </h2>

          <p style="font-size: 40px; line-height: 1.55; color: ${BRAND.textMuted}; margin: 0;">
            ${slide.subtitle || "Nơi mổ xẻ những sự thật trần trụi, cạm bẫy ngầm và trò chơi quyền lực nơi công sở."}
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
  const { postFile, slides, outputDir } = options;

  console.log(`\n========================================`);
  console.log(`Generating Carousel: ${postFile}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Total Slides: ${slides.length}`);
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
    const slide = slides[i];
    const slideNumber = i + 1;
    const isLast = slideNumber === slides.length;
    slide.pageIndicator = `${slideNumber} / ${slides.length} ${isLast ? "•" : "→"}`;

    let markupNode;
    if (slide.type === "cover") {
      markupNode = renderCoverSlide(slide, {}, coverDataUrl, logoDataUrl);
    } else if (slide.type === "comparison") {
      markupNode = renderComparisonSlide(slide, {}, bgDataUrl, logoDataUrl);
    } else if (slide.type === "cta") {
      markupNode = renderCtaSlide(slide, {}, bgDataUrl, logoDataUrl);
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

  console.log(`\n✨ Hoàn thành! Toàn bộ slide đã được lưu tại: ${outputDir}\n`);
}

// Check for companion JSON file or fallback
const args = process.argv.slice(2);
const postName = args[0] || "seniority";
const outputFolder = path.join(rootDir, "output/carousels", postName);

const companionJsonPath = path.join(
  rootDir,
  "src/content/posts",
  `${postName}.carousel.json`
);

let slidesToRun;
if (fs.existsSync(companionJsonPath)) {
  console.log(`Loaded custom slides definition from: ${companionJsonPath}`);
  const rawData = JSON.parse(fs.readFileSync(companionJsonPath, "utf-8"));
  slidesToRun = rawData.slides;
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
} else {
  console.log(`Using fallback slides for: ${postName}`);
  slidesToRun = [
    {
      type: "cover",
      category: "CAREER & CULTURE",
      title: "Seniority",
      subtitle:
        "Thế nào là một senior thực thụ? Và khi tài năng bị biến thành công cụ trong các Black Company và Dark Corporation.",
      coverImage: path.join(rootDir, "src/content/posts/senior-borderland.png"),
    },
  ];
}

generateCarousel({
  postFile: postName,
  slides: slidesToRun,
  outputDir: outputFolder,
}).catch(console.error);
