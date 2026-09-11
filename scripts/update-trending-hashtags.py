#!/usr/bin/env python3
"""
update-trending-hashtags.py
----------------------------
Script to select optimal trending TikTok hashtags for posts in the 'Trò Chơi Công Sở' series
using semantic keyword matching against high-performing Vietnamese TikTok workplace/career tags.

Updates:
1. Markdown frontmatter `tags` in `src/content/posts/*-vi.md`
2. Companion JSON `meta.tags` in `src/content/posts/<slug>.carousel.json`

Usage:
  python3 scripts/update-trending-hashtags.py
  python3 scripts/update-trending-hashtags.py --dry-run
  python3 scripts/update-trending-hashtags.py --slug fake-incentives
"""

import argparse
import json
import re
import unicodedata
from pathlib import Path
from typing import Dict, List, Set, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT_DIR / "src" / "content" / "posts"

# ==============================================================================
# 1. TRENDING TIKTOK WORKPLACE & CAREER HASHTAG DATABASE (VIETNAM)
# ==============================================================================
HASHTAG_DATABASE = [
    # --- Series Brand & Anchor ---
    {
        "tag": "trochoicongso",
        "category": "brand",
        "tier": "anchor",
        "keywords": ["tro choi cong so", "tro choi", "cong so", "dark corporation", "black company", "luat choi"],
        "description": "Hashtag thương hiệu series & Substack Trò Chơi Công Sở",
    },
    # --- Tier 1: Mass Reach (High Volume / 500M - 2B+ views) ---
    {
        "tag": "chuyencongso",
        "category": "mass",
        "tier": "high",
        "keywords": ["chuyen cong so", "cong so", "van phong", "di lam", "dong nghiep", "cong ty"],
        "description": "Chủ đề văn phòng & câu chuyện công sở lớn nhất TikTok VN",
    },
    {
        "tag": "dramacongso",
        "category": "mass",
        "tier": "high",
        "keywords": ["drama", "boc phot", "dau da", "xung dot", "bat cong", "chinh tri", "toxic", "tham doc"],
        "description": "Nội dung drama, xung đột, đấu đá và góc khuất văn phòng",
    },
    {
        "tag": "dilam",
        "category": "mass",
        "tier": "high",
        "keywords": ["di lam", "nguoi di lam", "cong viec", "van phong", "di lam vui", "ap luc di lam"],
        "description": "Tag chung về trải nghiệm đi làm",
    },

    # --- Tier 2: Workplace Psychology & Dark Dynamics (100M - 500M+ views) ---
    {
        "tag": "tamlycongso",
        "category": "psychology",
        "tier": "high",
        "keywords": ["tam ly", "thao tung", "tam ly cong so", "gaslighting", "imposter syndrome", "dan vat", "cam xuc", "ap luc", "kiem soat"],
        "description": "Tâm lý học công sở, thao túng tâm lý và cảm xúc nhân viên",
    },
    {
        "tag": "toxicworkplace",
        "category": "pain_point",
        "tier": "high",
        "keywords": ["toxic", "moitruongtoxic", "cong ty toxic", "doc hai", "black company", "dark corporation", "sep toxic", "ap buc", "bon rut"],
        "description": "Môi trường làm việc độc hại, áp bức",
    },
    {
        "tag": "septoxic",
        "category": "pain_point",
        "tier": "medium",
        "keywords": ["sep toxic", "quan ly", "lanh dao", "sep", "middle management", "sep ham", "sep toi"],
        "description": "Sếp và cấp quản lý độc hại",
    },
    {
        "tag": "reviewcongty",
        "category": "pain_point",
        "tier": "high",
        "keywords": ["review cong ty", "phong van", "chon cong ty", "black company", "dark corporation", "cong ty tot", "cong ty xau", "canh bao"],
        "description": "Kinh nghiệm thẩm định và review môi trường công ty",
    },
    {
        "tag": "gockhuatcongso",
        "category": "pain_point",
        "tier": "medium",
        "keywords": ["goc khuat", "su that", "mat toi", "tran trui", "cam bay", "bi mat cong so", "sau lung"],
        "description": "Những mặt tối và sự thật trần trụi ít người dám nói",
    },
    {
        "tag": "kinhnghiemdilam",
        "category": "career",
        "tier": "high",
        "keywords": ["kinh nghiem", "bai hoc", "ky nang", "kinh nghiem di lam", "phat trien su nghiep", "song sot cong so", "sinh ton"],
        "description": "Bài học kinh nghiệm thực chiến đi làm",
    },

    # --- Tier 3: Target Audience / Professional Segment ---
    {
        "tag": "danit",
        "category": "audience",
        "tier": "medium",
        "keywords": ["dan it", "lap trinh vien", "developer", "engineer", "tech", "software", "coder", "ky su phan mem", "dev", "tech team"],
        "description": "Cộng đồng lập trình viên, kỹ sư công nghệ",
    },
    {
        "tag": "senior",
        "category": "audience",
        "tier": "medium",
        "keywords": ["senior", "seniority", "chuyen mon", "ganh team", "nang luc", "chuyen gia", "lead", "doi tac"],
        "description": "Cấp bậc senior, người có chuyên môn cao gánh vác dự án",
    },

    # --- Tier 4: Specific Semantic Topic Tags ---
    # Topic 1: Fake Incentives / Title Inflation
    {
        "tag": "banhve",
        "category": "topic_specific",
        "tier": "high",
        "target_slugs": ["fake-incentives"],
        "keywords": ["banh ve", "co hoi ma", "hua hen", "title rong", "khong ngan sach", "con lua", "ve du an", "loi hua"],
        "description": "Bánh vẽ công sở, lời hứa hão và chức danh rỗng",
    },
    {
        "tag": "thangtien",
        "category": "topic_specific",
        "tier": "medium",
        "target_slugs": ["fake-incentives"],
        "keywords": ["thang tien", "chuc danh", "title", "tang luong", "len chuc", "su nghiep", "dai ngo", "title inflation"],
        "description": "Thăng tiến chức danh và sự nghiệp",
    },
    # Topic 2: Moving Goalposts / KPIs / Imposter Syndrome
    {
        "tag": "doicocgon",
        "category": "topic_specific",
        "tier": "medium",
        "target_slugs": ["moving-goalposts"],
        "keywords": ["doi coc gon", "moving goalposts", "thay doi tieu chi", "tuyen x lam y danh gia z", "chua du tot", "danh gia kpi"],
        "description": "Chiến thuật dời cọc gôn, thay đổi tiêu chí đánh giá liên tục",
    },
    {
        "tag": "kpi",
        "category": "topic_specific",
        "tier": "high",
        "target_slugs": ["moving-goalposts"],
        "keywords": ["kpi", "danh gia", "danh gia nhan vien", "hieu suat", "performance review", "ap luc kpi", "dat chi tieu", "reset luong"],
        "description": "Đánh giá KPI và hiệu suất công việc",
    },
    # Topic 3: Conformity Trap / Tall Poppy / Culture Fit
    {
        "tag": "caobang",
        "category": "topic_specific",
        "tier": "medium",
        "target_slugs": ["the-conformity-trap"],
        "keywords": ["cao bang", "chiec long cao bang", "triet ha", "tieu chuan thap", "nguoi gioi", "vuot troi", "dong hoa"],
        "description": "Tư duy cào bằng, triệt hạ sự vượt trội",
    },
    {
        "tag": "lechvanhoa",
        "category": "topic_specific",
        "tier": "medium",
        "target_slugs": ["the-conformity-trap"],
        "keywords": ["lech van hoa", "culture fit", "van hoa cong ty", "gan mac", "tu duy doc lap", "khac biet", "chong doi"],
        "description": "Gắn mác lệch văn hóa để loại trừ người giỏi",
    },
    {
        "tag": "tallpoppysyndrome",
        "category": "topic_specific",
        "tier": "niche",
        "target_slugs": ["the-conformity-trap"],
        "keywords": ["tall poppy syndrome", "cay anh thao cao", "hoa anh thao", "chat ngon", "ghen ghet", "do ky"],
        "description": "Hội chứng chặt ngọn cây cao, đố kỵ tài năng",
    },
    # Topic 4: Information Gatekeeping / Proxies / Politics
    {
        "tag": "kegaccong",
        "category": "topic_specific",
        "tier": "medium",
        "target_slugs": ["information-gatekeeping"],
        "keywords": ["ke gac cong", "gatekeeper", "thong tin", "khach hang", "bop meo", "chiec guong bien dang", "account manager", "proxy"],
        "description": "Kẻ gác cổng thông tin thao túng mối quan hệ đối tác",
    },
    {
        "tag": "batdoixungthongtin",
        "category": "topic_specific",
        "tier": "medium",
        "target_slugs": ["information-gatekeeping"],
        "keywords": ["bat doi xung thong tin", "information asymmetry", "giau thong tin", "tam man nhung", "chia de tri"],
        "description": "Bất đối xứng thông tin và chia để trị",
    },
    {
        "tag": "daudachinhtri",
        "category": "topic_specific",
        "tier": "medium",
        "target_slugs": ["information-gatekeeping"],
        "keywords": ["dau da", "chinh tri", "phe canh", "loi ich nhom", "san sau", "tranh gianh quyen luc"],
        "description": "Đấu đá chính trị và phe nhóm nơi công sở",
    },
    # Topic 5: Silent Siege / Cold Violence / Quiet Firing
    {
        "tag": "baoluclanh",
        "category": "topic_specific",
        "tier": "high",
        "target_slugs": ["the-silent-siege"],
        "keywords": ["bao luc lanh", "tay chay", "co lap", "lanh nhat", "khong noi chuyen", "ngot ngao", "triet ha tham lang", "co lap ngam"],
        "description": "Bạo lực lạnh và tẩy chay ngầm nơi công sở",
    },
    {
        "tag": "colap",
        "category": "topic_specific",
        "tier": "medium",
        "target_slugs": ["the-silent-siege"],
        "keywords": ["co lap", "vong vay tham lang", "rut can sinh luc", "khong viec", "day ra ria", "bystander effect"],
        "description": "Chiến thuật cô lập nhân viên",
    },
    {
        "tag": "quietfiring",
        "category": "topic_specific",
        "tier": "high",
        "target_slugs": ["the-silent-siege"],
        "keywords": ["quiet firing", "sa thai ngam", "ep nghi viec", "tu nghi", "chan nan", "heo mon"],
        "description": "Sa thải ngầm, dồn ép nhân viên tự nộp đơn xin nghỉ",
    },
]

