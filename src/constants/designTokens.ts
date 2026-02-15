/**
 * Unified Design Token Reference
 * ================================
 * This file defines the SHARED visual language between:
 *   - ppMobile (React Native — constants/Colors.ts, Font.ts, FontSize.ts, Spacing.ts)
 *   - ppAdmin  (Next.js — globals.css CSS variables, Tailwind config)
 *
 * It is the canonical source. When either platform drifts, this file
 * shows what the correct value should be.
 *
 * This file is NOT imported at runtime — it is a living reference document
 * that both teams use to keep tokens in sync.
 */

// ─── Color Palette ──────────────────────────────────────────────────
export const COLORS = {
  // Primary brand color — used for buttons, active states, links
  primary: {
    50:  '#E8F5E9',   // Mobile: lightPrimary  |  Admin: --primary-50  (was #eef2ff → CHANGE)
    100: '#C8E6C9',   //                       |  Admin: --primary-100 (was #e0e7ff → CHANGE)
    200: '#A5D6A7',   //                       |  Admin: --primary-200 (was #c7d2fe → CHANGE)
    300: '#81C784',   //                       |  Admin: --primary-300
    400: '#66BB6A',   //                       |  Admin: --primary-400
    500: '#4CAF50',   //                       |  Admin: --primary-500 (was #6366f1 → CHANGE)
    600: '#2E7D32',   // Mobile: primary       |  Admin: --primary-600 (was #4f46e5 → CHANGE) ← main brand
    700: '#1B5E20',   //                       |  Admin: --primary-700 (was #4338ca → CHANGE)
    800: '#145214',   //                       |  Admin: --primary-800
    900: '#0D3B0D',   //                       |  Admin: --primary-900
  },

  // Success — confirmations, active status badges
  success: {
    50:  '#F0FDF4',   // Admin: --success-50
    100: '#DCFCE7',   // Admin: --success-100
    500: '#22C55E',   // Admin: --success-500
    600: '#16A34A',   // Admin: --success-600
  },

  // Error / danger — destructive actions, error states
  error: {
    50:  '#FEF2F2',   // Admin: --error-50
    100: '#FEE2E2',   // Admin: --error-100
    500: '#EF4444',   // Admin: --error-500   Mobile: #D32F2F → CHANGE to #EF4444
    600: '#DC2626',   // Admin: --error-600
  },

  // Warning / accent
  warning: {
    50:  '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
  },

  // Neutral — text, borders, backgrounds
  neutral: {
    50:  '#F8FAFC',   // Admin: --neutral-50   (page background)
    100: '#F1F5F9',   // Admin: --neutral-100
    200: '#E2E8F0',   // Admin: --neutral-200  Mobile: #ECECEC → ~ok
    300: '#CBD5E1',   // Admin: --neutral-300
    400: '#94A3B8',   // Admin: --neutral-400
    500: '#64748B',   // Admin: --neutral-500
    600: '#475569',   // Admin: --neutral-600  Mobile: #626262 → close enough
    700: '#334155',   // Admin: --neutral-700
    800: '#1E293B',   // Admin: --neutral-800
    900: '#0F172A',   // Admin: --neutral-900  (primary text)
  },

  // Static
  white: '#FFFFFF',
  black: '#000000',
};

// ─── Typography ─────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  // Font family — Arabic-optimized
  fontFamily: {
    regular: 'Tajawal',       // Mobile: Tajawal-Regular  |  Admin: CHANGE from Arial
    medium:  'Tajawal-Medium',
    bold:    'Tajawal-Bold',
    // Admin should add:  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
    // Then: font-family: 'Tajawal', Arial, Helvetica, sans-serif;
  },

  // Font sizes (in px) — both platforms should use the same scale
  fontSize: {
    xs:    12,  // Tailwind: text-xs
    sm:    14,  // Tailwind: text-sm   |  Mobile: FontSize.small
    base:  16,  // Tailwind: text-base |  Mobile: FontSize.medium
    lg:    18,  // Tailwind: text-lg
    xl:    20,  // Tailwind: text-xl   |  Mobile: FontSize.large
    '2xl': 24,  // Tailwind: text-2xl
    '3xl': 30,  // Tailwind: text-3xl  |  Mobile: FontSize.xLarge
    '4xl': 36,  // Tailwind: text-4xl  |  Mobile: FontSize.xxLarge (was 35 → align to 36)
  },
};

// ─── Spacing ────────────────────────────────────────────────────────
// Both platforms should use a 4px base unit (Tailwind default)
export const SPACING = {
  unit: 4,       // 1 spacing unit = 4px
  // Common named sizes
  xs:  4,        // 1 unit   — Tailwind: p-1
  sm:  8,        // 2 units  — Tailwind: p-2
  md:  12,       // 3 units  — Tailwind: p-3
  lg:  16,       // 4 units  — Tailwind: p-4     |  Mobile: Spacing * 1.6
  xl:  20,       // 5 units  — Tailwind: p-5     |  Mobile: Spacing * 2
  '2xl': 24,     // 6 units  — Tailwind: p-6
  '3xl': 32,     // 8 units  — Tailwind: p-8
};

// ─── Border Radius ──────────────────────────────────────────────────
export const RADII = {
  sm:   6,       // Tailwind: rounded-md
  md:   8,       // Tailwind: rounded-lg   |  Mobile: 8px (buttons)
  lg:   12,      // Tailwind: rounded-xl   |  Mobile: 12px (cards)
  xl:   16,      // Tailwind: rounded-2xl
  full: 9999,    // Tailwind: rounded-full |  Admin: button pill shape
  // DECISION: Buttons should use `md` (8px) on BOTH platforms
  // Admin currently uses rounded-full — needs alignment to rounded-lg
};

// ─── Button Styles ──────────────────────────────────────────────────
export const BUTTONS = {
  primary: {
    background:   COLORS.primary[600],       // #2E7D32
    text:         COLORS.white,
    borderRadius: RADII.md,                  // 8px on both
    paddingH:     SPACING.lg,                // 16px horizontal
    paddingV:     SPACING.md,                // 12px vertical
  },
  secondary: {
    background:   COLORS.primary[50],        // #E8F5E9
    text:         COLORS.primary[600],       // #2E7D32
    borderRadius: RADII.md,
    paddingH:     SPACING.lg,
    paddingV:     SPACING.md,
  },
  danger: {
    background:   COLORS.error[100],         // #FEE2E2
    text:         COLORS.error[600],         // #DC2626
    borderRadius: RADII.md,
    paddingH:     SPACING.lg,
    paddingV:     SPACING.md,
  },
};

// ─── Input Fields ───────────────────────────────────────────────────
export const INPUTS = {
  background:    COLORS.white,               // Both platforms: white
  border:        COLORS.neutral[200],        // #E2E8F0
  borderFocus:   COLORS.primary[600],        // #2E7D32 (green focus ring)
  borderRadius:  RADII.lg,                   // 12px
  paddingH:      SPACING.lg,                 // 16px
  paddingV:      SPACING.md,                 // 12px
  fontSize:      TYPOGRAPHY.fontSize.sm,     // 14px
};

// ─── Cards ──────────────────────────────────────────────────────────
export const CARDS = {
  background:   COLORS.white,
  border:       COLORS.neutral[200],
  borderRadius: RADII.lg,                    // 12px — already aligned
  padding:      SPACING.lg,                  // 16px
  shadow:       '0 1px 2px rgba(0,0,0,0.05)',
};
