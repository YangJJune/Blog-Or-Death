import { useEffect, useState, useCallback } from "react";
import type { DiscordUser } from "../types/post";

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}${import.meta.env.BASE_URL}`;
const DISCORD_AUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;

const STORAGE_KEY_TOKEN = "discord_access_token";
const STORAGE_KEY_USER = "discord_user";

function parseHashToken(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/access_token=([^&]+)/);
  return match ? match[1] : null;
}

async function fetchDiscordUser(token: string): Promise<DiscordUser | null> {
  try {
    const res = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function getAvatarUrl(user: DiscordUser): string {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
  }
  const index = (BigInt(user.id) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export function useDiscordAuth() {
  const [user, setUser] = useState<DiscordUser | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = parseHashToken();
    if (!token) return;

    // Clean up the URL hash (remove OAuth fragment, keep HashRouter route)
    window.history.replaceState(null, "", window.location.pathname);

    setIsLoading(true);
    fetchDiscordUser(token).then((discordUser) => {
      if (discordUser) {
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(discordUser));
        setUser(discordUser);
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(() => {
    window.location.href = DISCORD_AUTH_URL;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    setUser(null);
  }, []);

  return { user, isLoading, login, logout };
}