# Series posts configuration
SERIES_POSTS_CONFIG = {
    "seniority": {
        "file": "seniority-vi.md",
        "carousel": "seniority.carousel.json",
        "core_themes": ["tro choi mo dau", "thao tung", "luat choi", "senior", "dan it", "black company", "dark corporation", "ranh gioi kiem soat"],
        "mass_tags": ["chuyencongso", "dramacongso"],
        "priority_tags": ["danit", "senior"],
        "max_tags": 7,
    },
    "fake-incentives": {
        "file": "fake-incentives-vi.md",
        "carousel": "fake-incentives.carousel.json",
        "core_themes": ["banh ve", "chuc danh", "khong ngan sach", "hua hen", "thang tien", "title inflation", "bon rut effort", "review cong ty"],
        "mass_tags": ["chuyencongso", "dramacongso"],
        "priority_tags": ["banhve", "thangtien"],
        "max_tags": 7,
    },
    "moving-goalposts": {
        "file": "moving-goalposts-vi.md",
        "carousel": "moving-goalposts.carousel.json",
        "core_themes": ["doi coc gon", "kpi", "tuyen x lam y danh gia z", "thuyen chuyen", "reset luong", "chua du tot", "imposter syndrome"],
        "mass_tags": ["chuyencongso"],
        "priority_tags": ["doicocgon", "kpi", "kinhnghiemdilam"],
        "max_tags": 7,
    },
    "the-conformity-trap": {
        "file": "the-conformity-trap-vi.md",
        "carousel": "the-conformity-trap.carousel.json",
        "core_themes": ["cao bang", "lech van hoa", "chiec long cao bang", "triet ha nguoi gioi", "tall poppy syndrome", "cuop cong y tuong", "goc khuat"],
        "mass_tags": ["chuyencongso", "dramacongso"],
        "priority_tags": ["caobang", "lechvanhoa", "gockhuatcongso"],
        "max_tags": 7,
    },
    "information-gatekeeping": {
        "file": "information-gatekeeping-vi.md",
        "carousel": "information-gatekeeping.carousel.json",
        "core_themes": ["ke gac cong", "bat doi xung thong tin", "bop meo su that", "khach hang", "dau da chinh tri", "chia de tri", "dan it"],
        "mass_tags": ["chuyencongso", "dramacongso"],
        "priority_tags": ["kegaccong", "daudachinhtri", "danit"],
        "max_tags": 7,
    },
    "the-silent-siege": {
        "file": "the-silent-siege-vi.md",
        "carousel": "the-silent-siege.carousel.json",
        "core_themes": ["vong vay tham lang", "bao luc lanh", "co lap", "quiet firing", "triet ha khong vet mau", "middle management", "moitruongtoxic"],
        "mass_tags": ["chuyencongso", "dramacongso"],
        "priority_tags": ["baoluclanh", "colap", "quietfiring"],
        "max_tags": 7,
    },
}


