// utils/sessionTimer.js
import { getStoredAdminAuth, clearAdminAuth } from "./storage";

export function scheduleAutoLogout() {
  const { token } = getStoredAdminAuth();
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiresAtMs = payload.exp * 1000;
    const msUntilExpiry = expiresAtMs - Date.now();

    if (msUntilExpiry <= 0) {
      clearAdminAuth();
      window.location.href = "/";
      return;
    }

    const timeoutId = setTimeout(() => {
      clearAdminAuth();
      window.location.href = "/";
    }, msUntilExpiry);

    return () => clearTimeout(timeoutId); // cleanup fn
  } catch {
    // malformed token — treat as invalid
    clearAdminAuth();
    window.location.href = "/";
  }
}
