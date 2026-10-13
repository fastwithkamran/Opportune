"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getTeammateListing } from "@/lib/firestore";
import { normalizeHttpUrl } from "@/lib/url";
import { sanitizeImageUrl } from "@/lib/utils";
import type { TeammateListing } from "@/types";
import { FiArrowLeft, FiMail, FiExternalLink, FiUsers } from "react-icons/fi";
import { MdOutlineSchool } from "react-icons/md";
import LottieAnimation from "@/components/Loader";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysLeft(expiresAt: Date): number {
  return Math.max(
    0,
    Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
}

function isExternalLink(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

// ─── Detail Page ──────────────────────────────────────────────────────────────

export default function TeammateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const [listing, setListing] = useState<TeammateListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    getTeammateListing(id)
      .then((data) => {
        if (!data) setNotFound(true);
        else setListing(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const initials = listing?.name
    ? listing.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "60vh",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <LottieAnimation />
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div
        style={{
          padding: "var(--page-padding-y) var(--page-padding-x)",
          maxWidth: 480,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          <FiArrowLeft style={{ width: 14, height: 14 }} />
          Back
        </button>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          This listing no longer exists or has expired.
        </p>
      </div>
    );
  }

  const contactLink = isExternalLink(listing.contactInfo)
    ? normalizeHttpUrl(listing.contactInfo)
    : null;

  const mailtoLink = `mailto:${listing.email}?subject=Teaming up for ${encodeURIComponent(listing.hackathonName)}`;

  return (
    <div
      style={{
        padding: "var(--page-padding-y) var(--page-padding-x)",
        maxWidth: 720,
        width: "100%",
      }}
    >
      {/* Back button */}
      <Link
        href="/teammates"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-secondary)",
          fontSize: 13,
          fontWeight: 500,
          textDecoration: "none",
          marginBottom: 16,
          transition: "color 0.15s ease",
        }}
        className="hover:text-[var(--text-primary)]"
      >
        <FiArrowLeft style={{ width: 14, height: 14 }} />
        Back to all teammates
      </Link>

      {/* Main Profile Card */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
        }}
      >
        {/* Avatar + name banner */}
        <div
          style={{
            padding: "24px 24px 20px",
            borderBottom: "1px solid var(--border-primary)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: "var(--bg-secondary)",
          }}
        >
          {listing.avatarUrl ? (
            <Image
              src={sanitizeImageUrl(listing.avatarUrl)}
              alt={listing.name}
              width={64}
              height={64}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
                border: "2px solid var(--border-primary)",
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--bg-input)",
                border: "2px solid var(--border-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
                color: "var(--primary-400)",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-heading)",
                fontSize: 18,
                color: "var(--text-primary)",
              }}
            >
              {listing.name}
            </h1>
            {listing.university && (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <MdOutlineSchool style={{ width: 15, height: 15 }} />
                  {listing.university}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* Target Hackathon Highlight Card */}
          <div
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-primary)",
              borderRadius: "var(--radius-lg)",
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Target Hackathon
              </span>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {listing.hackathonName}
              </p>
            </div>
            <a
              href={listing.hackathonLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-primary)",
                background: "var(--bg-card)",
                color: "var(--primary-400)",
                textDecoration: "none",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
              className="hover:border-[var(--primary-400)]"
            >
              Hackathon Details{" "}
              <FiExternalLink style={{ width: 13, height: 13 }} />
            </a>
          </div>

          {/* Whom Are We Looking For */}
          {listing.bio && (
            <div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Whom Are We Looking For
              </span>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 13.5,
                  color: "var(--text-secondary)",
                  lineHeight: 1.65,
                }}
              >
                {listing.bio}
              </p>
            </div>
          )}

          {/* Listing duration */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--text-tertiary)",
            }}
          >
            <FiUsers style={{ width: 13, height: 13 }} />
            <span>Listing expires in {daysLeft(listing.expiresAt)} days</span>
          </div>
        </div>

        {/* Contact CTA Footer */}
        <div
          style={{
            padding: "16px 24px 20px",
            borderTop: "1px solid var(--border-primary)",
            background: "var(--bg-secondary)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Email button */}
          <a
            href={mailtoLink}
            className="btn btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <FiMail style={{ width: 15, height: 15 }} />
            Email To Join The Team
          </a>

          {/* Social / Portfolio button */}
          {contactLink && (
            <a
              href={contactLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--border-primary)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              className="hover:border-[var(--primary-400)] hover:text-[var(--primary-400)]"
            >
              <FiExternalLink style={{ width: 14, height: 14 }} />
              View Social / Portfolio
            </a>
          )}

          {/* Plain contact text */}
          {!contactLink && listing.contactInfo && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-primary)",
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
                fontSize: 12,
                userSelect: "all",
              }}
            >
              Contact: {listing.contactInfo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
