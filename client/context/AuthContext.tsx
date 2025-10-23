import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebase, subscribeAuth } from "@/lib/firebase";

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signup: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  isConfigured: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fb = getFirebase();

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function ensureConfigured() {
    if (!fb)
      throw new Error(
        "Firebase غير مضبوط. الرجاء إضافة مفاتيح VITE_FIREBASE_* في الإعدادات.",
      );
    return fb;
  }

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      error,
      isConfigured: !!fb,
      async signup(email, password, displayName) {
        setError(null);
        const { auth } = await ensureConfigured();
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        if (displayName) await updateProfile(cred.user, { displayName });
        await sendEmailVerification(cred.user);
        setUser(cred.user);
      },
      async login(email, password) {
        setError(null);
        const { auth } = await ensureConfigured();
        const cred = await signInWithEmailAndPassword(auth, email, password);
        setUser(cred.user);
      },
      async logout() {
        setError(null);
        const { auth } = await ensureConfigured();
        await signOut(auth);
        setUser(null);
      },
      async sendVerification() {
        setError(null);
        const { auth } = await ensureConfigured();
        const u = auth.currentUser;
        if (!u) throw new Error("لا يوجد مستخدم مسجل دخول.");
        await sendEmailVerification(u);
      },
      async resetPassword(email) {
        setError(null);
        const { auth } = await ensureConfigured();
        await sendPasswordResetEmail(auth, email);
      },
      async deleteAccount() {
        setError(null);
        const { auth } = await ensureConfigured();
        const u = auth.currentUser;
        if (!u) throw new Error("لا يوجد مستخدم مسجل دخول.");
        await deleteUser(u);
        setUser(null);
      },
    }),
    [user, loading, error, fb],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
