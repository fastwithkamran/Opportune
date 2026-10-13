"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  onIdTokenChanged,
  signOut,
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  signInWithPopup,
  setPersistence,
  signInWithRedirect,
} from "firebase/auth";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getUserProfile } from "@/lib/firestore";
import type { UserProfile } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  /** True while Firebase auth state or the signed-in user's profile is loading. */
  loading: boolean;
  /** Profile load/refresh error, if any. */
  profileError: Error | null;
  /**
   * Derived from `userProfile.role === 'super_admin'`.
   * To grant access: set `role: "super_admin"` on the user's Firestore doc.
   */
  isSuperAdmin: boolean;
  logout: () => Promise<void>;
  /** Triggers the Google sign-in popup. State is managed by onAuthStateChanged. */
  loginWithGoogle: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// ─── Profile bootstrap ────────────────────────────────────────────────────────

/**
 * Read the profile first and only create the skeleton doc when it is missing.
 *
 * The old flow ran a Firestore transaction on EVERY sign-in/page load. Transactions
 * need a live server connection, so returning users on a weak or offline
 * connection got a profile error even though their profile was cached — and every
 * session paid an extra server round trip. The transaction is kept for creation
 * so two tabs can't both "create" the doc (the second write would be an UPDATE
 * that the rules reject).
 */
async function ensureUserProfile(
  firebaseUser: FirebaseUser,
): Promise<UserProfile | null> {
  const existing = await getUserProfile(firebaseUser.uid);
  if (existing) return existing;

  const userDocRef = doc(db, "users", firebaseUser.uid);
  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userDocRef);
    if (userSnap.exists()) return;
    transaction.set(userDocRef, {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? "",
      displayName:
        firebaseUser.displayName ||
        firebaseUser.email?.split("@")[0] ||
        "New User",
      photoURL: firebaseUser.photoURL ?? null,
      role: null,
      societyId: null,
      universityName: "",
      bio: "",
      contactInfo: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return getUserProfile(firebaseUser.uid);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<Error | null>(null);
  const authStateVersion = useRef(0);

  const userProfileRef = useRef<UserProfile | null>(null);
  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  // UI convenience only — Firestore rules / server routes must enforce admin access themselves.
  const isSuperAdmin = userProfile?.role === "super_admin";

  // ── Auth state listener ──────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    // Enforce long-lived local persistence on mount so popups are not blocked
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn("[AuthContext] Could not enable persistent login:", err);
    });

    // Handle redirect sign-in results; state changes are handled by onIdTokenChanged
    getRedirectResult(auth).catch((err) => {
      if (active) console.error("[AuthContext] Redirect sign-in failed:", err);
    });

    // onIdTokenChanged preserves persistent login across automatic hourly token refreshes
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      const version = ++authStateVersion.current;
      setProfileError(null);

      if (!firebaseUser) {
        if (!active || version !== authStateVersion.current) return;
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      // Re-fetch profile only when user changes, skipping silent token refreshes
      try {
        if (!userProfileRef.current || userProfileRef.current.uid !== firebaseUser.uid) {
          const profile = await ensureUserProfile(firebaseUser);
          if (!active || version !== authStateVersion.current) return;
          setUserProfile(profile);
        }
      } catch (err) {
        if (!active || version !== authStateVersion.current) return;
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to load user profile");
        console.error(
          "[AuthContext] Error during auth state resolution:",
          error,
        );
        if (!userProfileRef.current) {
          setProfileError(error);
        }
      } finally {
        if (active && version === authStateVersion.current) {
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      authStateVersion.current += 1;
      unsubscribe();
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Reads auth.currentUser instead of the `user` state so the callback is
  // stable (and never acts on a stale closure after a quick account switch).
  const refreshUserProfile = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    const uid = current.uid;
    const version = authStateVersion.current;
    setProfileError(null);
    try {
      const profile = await ensureUserProfile(current);
      if (
        auth.currentUser?.uid === uid &&
        version === authStateVersion.current
      ) {
        setUserProfile(profile);
      }
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Failed to refresh the user profile");
      if (
        auth.currentUser?.uid === uid &&
        version === authStateVersion.current
      ) {
        setProfileError(error);
      }
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    // The auth listener owns state updates, including the signed-out transition.
    await signOut(auth);
  }, []);

  /**
   * Triggers the Google sign-in popup only.
   * State updates are handled exclusively by onAuthStateChanged.
   * Closing the popup is a normal user action, not an error to surface.
   */
  const loginWithGoogle = useCallback(async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      // In-app browsers (Instagram/WhatsApp/Facebook) and some mobile Safari
      // setups block popups outright — fall back to a full-page redirect
      // instead of leaving the user with a dead "Sign in" button.
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  }, []);

  // Without memoizing, every provider render handed consumers a new object and
  // re-rendered the whole app.
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      userProfile,
      loading,
      profileError,
      isSuperAdmin,
      logout,
      loginWithGoogle,
      refreshUserProfile,
    }),
    [
      user,
      userProfile,
      loading,
      profileError,
      isSuperAdmin,
      logout,
      loginWithGoogle,
      refreshUserProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