def remove_accents(input_str: str) -> str:
    """Normalize Vietnamese characters to unaccented lowercase ASCII."""
    nfkd_form = unicodedata.normalize("NFKD", input_str)
    res = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    return res.replace("đ", "d").replace("Đ", "D").lower()


def compute_semantic_score(
    slug: str, title: str, description: str, body: str, hashtag_def: Dict, post_core_themes: List[str]
) -> float:
    """Computes a semantic match score between a post's context/themes and a hashtag definition."""
    target_slugs = hashtag_def.get("target_slugs")
    if target_slugs and slug not in target_slugs:
        return -100.0

    score = 0.0
    category = hashtag_def["category"]
    tier = hashtag_def["tier"]

    # Base category weights
    if category == "brand":
        score += 150.0  # Mandatory anchor
    elif category == "topic_specific":
        score += 60.0
    elif category == "psychology":
        score += 35.0
    elif category == "pain_point":
        score += 35.0
    elif category == "mass":
        score += 25.0
    elif category == "audience":
        score += 25.0

    if tier == "high":
        score += 10.0
    elif tier == "medium":
        score += 5.0

    norm_title = remove_accents(title)
    norm_desc = remove_accents(description)
    norm_themes = [remove_accents(t) for t in post_core_themes]
    norm_body = remove_accents(body[:2000])

    for kw in hashtag_def["keywords"]:
        norm_kw = remove_accents(kw)

        # Match in Title (Weight x40)
        if norm_kw in norm_title:
            score += 40.0

        # Match in Core Themes (Weight x30)
        for theme in norm_themes:
            if norm_kw in theme or theme in norm_kw:
                score += 30.0

        # Match in Description (Weight x20)
        if norm_kw in norm_desc:
            score += 20.0

        # Match in Body (Weight x5, capped at 15)
        count_body = norm_body.count(norm_kw)
        if count_body > 0:
            score += min(count_body * 5.0, 15.0)

    return score


