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

// utils/storage.js — add admin-specific keys, keep the public ones untouched
const ADMIN_TOKEN_KEY = "admin_token";
const ADMIN_USER_KEY = "admin_user";

export function persistAdminAuth(token, user) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user ?? {}));
}

export function getStoredAdminAuth() {
  if (typeof window === "undefined") return { token: "", user: null };
  return {
    token: localStorage.getItem(ADMIN_TOKEN_KEY) || "",
    user: safeJsonParse(localStorage.getItem(ADMIN_USER_KEY), null),
  };
}

export function clearAdminAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}
