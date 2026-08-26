import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    // TODO: replace with your real domain once you pick one — this drives
    // the sitemap, RSS feed, and canonical URLs.
    url: "https://astro-paper.pages.dev/",
    title: "Quang Phuong",
    description:
      "Solutions architect writing about cloud architecture, SRE, and DevOps.",
    author: "Quang Phuong",
    profile: "https://linkedin.com/in/quangpx",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "Asia/Ho_Chi_Minh",
    dir: "ltr",
  },
  posts: {
    perPage: 4,
    perIndex: 4,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      // TODO: turn this on once the blog lives in your own GitHub repo, with
      // url pointing at that repo's edit/main/ path.
      enabled: false,
    },
    search: "pagefind",
  },
  socials: [
    { name: "linkedin", url: "https://linkedin.com/in/quangpx" },
    { name: "mail",     url: "mailto:alexquang169@gmail.com" },
  ],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x",        url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "pinterest", url: "https://pinterest.com/pin/create/button/?url=" },
    { name: "mail",     url: "mailto:?subject=See%20this%20post&body=" },
  ],
});