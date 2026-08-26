import type { RehypePlugin } from "@astrojs/markdown-remark";
import { visit } from "unist-util-visit";

/**
 * Rehype plugin to automatically add target="_blank" and rel="noopener noreferrer"
 * to all external links in markdown content
 */
export const rehypeExternalLinks: RehypePlugin = () => {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (node.tagName === "a") {
        const href = node.properties?.href as string | undefined;

        // Check if link is external
        if (href && isExternalLink(href)) {
          // Add target="_blank"
          node.properties = node.properties || {};
          node.properties.target = "_blank";

          // Add or append to rel attribute
          const currentRel = node.properties.rel;
          let relArray: string[] = [];
          if (Array.isArray(currentRel)) {
            relArray = currentRel.map(String);
          } else if (typeof currentRel === "string") {
            relArray = (currentRel as string).split(" ");
          }

          const newRel = ["noopener", "noreferrer"];
          const combinedRel = Array.from(
            new Set([...relArray, ...newRel])
          );

          node.properties.rel = combinedRel;
        }
      }
    });
  };
};

/**
 * Check if a link is external
 * Returns true for http/https URLs pointing to different domains
 * Returns false for relative links, hash links, and mailto/tel links
 */
function isExternalLink(href: string): boolean {
  // Don't treat these as external
  if (!href || href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  // Check if it's an http/https link
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return true;
  }

  return false;
}