def select_best_hashtags(
    slug: str, title: str, description: str, body: str, max_tags: int = 7
) -> List[str]:
    """
    Selects the optimal curated set of 5-7 trending hashtags:
    1 Brand Tag (#trochoicongso)
    + 1-2 Mass Tags (#chuyencongso, #dramacongso)
    + 1-2 High-Precision Topic Tags (#banhve, #doicocgon, etc.)
    + 1-2 Psychology/Pain Point Tags (#tamlycongso, #toxicworkplace)
    + 1 Target Audience / Career Tag (#danit, #senior, #reviewcongty)
    """
    config = SERIES_POSTS_CONFIG.get(slug, {})
    core_themes = config.get("core_themes", [])
    mass_tags = config.get("mass_tags", ["chuyencongso"])
    priority_tags = config.get("priority_tags", [])

    scored_hashtags = []
    for h in HASHTAG_DATABASE:
        score = compute_semantic_score(slug, title, description, body, h, core_themes)
        if score > 0:
            scored_hashtags.append((score, h))

    scored_hashtags.sort(key=lambda x: x[0], reverse=True)

    selected: List[str] = []

    # 1. Brand Anchor: Always '#trochoicongso'
    selected.append("trochoicongso")

    # 2. Configured Mass Reach tags
    for tag_name in mass_tags:
        if tag_name not in selected and len(selected) < max_tags:
            selected.append(tag_name)

    # 3. Post Priority Semantic Tags (e.g. topic tags or target audience)
    for p_tag in priority_tags:
        if p_tag not in selected and len(selected) < max_tags:
            selected.append(p_tag)

    # 4. Top Topic-Specific tags
    for score, h in scored_hashtags:
        if h["category"] == "topic_specific" and h["tag"] not in selected and len(selected) < max_tags:
            selected.append(h["tag"])

    # 5. Top Psychology / Pain Point tags
    for score, h in scored_hashtags:
        if h["category"] in ("psychology", "pain_point") and h["tag"] not in selected and len(selected) < max_tags:
            selected.append(h["tag"])

    # 6. Fill remaining slots with highest scoring relevant tags
    for score, h in scored_hashtags:
        if len(selected) >= max_tags:
            break
        if h["tag"] not in selected:
            selected.append(h["tag"])

    return selected


