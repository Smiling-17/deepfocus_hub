import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext();
const TOKEN_KEY = "deepfocus-token";
const USER_KEY = "deepfocus-user";

const readStoredUser = () => {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  const token = window.localStorage.getItem(TOKEN_KEY);
  const userRaw = window.localStorage.getItem(USER_KEY);

  try {
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token, user };
  } catch (error) {
    console.error("Không thể đọc thông tin người dùng:", error);
    window.localStorage.removeItem(USER_KEY);
    return { token, user: null };
  }
};

export const AuthProvider = ({ children }) => {
  const [{ token, user }, setAuthState] = useState(readStoredUser);

  useEffect(() => {
    const handleLogoutEvent = () => {
      setAuthState({ token: null, user: null });
    };

    window.addEventListener("deepfocus-logout", handleLogoutEvent);
    return () => {
      window.removeEventListener("deepfocus-logout", handleLogoutEvent);
    };
  }, []);

  const value = useMemo(() => {
    const login = (nextToken, nextUser) => {
      window.localStorage.setItem(TOKEN_KEY, nextToken);
      window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      setAuthState({ token: nextToken, user: nextUser });
    };

    const logout = () => {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
      setAuthState({ token: null, user: null });
    };

    return {
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      logout
    };
  }, [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được sử dụng trong AuthProvider");
  }
  return context;
};
