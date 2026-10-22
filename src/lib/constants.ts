/** Bump when the privacy policy changes in a way that needs fresh consent. */
export const CONSENT_VERSION = "2026-10";

/** Contact addresses are configured per deployment. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

/** Days after which a help contact must be re-verified by an administrator. */
export const CONTACT_STALE_DAYS = 90;

/**
 * Set to true only after a lawyer has reviewed the privacy policy (src/content/legal.ts) and the
 * psychologist has signed off the texts. While false, the policy page shows a "draft" notice.
 */
export const LEGAL_REVIEWED = false;
