const TOKEN_KEY = "token";
const USER_KEY = "user";

export function safeJsonParse(value, fallback = null) {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getStoredAuth() {
  if (typeof window === "undefined") {
    return { token: "", user: null };
  }

  return {
    token: localStorage.getItem(TOKEN_KEY) || "",
    user: safeJsonParse(localStorage.getItem(USER_KEY), null),
  };
}

export function persistAuth(token, user) {
  if (typeof window === "undefined") return;

  if (!token) {
    clearAuth();
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user ?? {}));
  window.dispatchEvent(new Event("aurora-auth-change"));
}

export function clearAuth() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("aurora-auth-change"));
}