def update_markdown_frontmatter(md_path: Path, new_tags: List[str], dry_run: bool = False) -> Tuple[bool, List[str]]:
    """Updates tags in markdown frontmatter while preserving all other fields and removing duplicate keys."""
    if not md_path.exists():
        return False, []

    content = md_path.read_text(encoding="utf-8")
    if not content.startswith("---"):
        return False, []

    parts = content.split("---", 2)
    if len(parts) < 3:
        return False, []

    raw_frontmatter = parts[1]
    body = parts[2]

    lines = raw_frontmatter.split("\n")
    new_lines = []
    old_tags = []
    in_tags_block = False
    seen_keys: Set[str] = set()

    tags_formatted = ["tags:"] + [f"  - {t}" for t in new_tags]

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("tags:"):
            in_tags_block = True
            new_lines.extend(tags_formatted)
            continue

        if in_tags_block:
            if stripped.startswith("- "):
                old_tags.append(stripped[2:].strip().strip("'\""))
                continue
            else:
                in_tags_block = False

        # Clean duplicate keys like duplicate 'prePublish:'
        match_key = re.match(r"^([a-zA-Z0-9_]+):", stripped)
        if match_key:
            k = match_key.group(1)
            if k in seen_keys and k != "tags":
                continue
            seen_keys.add(k)

        new_lines.append(line)

    new_frontmatter = "\n".join(new_lines)
    new_full_content = f"---{new_frontmatter}---{body}"

    if not dry_run:
        md_path.write_text(new_full_content, encoding="utf-8")

    return True, old_tags


