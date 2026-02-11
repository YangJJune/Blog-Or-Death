import type { Comment } from "../types/post";
import { getAuthHeaders, authFetch } from "../utils/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function toggleLike(postId: number): Promise<Record<string, unknown> | null> {
  try {
    const res = await authFetch(`${BASE_URL}/api/posts/${postId}/likes`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function checkIsLiked(postId: number): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/posts/${postId}/likes/me`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.liked ?? false;
  } catch {
    return false;
  }
}

export async function fetchComments(postId: number): Promise<Comment[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/posts/${postId}/comments`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function addComment(postId: number, content: string): Promise<Comment | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
