const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}${import.meta.env.BASE_URL}`;
const DISCORD_AUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("discord_access_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function redirectToLogin() {
  localStorage.removeItem("discord_access_token");
  localStorage.removeItem("discord_user");
  window.location.href = DISCORD_AUTH_URL;
}

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    redirectToLogin();
  }
  return res;
}
