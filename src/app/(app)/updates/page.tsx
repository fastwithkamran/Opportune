"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "@/lib/firestore";
import { timeAgo } from "@/lib/postHelpers";
import type { Notification } from "@/types";
import {
  FiBell,
  FiBellOff,
  FiFileText,
  FiLock,
  FiGlobe,
  FiChevronDown,
  FiChevronUp,
  FiSmartphone,
  FiUsers,
} from "react-icons/fi";
import {
  HiOutlineSparkles,
  HiOutlineLightBulb,
  HiOutlineUserGroup,
  HiOutlineBuildingLibrary,
} from "react-icons/hi2";
import { FaWhatsapp } from "react-icons/fa6";
import Image from "next/image";

const NOTIFICATION_LIMIT = 30;
const TIME_REFRESH_MS = 60_000;

/** Firestore can hand back null (pending serverTimestamp) or an invalid Date.
 *  Calling toISOString() on those throws and would crash the whole page. */
function getValidDate(value: unknown): Date | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
}

// ─── About Opportune Card ──────────────────────────────────────────────────────

function AboutOpportuneCard() {
  return (
    <section
      aria-label="About Opportune"
      style={{
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border-primary)",
        background: "var(--bg-card)",
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          padding: "18px 20px",
          borderLeft: "3px solid var(--border-secondary)",
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>
            Why Opportune?
          </strong>{" "}
          Sifting through 40 unread WhatsApp groups, getting lost in endless
          Instagram scrolls, or digging through buried university emails and
          LinkedIn feeds is exhausting. Students miss deadlines that could
          change their careers. At the same time, student communities, clubs and
          companies struggle to reach the right student talent, losing their
          announcements to algorithmic noise and chat spam. Opportune fixes
          this: one verified feed, zero noise, zero missed opportunities.
        </p>
      </div>
    </section>
  );
}

// ─── Install App Card ──────────────────────────────────────────────────────────

// ─── Quick Channels & Preferences Card ────────────────────────────────────────

/** WhatsApp channel link — update WHATSAPP_CHANNEL_URL with your real channel. */
const WHATSAPP_CHANNEL_URL =
  "https://whatsapp.com/channel/0029VbEoEDQC6ZvbEuBdbC2o";

type PushPermission = "default" | "granted" | "denied" | "unsupported";

function QuickChannelsCard() {
  const [pushPerm, setPushPerm] = useState<PushPermission>("default");

  // Read the real browser Notification.permission on mount
  useEffect(() => {
    queueMicrotask(() => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        setPushPerm("unsupported");
        return;
      }
      setPushPerm(Notification.permission as PushPermission);
    });
  }, []);

  const handleEnablePush = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    const result = await Notification.requestPermission();
    setPushPerm(result as PushPermission);
    if (result === "granted") {
      toast.success("Push alerts enabled! We'll notify you of new posts.");
    } else if (result === "denied") {
      toast.error(
        "Browser blocked notifications. Enable them in your browser settings.",
        { duration: 5000 },
      );
    }
  };

  // Derive push button label + state
  const pushGranted = pushPerm === "granted";
  const pushDenied = pushPerm === "denied";
  const pushUnsupported = pushPerm === "unsupported";

  return (
    <section
      aria-label="Quick Channels and Preferences"
      style={{
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border-primary)",
        background: "var(--bg-card)",
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      {/* Section header */}
      <div
        style={{
          padding: "14px 20px 10px",
          borderBottom: "1px solid var(--border-secondary)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          Quick Channels &amp; Preferences
        </h2>
      </div>

      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          padding: 16,
        }}
      >
        {/* WhatsApp Channel */}
        <div
          style={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-primary)",
            background: "var(--bg-input)",
            padding: "14px 16px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          {/* WA icon */}
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: "1px solid var(--border-primary)",
              background: "var(--bg-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FaWhatsapp style={{ width: 22, height: 22, color: "#25d366" }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 3,
              }}
            >
              Join WhatsApp Hub
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                margin: "0 0 10px",
                lineHeight: 1.5,
              }}
            >
              Daily campus opportunity alerts sent straight to WhatsApp.
            </p>
            <a
              href={WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-primary)",
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 8,
                textDecoration: "none",
                transition: "opacity .15s",
              }}
            >
              <FaWhatsapp style={{ width: 12, height: 12, color: "#25d366" }} />
              Join Channel
            </a>
          </div>
        </div>

        {/* Push Notifications */}
        <div
          style={{
            borderRadius: "var(--radius-lg)",
            border: pushGranted
              ? "1px solid rgba(16,185,129,0.35)"
              : "1px solid var(--border-primary)",
            background: pushGranted
              ? "rgba(16,185,129,0.04)"
              : "var(--bg-input)",
            padding: "14px 16px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          {/* Bell icon */}
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: pushGranted
                ? "1px solid rgba(16,185,129,0.3)"
                : "1px solid var(--border-primary)",
              background: "var(--bg-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {pushGranted ? (
              <FiBell
                style={{
                  width: 20,
                  height: 20,
                  color: "var(--primary-400)",
                }}
              />
            ) : (
              <FiBellOff
                style={{ width: 20, height: 20, color: "var(--text-tertiary)" }}
              />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 3,
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              Push Alerts
              {pushGranted && (
                <span
                  style={{
                    background: "rgba(16,185,129,0.15)",
                    color: "var(--primary-400)",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 999,
                  }}
                >
                  ✓ ON
                </span>
              )}
              {pushDenied && (
                <span
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    color: "#ef4444",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 999,
                  }}
                >
                  BLOCKED
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                margin: "0 0 10px",
                lineHeight: 1.5,
              }}
            >
              {pushGranted
                ? "You'll get instant alerts when pages post new opportunities."
                : pushDenied
                  ? "Notifications are blocked. Allow them in your browser site settings."
                  : pushUnsupported
                    ? "Your browser doesn't support push notifications."
                    : "Get instant alerts when pages you follow post something new."}
            </p>

            {!pushGranted && !pushDenied && !pushUnsupported && (
              <button
                type="button"
                onClick={() => void handleEnablePush()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "opacity .15s",
                }}
              >
                <FiBell style={{ width: 11, height: 11 }} />
                Enable Alerts
              </button>
            )}
            {pushDenied && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
              >
                Re-enable in browser → Site Settings → Notifications
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Install App Card ──────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function InstallAppCard() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  // Capture the beforeinstallprompt event so we can trigger it on button click
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Track if already installed as standalone PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      queueMicrotask(() => setInstalled(true));
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (installed) {
      toast("Opportune is already installed on your device!", { icon: "✅" });
      return;
    }
    if (installPrompt) {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result?.outcome === "accepted") {
        setInstalled(true);
        setInstallPrompt(null);
        toast.success("Opportune installed successfully!");
      }
      return;
    }

    // Browser guidance when beforeinstallprompt event is unavailable (e.g. iOS Safari)
    const isIOS =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      toast(
        "To install on iPhone/iPad: Tap the Share button (⎋) in Safari, then select 'Add to Home Screen' (+)",
        { duration: 6000, icon: "📲" },
      );
    } else {
      toast(
        "To install: Open your browser menu (⋮) and tap 'Install Opportune' or 'Add to Home Screen'",
        { duration: 6000, icon: "📲" },
      );
    }
  };

  return (
    <section
      aria-label="Install Opportune App"
      style={{
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border-primary)",
        background: "var(--bg-card)",
        padding: "16px 20px",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      {/* Icon */}
      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          border: "1px solid var(--border-primary)",
          background: "var(--bg-input)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <FiSmartphone
          style={{ width: 20, height: 20, color: "var(--text-secondary)" }}
        />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 3,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Install Opportune
          </h2>
          {installed && (
            <span
              style={{
                background: "rgba(16,185,129,0.12)",
                color: "var(--primary-400)",
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid rgba(16,185,129,0.2)",
              }}
            >
              INSTALLED
            </span>
          )}
        </div>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--text-tertiary)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {installed
            ? "Opportune is installed on your device. Launch it anytime from your home screen!"
            : "Install Opportune on your phone or desktop. Launch it anytime from your home screen!"}
        </p>
      </div>

      {/* Action button */}
      {installed ? (
        <span
          style={{
            background: "rgba(16,185,129,0.12)",
            color: "var(--primary-400)",
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(16,185,129,0.25)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          ✓ Installed
        </span>
      ) : (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => void handleInstall()}
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 0 16px rgba(99,102,241,0.25)",
          }}
        >
          <FiSmartphone style={{ width: 13, height: 13 }} />
          Install App
        </button>
      )}
    </section>
  );
}

