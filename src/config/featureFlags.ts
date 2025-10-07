/**
 * Production-Grade Feature Flags System
 *
 * This is a hardcoded, bulletproof feature flag configuration that does NOT
 * depend on environment variables. All flags are explicitly set to their
 * production-ready defaults.
 *
 * Why no env vars?
 * - import.meta.env can be unreliable in Vite builds
 * - Production needs consistent, predictable behavior
 * - Simpler to reason about and debug
 *
 * To change a flag: edit this file directly and rebuild.
 * For runtime toggles: integrate with a feature flag service (LaunchDarkly, etc.)
 */

export type FeatureFlags = {
  // Enable the reworked secondary market (reserve/confirm/settle). Keeps legacy marketplace intact when false.
  secondary_market_enabled: boolean;

  // Per-property trading toggle lives in DB; this gate controls global UI exposure.
  trading_ui_enabled: boolean;

  // Enforce 14-day trial gating (read-only or blocked after expiry depending on route guards).
  trial_enforcement_enabled: boolean;

  // In-app notifications extensions (watchlist/trading alerts). Existing notifications remain.
  notifications_enabled: boolean;

  // Event analytics logging (user_events table or external tooling).
  analytics_enabled: boolean;
};

/**
 * PRODUCTION FEATURE FLAGS - HARDCODED FOR RELIABILITY
 *
 * All features are ENABLED by default for production readiness.
 * Edit these values directly to toggle features.
 */
export const featureFlags: Readonly<FeatureFlags> = {
  secondary_market_enabled: true,   // ✅ ENABLED - Secondary market is production-ready
  trading_ui_enabled: true,          // ✅ ENABLED - Trading UI is production-ready
  trial_enforcement_enabled: false,  // ❌ DISABLED - Trial enforcement off by default
  notifications_enabled: true,       // ✅ ENABLED - Notifications are production-ready
  analytics_enabled: true,           // ✅ ENABLED - Analytics tracking is production-ready
} as const;

/**
 * Check if a specific feature is enabled
 * @param key - The feature flag key to check
 * @returns true if the feature is enabled, false otherwise
 */
export const isFeatureEnabled = (key: keyof FeatureFlags): boolean => {
  const enabled = featureFlags[key];
  console.log(`[FeatureFlags] Checking '${key}':`, enabled);
  return enabled;
};

/**
 * Get all feature flags (for debugging/admin panels)
 */
export const getAllFeatureFlags = (): Readonly<FeatureFlags> => {
  console.log('[FeatureFlags] All flags:', featureFlags);
  return featureFlags;
};

/**
 * Log current feature flag state (useful for debugging)
 */
export const logFeatureFlags = (): void => {
  console.group('[FeatureFlags] Current Configuration');
  console.log('🔧 Feature Flag System: PRODUCTION MODE (hardcoded)');
  console.table(featureFlags);
  console.groupEnd();
};

// Auto-log on module load for easy debugging
logFeatureFlags();

