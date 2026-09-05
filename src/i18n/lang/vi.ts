import type { UIStrings } from "../types";

export default {
  nav: {
    home: "Trang chủ",
    posts: "Bài viết",
    tags: "Thẻ",
    about: "Giới thiệu",
    archives: "Lưu trữ",
    search: "Tìm kiếm",
  },
  post: {
    publishedAt: "Đăng lúc",
    updatedAt: "Cập nhật lúc",
    sharePostIntro: "Chia sẻ bài viết này:",
    sharePostOn: "Chia sẻ bài viết này trên {{platform}}",
    sharePostViaEmail: "Chia sẻ bài viết này qua email",
    tagLabel: "Thẻ",
    backToTop: "Về đầu trang",
    goBack: "Quay lại",
    editPage: "Chỉnh sửa trang",
    previousPost: "Bài trước",
    nextPost: "Bài sau",
  },
  pagination: {
    prev: "Trước",
    next: "Sau",
    page: "Trang",
  },
  home: {
    socialLinks: "Liên kết mạng xã hội",
    featured: "Nổi bật",
    recentPosts: "Bài viết mới nhất",
    allPosts: "Tất cả bài viết",
  },
  footer: {
    copyright: "Bản quyền",
    allRightsReserved: "Đã đăng ký bản quyền.",
    distributedBy: "Phân phối bởi",
    themeWagon: "ThemeWagon",
    themeWagonUrl: "https://themewagon.com",
  },
  pages: {
    tagTitle: "Thẻ",
    tagDesc: "Tất cả bài viết có gắn thẻ",

    tagsTitle: "Thẻ",
    tagsDesc: "Tất cả các thẻ được sử dụng trong bài viết.",

    postsTitle: "Bài viết",
    postsDesc: "Tất cả bài viết đã xuất bản.",

    archivesTitle: "Lưu trữ",
    archivesDesc: "Tất cả bài viết trong kho lưu trữ.",

    searchTitle: "Tìm kiếm",
    searchDesc: "Tìm kiếm bài viết ...",
  },
  a11y: {
    skipToContent: "Chuyển đến nội dung chính",
    openMenu: "Mở menu",
    closeMenu: "Đóng menu",
    toggleTheme: "Chuyển giao diện sáng/tối",
    themeSystem: "Giao diện: Tự động (hệ thống)",
    themeLight: "Giao diện: Sáng",
    themeDark: "Giao diện: Tối",
    searchPlaceholder: "Tìm kiếm bài viết...",
    noResults: "Không tìm thấy kết quả",
    goToPreviousPage: "Đến trang trước",
    goToNextPage: "Đến trang sau",
  },
  notFound: {
    title: "404 Không tìm thấy",
    message: "Trang không tồn tại",
    goHome: "Trở về trang chủ",
  },
} satisfies UIStrings;
