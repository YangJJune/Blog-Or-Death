import { useState, useCallback } from "react";
import type { BlogPlatform, MemberResponse } from "../types/post";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const BLOG_PLATFORM_PATTERNS: {
  platform: BlogPlatform;
  regex: RegExp;
  label: string;
}[] = [
  {
    platform: "velog",
    regex: /^https?:\/\/velog\.io\/@[\w.-]+\/?/,
    label: "Velog",
  },
  {
    platform: "medium",
    regex: /^https?:\/\/(www\.)?medium\.com\/@?[\w.-]+\/?/,
    label: "Medium",
  },
  {
    platform: "devto",
    regex: /^https?:\/\/(www\.)?dev\.to\/[\w.-]+\/?/,
    label: "DEV.to",
  },
  {
    platform: "tistory",
    regex: /^https?:\/\/[\w.-]+\.tistory\.com\/?/,
    label: "Tistory",
  },
  {
    platform: "github_pages",
    regex: /^https?:\/\/[\w.-]+\.github\.io(\/[\w.-]+)?\/?/,
    label: "GitHub Pages",
  },
];

export function detectPlatform(
  url: string
): { platform: BlogPlatform; label: string } | null {
  for (const pattern of BLOG_PLATFORM_PATTERNS) {
    if (pattern.regex.test(url)) {
      return { platform: pattern.platform, label: pattern.label };
    }
  }
  return null;
}

export async function fetchMember(
  discordId: string
): Promise<MemberResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/members/${discordId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveMember(
  discordId: string,
  blogUrl: string
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId, blogUrl }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function useBlogUrl(discordId: string | undefined) {
  const [blogUrl, setBlogUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!discordId) return;
    setIsLoading(true);
    const member = await fetchMember(discordId);
    if (member) setBlogUrl(member.blogUrl);
    setIsLoading(false);
  }, [discordId]);

  const save = useCallback(
    async (url: string) => {
      if (!discordId) return false;
      const ok = await saveMember(discordId, url);
      if (ok) setBlogUrl(url);
      return ok;
    },
    [discordId]
  );

  return { blogUrl, isLoading, load, save };
}
