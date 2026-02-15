/**
 * Hierarchy Level Ranking — used for privilege escalation prevention.
 *
 * A lower index means a HIGHER (more privileged) level.
 * An admin can only create/promote users to levels with an EQUAL or HIGHER
 * index (i.e. equal or lower privilege).
 */

const LEVEL_RANK: Record<string, number> = {
  ADMIN:                     0,
  GENERAL_SECRETARIAT:       1,
  NATIONAL_LEVEL:            2,
  REGION:                    3,
  LOCALITY:                  4,
  ADMIN_UNIT:                5,
  DISTRICT:                  6,
  USER:                      7,
  // Expatriate levels mirror the same rank hierarchy
  EXPATRIATE_GENERAL:        2,
  EXPATRIATE_NATIONAL_LEVEL: 3,
  EXPATRIATE_REGION:         4,
  EXPATRIATE_LOCALITY:       5,
  EXPATRIATE_ADMIN_UNIT:     6,
  EXPATRIATE_DISTRICT:       7,
};

/**
 * Returns true if `creatorLevel` is permitted to assign `targetLevel`.
 * The creator must be at the same rank or higher (lower index).
 *
 * ADMIN and GENERAL_SECRETARIAT can assign anything.
 * Everyone else can only assign at or below their own level.
 */
export function canAssignLevel(creatorLevel: string, targetLevel: string): boolean {
  const creatorRank = LEVEL_RANK[creatorLevel];
  const targetRank  = LEVEL_RANK[targetLevel];

  // Unknown level → deny
  if (creatorRank === undefined || targetRank === undefined) return false;

  // ADMIN and GENERAL_SECRETARIAT can do anything
  if (creatorRank <= 1) return true;

  // Everyone else: can only assign equal or lower privilege
  return creatorRank <= targetRank;
}

/**
 * Returns true if `adminLevel` is at least as high as `requiredLevel`.
 */
export function isAtLeastLevel(adminLevel: string, requiredLevel: string): boolean {
  const adminRank    = LEVEL_RANK[adminLevel]    ?? 999;
  const requiredRank = LEVEL_RANK[requiredLevel] ?? 0;
  return adminRank <= requiredRank;
}

/**
 * Returns the numeric rank of a level (lower = more privileged).
 */
export function getLevelRank(level: string): number {
  return LEVEL_RANK[level] ?? 999;
}
