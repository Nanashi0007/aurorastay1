import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearAuth, getStoredAuth, persistAuth } from "../../utils/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());

  useEffect(() => {
    const syncAuth = () => setAuth(getStoredAuth());

    window.addEventListener("storage", syncAuth);
    window.addEventListener("aurora-auth-change", syncAuth);
    window.addEventListener("aurora-session-expired", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("aurora-auth-change", syncAuth);
      window.removeEventListener("aurora-session-expired", syncAuth);
    };
  }, []);

  const login = (user, token) => {
    persistAuth(token, user);
    setAuth({ token, user });
  };

  const logout = () => {
    clearAuth();
    setAuth({ token: "", user: null });
  };

  const value = useMemo(
    () => ({
      user: auth.user,
      token: auth.token,
      isAuthenticated: Boolean(auth.token && auth.user),
      isAdmin: auth.user?.role === "admin",
      login,
      logout,
    }),
    [auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
