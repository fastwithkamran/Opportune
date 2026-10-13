"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToTeammates,
  upsertTeammateListing,
  deleteTeammateListing,
  getTeammateListing,
} from "@/lib/firestore";
import { normalizeHttpUrl } from "@/lib/url";
import type { TeammateListing } from "@/types";
import {
  FiUsers,
  FiSearch,
  FiX,
  FiExternalLink,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { sanitizeImageUrl } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysLeft(expiresAt: Date): number {
  return Math.max(
    0,
    Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
}

// ─── Post Listing Modal ────────────────────────────────────────────────────────

interface ListingFormValues {
  name: string;
  university: string;
  bio: string;
  contactInfo: string;
  hackathonName: string;
  hackathonLink: string;
}

interface PostListingModalProps {
  initial: ListingFormValues;
  onClose: () => void;
  onSave: (values: ListingFormValues) => Promise<void>;
  saving: boolean;
}

function PostListingModal({
  initial,
  onClose,
  onSave,
  saving,
}: PostListingModalProps) {
  const [form, setForm] = useState<ListingFormValues>(initial);
  const [errors, setErrors] = useState<Partial<ListingFormValues>>({});

  const set = (k: keyof ListingFormValues) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: Partial<ListingFormValues> = {};
    if (!form.name.trim()) e.name = "Required.";
    if (!form.hackathonName.trim()) e.hackathonName = "Required.";
    if (!form.contactInfo.trim())
      e.contactInfo = "Required — how others reach you.";
    if (!form.hackathonLink.trim()) {
      e.hackathonLink = "Required.";
    } else if (!normalizeHttpUrl(form.hackathonLink)) {
      e.hackathonLink = "Enter a valid https:// link.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave({
      ...form,
      hackathonLink: normalizeHttpUrl(form.hackathonLink) ?? form.hackathonLink,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Post teammate listing"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--radius-xl)",
          width: "100%",
          maxWidth: 580,
          maxHeight: "90dvh",
          overflowY: "auto",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: "0 20px 40px -15px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--text-primary)",
              }}
            >
              Post Teammate Listing
            </span>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 12,
                color: "var(--text-tertiary)",
              }}
            >
              Share what hackathon you&apos;re entering and what skills you
              bring.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-primary)",
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FiX style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {/* Row 1: Name & University */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="input-group">
              <label className="input-label">Name *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="Your display name"
              />
              {errors.name && (
                <span style={{ color: "#ef4444", fontSize: 11 }}>
                  {errors.name}
                </span>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">University / Affiliation</label>
              <input
                className="input"
                value={form.university}
                onChange={(e) => set("university")(e.target.value)}
                placeholder="e.g. NUST, FAST, IBA"
              />
            </div>
          </div>

          {/* Row 2: Hackathon Name & Registration link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="input-group">
              <label className="input-label">Target Hackathon *</label>
              <input
                className="input"
                value={form.hackathonName}
                onChange={(e) => set("hackathonName")(e.target.value)}
                placeholder="e.g. NaSCon '26 Hackathon"
              />
              {errors.hackathonName && (
                <span style={{ color: "#ef4444", fontSize: 11 }}>
                  {errors.hackathonName}
                </span>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Registration Link *</label>
              <input
                className="input"
                value={form.hackathonLink}
                onChange={(e) => set("hackathonLink")(e.target.value)}
                placeholder="https://..."
              />
              {errors.hackathonLink && (
                <span style={{ color: "#ef4444", fontSize: 11 }}>
                  {errors.hackathonLink}
                </span>
              )}
            </div>
          </div>

          {/* Contact info / LinkedIn */}
          <div className="input-group">
            <label className="input-label">Contact / LinkedIn Profile *</label>
            <input
              className="input"
              value={form.contactInfo}
              onChange={(e) => set("contactInfo")(e.target.value)}
              placeholder="https://linkedin.com/in/you or phone/Discord"
            />
            {errors.contactInfo && (
              <span style={{ color: "#ef4444", fontSize: 11 }}>
                {errors.contactInfo}
              </span>
            )}
          </div>

          {/* Bio */}
          <div className="input-group">
            <label className="input-label">What do you bring to a team?</label>
            <textarea
              className="input"
              rows={3}
              style={{ resize: "vertical" }}
              value={form.bio}
              onChange={(e) => set("bio")(e.target.value)}
              placeholder="Full-stack React, AI/LLM integration, UI design, rapid prototyping..."
            />
          </div>

          <div
            style={{
              padding: "10px 14px",
              background: "var(--bg-input)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              Auto-expires after 14 days to keep listings active.
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 4,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ fontSize: 13 }}
            >
              {saving ? "Posting…" : "Confirm & Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Teammate List Item ────────────────────────────────────────────────────────

function TeammateItem({
  listing,
  isOwn = false,
}: {
  listing: TeammateListing;
  isOwn?: boolean;
}) {
  const initials = listing.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <li
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-5 border-b border-[var(--border-primary)] transition-colors duration-150 hover:bg-[var(--bg-input)]"
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}
      >
        {/* Avatar */}
        {listing.avatarUrl ? (
          <Image
            src={sanitizeImageUrl(listing.avatarUrl)}
            alt={listing.name}
            width={44}
            height={44}
            style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--bg-input)",
              border: "1px solid var(--border-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--primary-400)",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}

        {/* Info */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: 14,
                color: "var(--text-primary)",
              }}
            >
              {listing.name}
            </p>
            {isOwn && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(16,185,129,0.12)",
                  color: "var(--primary-400)",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                You
              </span>
            )}
          </div>

          <div
            style={{
              marginTop: 4,
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 6,
                background: "var(--bg-input)",
                border: "1px solid var(--border-primary)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Hackathon: {listing.hackathonName}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-primary)]/40 sm:border-transparent"
      >
        <Link
          href={`/teammates/${listing.id}`}
          className="flex-1 sm:flex-initial text-center justify-center text-xs font-semibold py-2 sm:py-1.5 px-3.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)] inline-flex items-center transition-all duration-150 hover:border-[var(--primary-400)] hover:text-[var(--primary-400)]"
        >
          View Profile
        </Link>
        <a
          href={listing.hackathonLink}
          target="_blank"
          rel="noopener noreferrer"
          title={`Register for ${listing.hackathonName}`}
          className="flex-1 sm:flex-initial text-center justify-center text-xs font-medium py-2 sm:py-1.5 px-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] inline-flex items-center gap-1.5 transition-all duration-150 hover:border-[var(--primary-400)] hover:text-[var(--primary-400)]"
        >
          <span>Hackathon</span>
          <FiExternalLink className="w-3 h-3 shrink-0" />
        </a>
      </div>
    </li>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TeammatesPage() {
  const { user, userProfile, loginWithGoogle } = useAuth();

  const [listings, setListings] = useState<TeammateListing[]>([]);
  const [myListing, setMyListing] = useState<TeammateListing | null>(null);
  const [loadingMine, setLoadingMine] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Realtime subscription to all active listings
  useEffect(() => {
    const unsub = subscribeToTeammates(
      (data) => setListings(data),
      (err) => console.error("[TeammatesPage] subscription error:", err),
    );
    return unsub;
  }, []);

  // Load the current user's own listing (deferred to avoid synchronous setState in effect)
  useEffect(() => {
    if (!user) {
      queueMicrotask(() => setMyListing(null));
      return;
    }
    queueMicrotask(() => {
      setLoadingMine(true);
      getTeammateListing(user.uid)
        .then(setMyListing)
        .catch(() => setMyListing(null))
        .finally(() => setLoadingMine(false));
    });
  }, [user]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const filtered = listings.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.hackathonName.toLowerCase().includes(q)
    );
  });

  const handlePostClick = async () => {
    if (!user) {
      try {
        await loginWithGoogle();
      } catch {
        /* dismissed */
      }
      return;
    }
    setShowModal(true);
  };

  const handleSave = async (values: {
    name: string;
    university: string;
    bio: string;
    contactInfo: string;
    hackathonName: string;
    hackathonLink: string;
  }) => {
    if (!user) return;
    setSaving(true);
    try {
      await upsertTeammateListing(user.uid, {
        userId: user.uid,
        name: values.name,
        avatarUrl: user.photoURL ?? null,
        email: user.email ?? "",
        university: values.university,
        bio: values.bio,
        contactInfo: values.contactInfo,
        hackathonName: values.hackathonName,
        hackathonLink: values.hackathonLink,
      });
      const updated = await getTeammateListing(user.uid);
      setMyListing(updated);
      toast.success("Listing posted! Active for 14 days.");
      setShowModal(false);
    } catch (err) {
      console.error("[TeammatesPage] upsert failed:", err);
      toast.error("Failed to post listing.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await deleteTeammateListing(user.uid);
      setMyListing(null);
      toast.success("Listing removed.");
    } catch {
      toast.error("Failed to remove listing.");
    } finally {
      setSaving(false);
    }
  };

  // Default form values pre-filled from profile
  const defaultForm = {
    name: userProfile?.displayName ?? "",
    university: userProfile?.universityName ?? "",
    bio: userProfile?.bio ?? "",
    contactInfo: userProfile?.contactInfo ?? "",
    hackathonName: "",
    hackathonLink: "",
  };

  return (
    <div
      style={{
        padding: "var(--page-padding-y) var(--page-padding-x)",
        width: "100%",
      }}
    >
      {/* ── Page Header ── */}
      <header style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h1
            className="flex items-center gap-2"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 16,
              fontWeight: 800,
              lineHeight: 1.15,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <FiUsers
              style={{
                width: 18,
                height: 18,
                color: "var(--primary-400)",
                flexShrink: 0,
              }}
            />
            <span className={"ml-2"}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                Drop randoms.{" "}
              </span>
              <div
                style={{
                  background: "var(--gradient-text, var(--gradient-primary))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontWeight: 700,
                }}
              >
                Build a beast squad!
              </div>
            </span>
          </h1>

          {/* Action button: Post listing / Remove listing */}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            {/* Search toggle */}
            <button
              type="button"
              aria-label={searchOpen ? "Close search" : "Search"}
              onClick={() => {
                setSearchOpen((v) => !v);
                if (searchOpen) setSearch("");
              }}
              style={{
                background: searchOpen ? "var(--bg-input)" : "transparent",
                border: "1px solid",
                borderColor: searchOpen
                  ? "var(--border-primary)"
                  : "transparent",
                borderRadius: 8,
                color: searchOpen
                  ? "var(--primary-400)"
                  : "var(--text-tertiary)",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              {searchOpen ? (
                <FiX style={{ width: 14, height: 14 }} />
              ) : (
                <FiSearch style={{ width: 14, height: 14 }} />
              )}
            </button>

            {myListing ? (
              <button
                type="button"
                disabled={saving || loadingMine}
                onClick={handleRemove}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(239,68,68,0.3)",
                  background: "rgba(239,68,68,0.06)",
                  color: "#ef4444",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                <FiTrash2 style={{ width: 13, height: 13 }} />
                {saving ? "Removing…" : "Remove listing"}
              </button>
            ) : (
              <button
                type="button"
                disabled={saving || loadingMine}
                onClick={handlePostClick}
                className="btn btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                <FiPlus style={{ width: 13, height: 13 }} />
                Post
              </button>
            )}
          </div>
        </div>

        {/* Subtitle */}
        {myListing && (
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12,
              color: "var(--text-tertiary)",
            }}
          >
            Your listing is live · expires in {daysLeft(myListing.expiresAt)}d
          </p>
        )}

        {/* Search bar */}
        {searchOpen && (
          <div style={{ position: "relative", marginTop: 12 }}>
            <FiSearch
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 14,
                height: 14,
                color: "var(--text-tertiary)",
              }}
            />
            <input
              ref={searchRef}
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or hackathon…"
              style={{ paddingLeft: 32 }}
            />
          </div>
        )}
      </header>

      {/* ── Listings ── */}
      <section
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 13,
            }}
          >
            {search
              ? "No teammates match your search."
              : "No listings yet. Be the first to post!"}
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {filtered.map((l) => (
              <TeammateItem
                key={l.id}
                listing={l}
                isOwn={user?.uid === l.userId}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ── Modal ── */}
      {showModal && (
        <PostListingModal
          initial={defaultForm}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
