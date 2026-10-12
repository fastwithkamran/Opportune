"use client";

import Link from "next/link";
import { FiArrowRight, FiZap } from "react-icons/fi";

/**
 * Shown when a signed-in user has no society yet, or when the society record
 * linked to their account cannot be found. Replaces the generic locked-card
 * with an engaging creator CTA that motivates students and reps to act.
 */
export function NoSocietyState({
  missingSociety = false,
}: {
  missingSociety?: boolean;
}) {
  if (missingSociety) {
    return (
      <div
        style={{
          padding: "48px 28px",
          textAlign: "center",
          maxWidth: 420,
          margin: "0 auto",
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            marginBottom: 20,
          }}
        >
          The page linked to your account could not be found. It may have been
          removed or there&apos;s a sync issue.
        </p>
        <Link href="/feed" className="btn btn-outline btn-sm">
          Back to Feed
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "var(--page-padding-y) var(--page-padding-x)",
        maxWidth: 680,
      }}
    >
      {/* ── Creator CTA Card ── */}
      <div
        style={{
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--radius-xl)",
          background: "var(--bg-card)",
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Icon pill */}
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.18)",
              color: "var(--primary-400)",
              borderRadius: 999,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            FOR SOCIETIES &amp; COMPANIES
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 22,
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
              Your community deserves
            </span>
            <span
              style={{
                background: "var(--gradient-text, var(--gradient-primary))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontWeight: 700,
              }}
            >
              a real presence
            </span>
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            Post hackathons, share internships, drop announcements. Students at
            Pakistan are already here.
          </p>
        </div>

        {/* Feature bullets */}
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {[
            "Create your page in minutes",
            "Reach students across every university in the feed",
            "Post events, internships & opportunities instantly",
          ].map((text) => (
            <li
              key={text}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "rgba(16,185,129,0.1)",
                  color: "var(--primary-400)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                ✓
              </span>
              {text}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/create-society"
            className="btn btn-primary inline-flex items-center gap-2"
            style={{ fontSize: 13 }}
          >
            Create your page
            <FiArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
