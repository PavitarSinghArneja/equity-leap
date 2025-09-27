import { UserProfile } from '@/services/AuthService';

/**
 * User tier hierarchy (from lowest to highest access)
 */
export const USER_TIERS = {
  EXPLORER: 'explorer',
  WAITLIST_PLAYER: 'waitlist_player',
  SMALL_INVESTOR: 'small_investor',
  LARGE_INVESTOR: 'large_investor'
} as const;

export type UserTier = typeof USER_TIERS[keyof typeof USER_TIERS];

/**
 * Check if user has access to notes functionality
 * Notes are available to waitlist_player tier and above
 */
export const canAccessNotes = (profile: UserProfile | null): boolean => {
  if (!profile) return false;

  // Admin override always grants access
  if (profile.is_admin) return true;

  // Tier override by admin grants access if user is investor tier
  if (profile.tier_override_by_admin) {
    return profile.tier === USER_TIERS.SMALL_INVESTOR ||
           profile.tier === USER_TIERS.LARGE_INVESTOR;
  }

  // Check if user tier is waitlist_player or above
  const allowedTiers = [
    USER_TIERS.WAITLIST_PLAYER,
    USER_TIERS.SMALL_INVESTOR,
    USER_TIERS.LARGE_INVESTOR
  ];

  return allowedTiers.includes(profile.tier as UserTier);
};

/**
 * Check if user has access to watchlist functionality
 * Watchlist is available to all authenticated users
 */
export const canAccessWatchlist = (profile: UserProfile | null): boolean => {
  return !!profile;
};

/**
 * Check if user is admin
 */
export const isAdmin = (profile: UserProfile | null): boolean => {
  return profile?.is_admin || false;
};

/**
 * Get user tier display name
 */
export const getTierDisplayName = (tier: string): string => {
  const tierMap: Record<string, string> = {
    [USER_TIERS.EXPLORER]: 'Explorer',
    [USER_TIERS.WAITLIST_PLAYER]: 'Waitlist Player',
    [USER_TIERS.SMALL_INVESTOR]: 'Small Investor',
    [USER_TIERS.LARGE_INVESTOR]: 'Large Investor'
  };

  return tierMap[tier] || tier;
};

/**
 * Check if user tier meets minimum requirement
 */
export const meetsMinimumTier = (
  userTier: string | null,
  requiredTier: UserTier
): boolean => {
  if (!userTier) return false;

  const tierOrder = [
    USER_TIERS.EXPLORER,
    USER_TIERS.WAITLIST_PLAYER,
    USER_TIERS.SMALL_INVESTOR,
    USER_TIERS.LARGE_INVESTOR
  ];

  const userTierIndex = tierOrder.indexOf(userTier as UserTier);
  const requiredTierIndex = tierOrder.indexOf(requiredTier);

  return userTierIndex >= requiredTierIndex;
};