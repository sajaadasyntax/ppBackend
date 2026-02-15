/**
 * Canonical UI terminology — the SINGLE SOURCE OF TRUTH for every
 * user-facing label in the system.
 *
 * All three layers (Backend API responses, Mobile app, Admin panel)
 * MUST reference these exact strings so that a user never sees
 * "فعّال" in one screen and "نشط" in another.
 *
 * This file lives in the Backend so that the server can embed canonical
 * labels in API responses.  The Mobile and Admin each have a mirror copy.
 */

// ─── Hierarchy type labels ──────────────────────────────────────────
export const HIERARCHY_TYPE_LABELS: Record<string, string> = {
  ORIGINAL:   'جغرافي',
  EXPATRIATE: 'المغتربين',
  SECTOR:     'القطاع',
  GLOBAL:     'عالمي',
};

export const HIERARCHY_TYPE_LABELS_FULL: Record<string, string> = {
  ORIGINAL:   'التسلسل الجغرافي',
  EXPATRIATE: 'تسلسل المغتربين',
  SECTOR:     'تسلسل القطاع',
};

// ─── Admin level labels ─────────────────────────────────────────────
export const ADMIN_LEVEL_LABELS: Record<string, string> = {
  ADMIN:                     'مدير النظام',
  GENERAL_SECRETARIAT:       'الأمانة العامة',
  NATIONAL_LEVEL:            'المستوى القومي',
  REGION:                    'الولاية',
  LOCALITY:                  'المحلية',
  ADMIN_UNIT:                'الوحدة الإدارية',
  DISTRICT:                  'الحي',
  USER:                      'عضو',
  // Expatriate levels
  EXPATRIATE_GENERAL:        'المغتربين - عام',
  EXPATRIATE_NATIONAL_LEVEL: 'المغتربين - المستوى القومي',
  EXPATRIATE_REGION:         'المغتربين - الإقليم',
  EXPATRIATE_LOCALITY:       'المغتربين - المحلية',
  EXPATRIATE_ADMIN_UNIT:     'المغتربين - الوحدة الإدارية',
  EXPATRIATE_DISTRICT:       'المغتربين - الحي',
};

// ─── Role labels ────────────────────────────────────────────────────
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'مدير',
  USER:  'عضو',
};

// ─── Profile / account status labels ────────────────────────────────
// The DB stores English keys; these are the ONE canonical Arabic label.
export const STATUS_LABELS: Record<string, string> = {
  active:      'نشط',
  disabled:    'معطل',
  suspended:   'موقوف',
  pending:     'قيد المراجعة',
};

// ─── Sector type labels ─────────────────────────────────────────────
export const SECTOR_TYPE_LABELS: Record<string, string> = {
  SOCIAL:         'الاجتماعي',
  ECONOMIC:       'الاقتصادي',
  ORGANIZATIONAL: 'التنظيمي',
  POLITICAL:      'السياسي',
};

// ─── Hierarchy node labels (for prefixed paths) ─────────────────────
export const NODE_LABELS: Record<string, string> = {
  nationalLevel: 'المستوى القومي',
  region:        'ولاية',
  locality:      'محلية',
  adminUnit:     'وحدة إدارية',
  district:      'حي',
};
