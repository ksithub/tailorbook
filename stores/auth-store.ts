import { create } from "zustand";
import { persist } from "zustand/middleware";

type User = {
  id: string;
  companyId: string;
  email?: string | null;
  fullName?: string | null;
  role: string;
  companyName: string;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (payload: { user: User; accessToken: string; refreshToken: string }) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: ({ user, accessToken, refreshToken }) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("tb_access", accessToken);
          localStorage.setItem("tb_refresh", refreshToken);
        }
        set({ user, accessToken, refreshToken });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("tb_access");
          localStorage.removeItem("tb_refresh");
        }
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    { name: "tailorbook-auth" }
  )
);
