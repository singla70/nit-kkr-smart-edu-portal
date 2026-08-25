import { createContext, useContext, useState, useCallback, useEffect } from "react";
import client from "../api/client";
import { isTokenExpired } from "../utils/jwt";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Check expiry right at load, not just on the next failed API call -
    // otherwise reopening the app after the token's already expired still
    // shows a "logged in" dashboard until something happens to hit the
    // backend and fail.
    const token = localStorage.getItem("token");
    if (isTokenExpired(token)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null;
    }
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  // Poll every minute while the app is open, so a session that expires
  // mid-use gets logged out on its own instead of only being caught the
  // next time an API call happens to fail.
  useEffect(() => {
    const interval = setInterval(() => {
      if (localStorage.getItem("token") && isTokenExpired(localStorage.getItem("token"))) {
        logout();
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { data } = await client.post("/auth/login", { email, password });
    const { token, ...userData } = data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const studentSignup = useCallback(async (payload) => {
    const { data } = await client.post("/auth/student/signup", payload);
    const { token, ...userData } = data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, studentSignup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};