def update_carousel_json(json_path: Path, new_tags: List[str], dry_run: bool = False) -> bool:
    """Updates meta.tags in companion .carousel.json if it exists."""
    if not json_path.exists():
        return False

    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
        if "meta" in data:
            data["meta"]["tags"] = new_tags
            if not dry_run:
                json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            return True
    except Exception as e:
        print(f"[-] Warning: Failed to update {json_path.name}: {e}")

    return False


def resolve_post_file(slug: str) -> Tuple[Path, Path]:
    """Resolves markdown file and companion carousel json for a given slug."""
    if slug in SERIES_POSTS_CONFIG:
        cfg = SERIES_POSTS_CONFIG[slug]
        return POSTS_DIR / cfg["file"], POSTS_DIR / cfg["carousel"]

    # Try common naming patterns
    for cand in [f"{slug}-vi.md", f"{slug}-vietnamese.md", f"{slug}.md"]:
        p = POSTS_DIR / cand
        if p.exists():
            return p, POSTS_DIR / f"{slug}.carousel.json"

    # Search by postSlug in frontmatter
    for p in POSTS_DIR.glob("*.md"):
        txt = p.read_text(encoding="utf-8")
        if re.search(rf'postSlug:\s*["\']?{re.escape(slug)}["\']?', txt):
            if p.name.endswith("-vi.md") or p.name.endswith("-vietnamese.md") or 'lang: "vi"' in txt:
                return p, POSTS_DIR / f"{slug}.carousel.json"

    return POSTS_DIR / f"{slug}-vi.md", POSTS_DIR / f"{slug}.carousel.json"


def main():
    parser = argparse.ArgumentParser(description="Update trending TikTok hashtags for blog posts.")
    parser.add_argument("--slug", help="Update only a specific post slug (e.g. fake-incentives, seniority)")
    parser.add_argument("--dry-run", action="store_true", help="Print changes without modifying files")
    args = parser.parse_args()

    target_slugs = [args.slug] if args.slug else list(SERIES_POSTS_CONFIG.keys())

    print("======================================================================")
    print(" 🚀 OPTIMIZING TRENDING TIKTOK HASHTAGS FOR BLOG POSTS")
    print(f" Mode: {'DRY RUN (Preview Only)' if args.dry_run else 'ACTIVE (Updating files)'}")
    print("======================================================================\n")

    for slug in target_slugs:
        md_file, json_file = resolve_post_file(slug)
        cfg = SERIES_POSTS_CONFIG.get(slug, {})

        if not md_file.exists():
            print(f"[-] File not found for slug '{slug}': {md_file.name}")
            continue

        content = md_file.read_text(encoding="utf-8")
        title_m = re.search(r"^title:\s*[\"']?(.*?)[\"']?$", content, re.M)
        desc_m = re.search(r"^description:\s*[\"']?(.*?)[\"']?$", content, re.M)
        title = title_m.group(1) if title_m else slug
        desc = desc_m.group(1) if desc_m else ""

        best_tags = select_best_hashtags(slug, title, desc, content, max_tags=cfg.get("max_tags", 7))
        tiktok_caption_tags = " ".join([f"#{t}" for t in best_tags])

        success_md, old_tags = update_markdown_frontmatter(md_file, best_tags, dry_run=args.dry_run)
        updated_json = update_carousel_json(json_file, best_tags, dry_run=args.dry_run)

        print(f"📌 Post: [{slug}] {title}")
        print(f"   File:     {md_file.name}")
        print(f"   Old Tags: {', '.join(old_tags) if old_tags else '(none)'}")
        print(f"   New Tags: {', '.join(best_tags)}")
        print(f"   TikTok Caption: {desc}")
        print(f"   Hashtags ({len(best_tags)}): {tiktok_caption_tags}")
        if json_file.exists():
            print(f"   Carousel JSON: {json_file.name} -> {'Updated' if updated_json else 'Failed'}")
        print("-" * 70)

    print("\n✅ Finished updating trending hashtags.")


if __name__ == "__main__":
    main()
