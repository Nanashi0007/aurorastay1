import { clearAuth, getStoredAuth } from "./storage";

function parseJsonSafe(response) {
  return response.text().then((text) => {
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  });
}

export async function apiRequest(url, options = {}) {
  const { token } = getStoredAuth();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const payload = await parseJsonSafe(response);

  if (response.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aurora-session-expired", { detail: payload }));
    }
    return {
      ok: false,
      status: 401,
      data: payload,
      response,
    };
  }

  return {
    ok: response.ok,
    status: response.status,
    data: payload,
    response,
  };
}

export async function authFetch(url, options = {}) {
  const { token } = getStoredAuth();

  if (!token) {
    return {
      ok: false,
      status: 401,
      data: { message: "Not authenticated." },
      response: null,
    };
  }

  return apiRequest(url, options);
}
