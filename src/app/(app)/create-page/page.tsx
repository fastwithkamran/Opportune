"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createSociety, uploadFile } from "@/lib/firestore";
import { normalizeHttpUrl } from "@/lib/url";
import type { CommunityLinks } from "@/types";
import Loader from "@/components/Loader";
import { ImageUploadField } from "./_components/ImageUploadField";
import { FiImage, FiLayers } from "react-icons/fi";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import {
  BasicInformationFields,
  CommunityLinkFields,
  ContactFields,
  Section,
  fieldId,
  type BasicField,
  type ContactField,
  type FormErrors,
  type SocietyFormValues,
} from "./_components/SocietyFormSections";

const initialForm: SocietyFormValues = {
  name: "",
  organization: "",
  city: "",
  country: "",
  description: "",
  website: "",
  contactEmail: "",
  communityLinks: {
    discord: "",
    whatsapp: "",
    linkedin: "",
    twitter: "",
    instagram: "",
  },
};

/** sessionStorage key for draft form persistence. */
const STORAGE_KEY = "opportune:create-page-draft";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const safeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);

const makeUploadId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const pageStyle: React.CSSProperties = {
  padding: "var(--page-padding-y) var(--page-padding-x)",
  maxWidth: 700,
  width: "100%",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: 22,
  fontWeight: 800,
};