// ─── Notification Row ──────────────────────────────────────────────────────────

function NotificationRow({
  notification,
  isMarkingRead,
  onMarkRead,
}: {
  notification: Notification;
  isMarkingRead: boolean;
  onMarkRead: (id: string) => void;
}) {
  const createdAt = getValidDate(notification.createdAt);
  const statusLabel = notification.isRead ? "Read" : "Unread";

  return (
    <article
      className="flex items-start gap-3 py-4"
      style={{ borderBottom: "1px solid var(--border-secondary)" }}
    >
      <span
        role="img"
        aria-label={statusLabel}
        title={statusLabel}
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{
          background: notification.isRead
            ? "var(--text-muted)"
            : "var(--primary-500)",
          boxShadow: notification.isRead
            ? "none"
            : "0 0 6px var(--primary-500)",
        }}
      />
      <span
        aria-hidden="true"
        className="w-5 shrink-0 flex items-center justify-center text-[var(--primary-400)] mt-0.5"
      >
        <FiFileText style={{ width: 16, height: 16 }} />
      </span>

      <div className="min-w-0 flex-1">
        <h2
          className="mb-1 text-[13px] text-[var(--text-primary)]"
          style={{
            fontWeight: notification.isRead ? 400 : 600,
            fontFamily: "var(--font-body)",
            letterSpacing: "normal",
          }}
        >
          {notification.title}
        </h2>
        {/* Read items are dimmed via colour, not opacity, so text keeps readable contrast */}
        <p
          className={`m-0 break-words text-[13px] leading-relaxed ${
            notification.isRead
              ? "text-[var(--text-tertiary)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          {notification.message}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-[var(--text-muted)]">
          {createdAt ? (
            <time dateTime={createdAt.toISOString()}>{timeAgo(createdAt)}</time>
          ) : (
            <span>Just now</span>
          )}
          {notification.relatedPostId && (
            <Link
              href="/feed"
              className="font-medium text-[var(--primary-400)] hover:underline"
              onClick={() => {
                if (!notification.isRead) onMarkRead(notification.id);
              }}
            >
              Open Global Feed
            </Link>
          )}
          {!notification.isRead && (
            <button
              type="button"
              onClick={() => onMarkRead(notification.id)}
              disabled={isMarkingRead}
              className="font-medium text-[var(--primary-400)] hover:underline disabled:cursor-wait disabled:opacity-60"
              aria-label={`Mark "${notification.title}" as read`}
            >
              {isMarkingRead ? "Marking read…" : "Mark as read"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function NotificationSkeleton() {
  return (
    <div role="status" className="px-4 sm:px-5">
      <span className="sr-only">Loading notifications…</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="flex items-start gap-3 py-4"
          style={{ borderBottom: "1px solid var(--border-secondary)" }}
        >
          <div className="skeleton mt-1.5 h-2 w-2 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <div className="skeleton mb-2 h-3.5 w-2/5" />
            <div className="skeleton mb-2 h-3 w-4/5" />
            <div className="skeleton h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Updates & Community Hub page: combines the About Opportune guide, WhatsApp & Push
 * preferences, PWA install prompt, and user activity alerts from followed societies.
 */
export default function UpdatesPage() {
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const uid = user?.uid ?? null;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [subscriptionState, setSubscriptionState] = useState<{
    key: string;
    status: "ready" | "error";
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingReadIds, setMarkingReadIds] = useState<Set<string>>(
    () => new Set(),
  );
  // Synchronous guard: state updates are async, so rapid double-clicks (or the
  // "Open Global Feed" link + button) could otherwise fire duplicate writes.
  const inFlightRef = useRef<Set<string>>(new Set());
  const [, setTick] = useState(0);
  // Tab switcher: "hub" (Community Hub) is shown by default; "activity" shows notifications.
  const [activeTab, setActiveTab] = useState<"hub" | "activity">("hub");

  // Auto-switch to Activity tab when user arrives via a direct ?tab=activity link
  // (e.g. tapping the unread badge notification link in the future).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "activity") {
      queueMicrotask(() => setActiveTab("activity"));
    }
  }, []);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    const key = `${uid}:${retryCount}`;

    const unsubscribe = subscribeToNotifications(
      uid,
      (data) => {
        if (!active) return;
        setNotifications(data);
        setSubscriptionState({ key, status: "ready" });
      },
      (error) => {
        if (!active) return;
        console.error("[UpdatesPage] Subscription failed:", error);
        setSubscriptionState({ key, status: "error" });
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid, retryCount]);

  // Keep "5 minutes ago" labels fresh.
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), TIME_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const subscriptionKey = uid ? `${uid}:${retryCount}` : null;
  const subscriptionStatus =
    subscriptionKey && subscriptionState?.key === subscriptionKey
      ? subscriptionState.status
      : null;

  const signedOut = !authLoading && !uid;
  const loading = authLoading || Boolean(uid && subscriptionStatus === null);
  const listenerError = subscriptionStatus === "error";

  // Never show another account's data: after logout / account switch the state
  // still holds the previous user's list until a new snapshot arrives.
  const visibleNotifications =
    subscriptionStatus === "ready" ? notifications : [];

  const unreadCount = visibleNotifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: string) => {
    if (inFlightRef.current.has(id)) return;
    inFlightRef.current.add(id);
    setMarkingReadIds((current) => new Set(current).add(id));
    try {
      await markNotificationRead(id);
    } catch (error) {
      console.error("[UpdatesPage] markNotificationRead failed:", error);
      toast.error("Failed to mark notification as read", {
        id: `mark-read-${id}`,
      });
    } finally {
      inFlightRef.current.delete(id);
      setMarkingReadIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const handleMarkAll = async () => {
    if (!uid || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(uid);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("[UpdatesPage] markAllNotificationsRead failed:", error);
      toast.error("Failed to update notifications");
    } finally {
      setMarkingAll(false);
    }
  };

  const retrySubscription = () => setRetryCount((count) => count + 1);

  const statusText = signedOut
    ? "Sign in to view your updates."
    : loading
      ? "Loading updates…"
      : listenerError
        ? "Updates could not be loaded."
        : unreadCount > 0
          ? `${unreadCount} unread in your latest ${NOTIFICATION_LIMIT} updates`
          : `No unread in your latest ${NOTIFICATION_LIMIT} updates`;

  let notifBody: ReactNode;
  if (signedOut) {
    notifBody = (
      <div className="p-10 text-center sm:p-14">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-input)] flex items-center justify-center text-[var(--text-tertiary)]">
            <FiLock className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mb-1 text-[15px] font-semibold text-[var(--text-secondary)]">
          You&apos;re signed out
        </h2>
        <p className="mx-auto mb-4 max-w-md text-[13px] text-[var(--text-tertiary)]">
          Sign in to see updates from the pages you follow.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm inline-flex"
          onClick={() => loginWithGoogle().catch(() => {})}
        >
          Sign in
        </button>
      </div>
    );
  } else if (loading) {
    notifBody = <NotificationSkeleton />;
  } else if (listenerError) {
    notifBody = (
      <div role="alert" className="p-10 text-center">
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          We couldn&apos;t load your updates. Please try again.
        </p>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={retrySubscription}
        >
          Try again
        </button>
      </div>
    );
  } else if (visibleNotifications.length === 0) {
    notifBody = (
      <div className="p-10 text-center sm:p-14">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-input)] flex items-center justify-center text-[var(--text-tertiary)]">
            <FiBell className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mb-1 text-[15px] font-semibold text-[var(--text-secondary)]">
          No updates yet
        </h2>
        <p className="mx-auto mb-4 max-w-md text-[13px] text-[var(--text-tertiary)]">
          Follow pages in the Global Feed to hear when they share a new post.
        </p>
        <Link
          href="/feed"
          className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
        >
          <FiGlobe className="w-3.5 h-3.5" /> Go to Global Feed
        </Link>
      </div>
    );
  } else {
    notifBody = (
      <div className="px-4 sm:px-5">
        {visibleNotifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            isMarkingRead={markingReadIds.has(notification.id)}
            onMarkRead={(id) => void handleMarkRead(id)}
          />
        ))}
      </div>
    );
  }

  return (
    <main
      style={{ padding: "var(--page-padding-y) var(--page-padding-x)" }}
      aria-labelledby="updates-heading"
    >
      {/* ── Page Header ── */}
      <header className="mb-5">
        <h1
          id="updates-heading"
          className="mb-1 flex items-center gap-2"
          style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 800, lineHeight: 1.15 }}
        >
          <FiBell style={{ width: 18, height: 18, color: "var(--primary-400)", flexShrink: 0 }} />
          <span>
            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Stay ahead. </span>
            <span
              style={{
                background: "var(--gradient-text, var(--gradient-primary))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontWeight: 700,
              }}
            >
              Never miss a beat!
            </span>
          </span>
        </h1>
      </header>

      {/* ── Tab Switcher Pill ── */}
      <div
        role="tablist"
        aria-label="Updates sections"
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 20,
          background: "var(--bg-input)",
          borderRadius: "var(--radius-lg)",
          padding: 4,
        }}
      >
        {(["hub", "activity"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === "hub" ? "Community Hub" : "Activity";
          const badge = tab === "activity" && unreadCount > 0 ? unreadCount : 0;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "7px 12px",
                borderRadius: "var(--radius-md)",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#fff" : "var(--text-secondary)",
                background: isActive
                  ? "var(--gradient-primary)"
                  : "transparent",
                transition: "all .15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: isActive
                  ? "0 2px 8px rgba(16,185,129,0.25)"
                  : "none",
              }}
            >
              {tab === "hub" ? (
                <FiUsers style={{ width: 14, height: 14 }} />
              ) : (
                <FiBell style={{ width: 13, height: 13 }} />
              )}
              {label}
              {badge > 0 && (
                <span
                  style={{
                    background: isActive ? "rgba(255,255,255,0.25)" : "#ef4444",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 5px",
                  }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Community Hub Tab ── */}
      {activeTab === "hub" && (
        <section aria-label="Community Hub">
          <AboutOpportuneCard />
          <QuickChannelsCard />
          <InstallAppCard />
        </section>
      )}

      {/* ── Activity Tab ── */}
      {activeTab === "activity" && (
        <section aria-labelledby="activity-heading">
          <div
            className="flex items-center justify-between gap-4 mb-3"
            style={{ flexWrap: "wrap" }}
          >
            <div>
              <h2
                id="activity-heading"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 15,
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--text-primary)",
                }}
              >
                Activity
              </h2>
              <p
                className="m-0 text-[12px] text-[var(--text-tertiary)]"
                aria-live="polite"
              >
                {statusText}
              </p>
            </div>
            {!loading && !listenerError && !signedOut && unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-outline btn-sm shrink-0"
                onClick={handleMarkAll}
                disabled={markingAll}
                title="Marks all of your notifications as read, including ones older than the 30 shown here"
              >
                {markingAll ? "Updating…" : "Mark all read"}
              </button>
            )}
          </div>

          <div
            aria-label="Activity updates"
            aria-busy={loading}
            className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--bg-card)]"
          >
            {notifBody}
          </div>
        </section>
      )}
    </main>
  );
}
