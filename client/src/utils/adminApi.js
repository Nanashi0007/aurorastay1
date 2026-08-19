import { getStoredAdminAuth } from "./storage";

export async function adminFetch(endpoint, options = {}) {
  const { token } = getStoredAdminAuth();

  const res = await fetch(endpoint, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
