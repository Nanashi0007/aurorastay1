// utils/apiClient.js
import { getStoredAdminAuth, clearStoredAdminAuth } from "./storage";

export async function adminFetch(url, options = {}) {
  const { token } = getStoredAdminAuth();

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    clearStoredAdminAuth();
    window.location.href = "/admin/login"; // adjust to your actual login route
    throw new Error("Session expired. Please log in again.");
  }

  return res;
}
