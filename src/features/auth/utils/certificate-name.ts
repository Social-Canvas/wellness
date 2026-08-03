/**
 * Certificate-name normalization and validation.
 * Kept dependency-free (no path aliases) so Node unit tests can import directly.
 */

export const CERTIFICATE_NAME_MIN_LENGTH = 2
export const CERTIFICATE_NAME_MAX_LENGTH = 100

export const CERTIFICATE_NAME_COPY = {
  signupLabel: "Full name for certificates",
  signupHelp:
    "Enter your name exactly as you want it to appear on certificates.",
  signupConfirm:
    "I confirm that this spelling is correct. This name will appear on my certificates and cannot be changed after confirmation.",
  reviewCarefully:
    "Please review the spelling carefully. You will not be able to change this name after confirmation.",
  onboardingHeading: "Confirm your certificate name",
  onboardingBody:
    "Enter your name exactly as you want it printed on your Elevate certificates. Once confirmed, you will not be able to edit it yourself.",
  confirmAction: "Confirm certificate name",
  lockedAccountHelp:
    "This name is locked because it is used on your certificates. Contact support if a correction is required.",
  lockedAccountHelpShort:
    "This name is used for certificates and is locked. Contact support if a correction is needed.",
  accountLabel: "Certificate name",
} as const

export type CertificateNameSetSource = "signup" | "onboarding" | "admin_correction"

export type CertificateNameValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string }

/** Trim edges and collapse repeated internal whitespace. Preserves capitalization. */
export function normalizeCertificateName(raw: string): string {
  return raw.trim().replace(/\s+/gu, " ")
}

function containsControlOrLineBreak(value: string): boolean {
  return /[\u0000-\u001F\u007F\u0080-\u009F]/u.test(value)
}

function containsMarkupLikeInput(value: string): boolean {
  return /[<>{}[\]\\/]|https?:\/\//iu.test(value) || /&[#a-z0-9]+;/iu.test(value)
}

function containsLetter(value: string): boolean {
  return /\p{L}/u.test(value)
}

/**
 * Allowed after normalization: letters (any script), marks, spaces,
 * apostrophes, hyphens, periods. Digits and other punctuation are rejected.
 */
function usesAllowedCharacters(value: string): boolean {
  return /^[\p{L}\p{M} .'\-]+$/u.test(value)
}

export function validateCertificateName(raw: string): CertificateNameValidationResult {
  if (containsControlOrLineBreak(raw)) {
    return {
      ok: false,
      message: "Name cannot include line breaks or control characters.",
    }
  }

  const value = normalizeCertificateName(raw)

  if (value.length < CERTIFICATE_NAME_MIN_LENGTH) {
    return {
      ok: false,
      message: `Enter a name with at least ${CERTIFICATE_NAME_MIN_LENGTH} characters.`,
    }
  }

  if (value.length > CERTIFICATE_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Name must be at most ${CERTIFICATE_NAME_MAX_LENGTH} characters.`,
    }
  }

  if (containsMarkupLikeInput(value)) {
    return {
      ok: false,
      message: "Name cannot include markup or special symbols.",
    }
  }

  if (!containsLetter(value)) {
    return {
      ok: false,
      message: "Enter a name that includes at least one letter.",
    }
  }

  if (!usesAllowedCharacters(value)) {
    return {
      ok: false,
      message:
        "Use letters, spaces, apostrophes, hyphens, and periods only.",
    }
  }

  return { ok: true, value }
}

export function isCertificateNameLocked(profile: {
  certificateName?: string | null
  certificateNameLockedAt?: string | null
  certificate_name?: string | null
  certificate_name_locked_at?: string | null
}): boolean {
  const name =
    profile.certificateName ?? profile.certificate_name ?? null
  const lockedAt =
    profile.certificateNameLockedAt ?? profile.certificate_name_locked_at ?? null

  return Boolean(name && lockedAt)
}

/** Safe path for post-onboarding redirects. Defaults to My Library. */
export function resolveCertificateNameNextPath(
  next: string | null | undefined,
  fallback = "/dashboard/library"
): string {
  if (
    typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/certificate-name")
  ) {
    return next
  }

  return fallback
}

export function slugifyCertificateRecipientName(name: string): string {
  return normalizeCertificateName(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60) || "certificate"
}
