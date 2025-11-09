export interface Post {
  id: number;
  title: string;
  content: string;
  thumbnail: string | null;
  author: string;
  author_avatar: string;
  url: string;
  createdAt: string;
  likes?: number;
  comments?: number;
}

export type TabType = "trending" | "curated" | "recent" | "feed";

export type ThemeMode = "light" | "dark";
