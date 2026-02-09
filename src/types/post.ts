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

export type ViewMode = "grid" | "feed";

export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}
