# DevOps Post Illustrations

## Goal

Add two abstract editorial illustrations to the English `About DevOps` post and reuse the same image files in the Vietnamese translation. Each image should explain a specific idea in the article, without using a real company or person as its subject.

## Assets

Create two landscape raster images in `src/assets/images/`:

1. `devops-premium-automation.png` — a luminous bottle of good wine in a sparse, dark gallery-like space. Its engraved, readable label says: `Powered by a trillion-dollar AI company`. A restrained, looping ribbon of amber liquid or light suggests the feedback-loop concept. The image satirizes fashionable packaging around automation rather than celebrating a brand.
2. `devops-post-scarcity-money.png` — a faceless wealthy silhouette beside currency that dissolves into the background, while anonymous robotic hands transform raw material into abundant essentials. The image treats a world where money loses relevance as a speculative, unsettled proposition—not a promise or an endorsement of a real person.

Both illustrations use the same dark painterly-abstract visual language, muted charcoal and indigo with warm amber and gold accents. Avoid logos, real-person likenesses, additional legible text, watermarks, interface graphics, and literal corporate imagery.

## Placement

Use identical Markdown image references in both language versions:

| Asset | English placement | Vietnamese placement |
| --- | --- | --- |
| Premium automation | Immediately after the paragraph that ends with `Powered by <insert trillion-dollar AI company here>` | Immediately after the matching `Powered by <tên công ty AI nghìn tỷ nào đó>` paragraph |
| Post-scarcity money | Immediately after the paragraph asking whether the reader believes the 2036 prediction | Immediately after the matching paragraph ending `Liệu rằng bạn có tin không?` |

Each alt text explains the concept in the reader's language. Markdown image links resolve from the post files to the shared images in `src/assets/images/`.

## Validation

Verify that the generated engraving is readable and exact enough to communicate the intended phrase, that the two assets share a visual family, that both posts reference the same two files, and that `npm run build` completes successfully.
