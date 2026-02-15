/**
 * Field Length Limits — Single Source of Truth
 *
 * Every text field's maximum length is defined here.
 * All three layers (Backend validation, Mobile maxLength, Admin maxLength)
 * MUST reference these values to prevent:
 *   - "Silent Failures" where the backend rejects valid-looking input
 *   - "UI Breaks" where long admin-created text overflows mobile cards
 *
 * When adding a new field, also add the constraint to:
 *   1. The Prisma schema:  @db.VarChar(N)
 *   2. The relevant controller validation
 *   3. Mobile TextInput:   maxLength={N}
 *   4. Admin input:        maxLength={N}
 */

// ─── User / Profile ─────────────────────────────────────────────────
export const USER_NAME_MAX         = 100;
export const USER_EMAIL_MAX        = 255;
export const USER_MOBILE_MAX       = 15;   // +249XXXXXXXXX = 13 chars + buffer
export const USER_PASSWORD_MIN     = 6;
export const USER_PASSWORD_MAX     = 128;
export const NATIONAL_ID_MAX       = 30;
export const PROFILE_FIRST_NAME_MAX = 50;
export const PROFILE_LAST_NAME_MAX  = 50;
export const PROFILE_PHONE_MAX     = 15;

// ─── Content (Admin-created, displayed on Mobile) ───────────────────
export const BULLETIN_TITLE_MAX    = 200;
export const BULLETIN_CONTENT_MAX  = 5000;

export const REPORT_TITLE_MAX     = 200;
export const REPORT_DESC_MAX      = 2000;
export const REPORT_COMMENT_MAX   = 1000;

export const SURVEY_TITLE_MAX     = 200;
export const SURVEY_DESC_MAX      = 1000;

export const VOTING_TITLE_MAX     = 200;
export const VOTING_DESC_MAX      = 1000;

// ─── Chat ───────────────────────────────────────────────────────────
export const CHAT_MESSAGE_MAX     = 1000;

// ─── Notifications ──────────────────────────────────────────────────
export const NOTIFICATION_TITLE_MAX   = 200;
export const NOTIFICATION_MESSAGE_MAX = 500;

// ─── Subscriptions ──────────────────────────────────────────────────
export const SUBSCRIPTION_PLAN_TITLE_MAX = 100;
export const SUBSCRIPTION_PLAN_DESC_MAX  = 500;

// ─── Hierarchy node names ───────────────────────────────────────────
export const HIERARCHY_NAME_MAX   = 100;
export const HIERARCHY_CODE_MAX   = 20;

// ─── Generic helper ─────────────────────────────────────────────────
/**
 * Validate that a string does not exceed a max length.
 * Returns an error message in Arabic or null if valid.
 */
export function checkLength(
  fieldLabel: string,
  value: string | undefined | null,
  maxLength: number,
): string | null {
  if (value && value.length > maxLength) {
    return `${fieldLabel} يجب ألا يتجاوز ${maxLength} حرف`;
  }
  return null;
}