export default function CreateSocietyPage() {
  const router = useRouter();
  const {
    user,
    userProfile,
    loading,
    profileError,
    refreshUserProfile,
    loginWithGoogle,
  } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  // State updates are async, so two fast clicks could both pass `saving`.
  // A ref blocks the second submit synchronously (prevents duplicate societies).
  const submittingRef = useRef(false);

  // ── Load draft from sessionStorage on mount ───────────────────────────────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SocietyFormValues>;
        queueMicrotask(() => setForm((prev) => ({ ...prev, ...parsed })));
      }
    } catch {
      // sessionStorage unavailable or JSON invalid — silent fail
    }
  }, []);

  // ── Persist draft to sessionStorage on every form change ─────────────────
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // Storage quota exceeded or unavailable — silent fail
    }
  }, [form]);

  useEffect(() => {
    if (userProfile?.societyId) router.replace("/my-page");
  }, [router, userProfile?.societyId]);

  // Prevent accidental navigation during active media upload
  useEffect(() => {
    if (!saving) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saving]);

  const clearError = (key: string) =>
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current,
    );

  const updateField = (field: BasicField | ContactField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    clearError(field);
  };

  const updateCommunityLink = (key: keyof CommunityLinks, value: string) => {
    setForm((current) => ({
      ...current,
      communityLinks: { ...current.communityLinks, [key]: value },
    }));
    clearError(`community.${key}`);
  };

  const validate = () => {
    const next: FormErrors = {};
    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) next.name = "Page name is required.";
    else if (name.length < 3) next.name = "Use at least 3 characters.";
    if (!form.city.trim()) next.city = "City is required.";
    if (!form.country.trim()) next.country = "Country is required.";
    if (!description) next.description = "Description is required.";
    else if (description.length < 20)
      next.description = "Tell people a little more (at least 20 characters).";

    if (form.website.trim() && normalizeHttpUrl(form.website) === null)
      next.website = "Enter a valid http(s) link, e.g. https://yourpage.com";
    if (
      form.contactEmail.trim() &&
      !EMAIL_PATTERN.test(form.contactEmail.trim())
    )
      next.contactEmail = "Enter a valid email address.";

    for (const [key, value] of Object.entries(form.communityLinks)) {
      if (value.trim() && normalizeHttpUrl(value) === null)
        next[`community.${key}`] = "Enter a valid http(s) link.";
    }
    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    // Validate the form first so the user sees errors even before sign-in.
    const nextErrors = validate();
    setErrors(nextErrors);
    const firstInvalid = Object.keys(nextErrors).find((k) => nextErrors[k]);
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      toast.error("Please fix the highlighted fields.");
      return;
    }

    // If not signed in, show the inline sign-in prompt (form data is safe in
    // sessionStorage so nothing is lost after they authenticate).
    if (!user || !userProfile) {
      setShowSignInPrompt(true);
      return;
    }

    submittingRef.current = true;
    setSaving(true);
    setUploadProgress(0);

    try {
      let logoURL = "";
      let bannerURL = "";
      const uploadFolderId = `temp_${makeUploadId()}`;

      // Upload both images in parallel; overall progress is the average.
      const pending = [logoFile, bannerFile].filter(Boolean).length;
      if (pending > 0) {
        setUploadProgress(10);
        const done = { logo: 0, banner: 0 };
        const report = () =>
          // Math.max: progress callbacks can arrive out of order
          setUploadProgress((prev) =>
            Math.max(prev, 10 + ((done.logo + done.banner) / pending) * 0.8),
          );

        [logoURL, bannerURL] = await Promise.all([
          logoFile
            ? uploadFile(
                logoFile,
                `societies/${uploadFolderId}/logo_${safeFileName(logoFile.name)}`,
                (progress) => {
                  done.logo = progress;
                  report();
                },
              )
            : Promise.resolve(""),
          bannerFile
            ? uploadFile(
                bannerFile,
                `societies/${uploadFolderId}/banner_${safeFileName(bannerFile.name)}`,
                (progress) => {
                  done.banner = progress;
                  report();
                },
              )
            : Promise.resolve(""),
        ]);
      }
      setUploadProgress(90);

      const communityLinks = Object.fromEntries(
        Object.entries(form.communityLinks)
          .map(([key, value]) => [key, normalizeHttpUrl(value) ?? ""])
          .filter(([, value]) => value),
      ) as CommunityLinks;

      await createSociety(
        {
          name: form.name.trim(),
          organization: form.organization.trim(),
          city: form.city.trim(),
          country: form.country.trim(),
          description: form.description.trim(),
          website: normalizeHttpUrl(form.website) ?? "",
          contactEmail: form.contactEmail.trim() || user.email || "",
          communityLinks:
            Object.keys(communityLinks).length > 0 ? communityLinks : undefined,
          logoURL,
          bannerURL,
        },
        {
          uid: user.uid,
          displayName: userProfile.displayName,
          email: user.email ?? "",
          photoURL: userProfile.photoURL,
        },
      );
    } catch (error) {
      console.error("[CreateSocietyPage] Failed to create society:", error);
      toast.error("Failed to create page. Please try again.");
      submittingRef.current = false;
      setSaving(false);
      setUploadProgress(0);
      return;
    }

    // The society now EXISTS. A failure refreshing the profile must not be
    // reported as "failed to create" -- the user would retry and create a
    // duplicate. Keep `saving` true so the form stays locked while we leave.
    setUploadProgress(100);
    try {
      await refreshUserProfile();
    } catch (error) {
      console.error("[CreateSocietyPage] Profile refresh failed:", error);
    }
    toast.success(`"${form.name.trim()}" is now live!`);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    router.replace("/my-page");
  };

  const handleCancel = () => {
    if (window.history.length > 1) router.back();
    else router.push("/feed");
  };

  const handleSignIn = () => {
    loginWithGoogle()
      .then(() => {
        // Signed in — dismiss the prompt so the auto-submit logic can proceed
        setShowSignInPrompt(false);
      })
      .catch((error: unknown) => {
        const code =
          typeof error === "object" && error !== null && "code" in error
            ? String((error as { code: unknown }).code)
            : "";
        if (code.includes("popup-closed") || code.includes("cancelled")) return;
        console.error("[CreateSocietyPage] Sign-in failed:", error);
        toast.error("Unable to sign in. Please try again.");
      });
  };

  if (loading || userProfile?.societyId) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
        <Loader />
      </div>
    );
  }

  // Profile loading and error states
  if (profileError) {
    return (
      <div role="alert" style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>
          Your account profile could not be loaded. Please refresh and try
          again.
        </p>
      </div>
    );
  }

  if (user && !userProfile) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
        <Loader />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1.15,
            margin: 0,
            marginBottom: 4,
          }}
        >
          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
            Create a{" "}
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
            Page
          </span>
        </h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          Create a page on Opportune to share opportunities, events, and
          updates. Your page will be public and discoverable in the global feed.
        </p>
      </header>

      {/* noValidate: validation is handled above so errors are inline, themed,
          and consistent (native bubbles can't be styled or announced well). */}
      <form onSubmit={handleSubmit} noValidate>
        <BasicInformationFields
          form={form}
          errors={errors}
          onChange={updateField}
        />

        <Section title="Logo &amp; Banner">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <ImageUploadField
              id="society-logo"
              label="Logo (400×400 recommended)"
              icon={<FiImage style={{ width: 28, height: 28 }} />}
              file={logoFile}
              disabled={saving}
              onFileChange={setLogoFile}
            />
            <ImageUploadField
              id="society-banner"
              label="Banner (1200×400 recommended)"
              icon={<FiLayers style={{ width: 28, height: 28 }} />}
              file={bannerFile}
              disabled={saving}
              onFileChange={setBannerFile}
            />
          </div>
        </Section>

        <ContactFields form={form} errors={errors} onChange={updateField} />
        <CommunityLinkFields
          form={form}
          errors={errors}
          onChange={updateCommunityLink}
        />

        {saving && uploadProgress > 0 && (
          <div role="status" aria-live="polite" style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                marginBottom: 6,
              }}
            >
              {uploadProgress < 90
                ? `Uploading images… ${Math.round(uploadProgress)}%`
                : "Creating page…"}
            </div>
            <div
              role="progressbar"
              aria-label="Page creation progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(uploadProgress)}
              style={{
                height: 5,
                background: "var(--bg-tertiary)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: "100%",
                  background: "var(--gradient-primary)",
                  transition: "width .4s",
                }}
              />
            </div>
          </div>
        )}

        {/* ── Inline sign-in prompt (shown after validation passes for guests) ── */}
        {showSignInPrompt ? (
          <div
            style={{
              border: "1px solid var(--border-primary)",
              borderRadius: "var(--radius-lg)",
              background: "var(--bg-input)",
              padding: "20px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 15,
                  fontWeight: 650,
                  margin: "0 0 4px",
                  color: "var(--text-primary)",
                }}
              >
                Almost there — sign in to publish.
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Your form is saved. Sign in with Google and we&apos;ll create
                your page instantly.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSignIn}
              >
                Sign in with Google
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowSignInPrompt(false)}
              >
                Back to form
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: 160 }}
            >
              {saving ? (
                "Creating…"
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <HiOutlineBuildingLibrary style={{ width: 16, height: 16 }} />{" "}
                  Create Page
                </span>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
