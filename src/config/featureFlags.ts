// Centralized feature flag configuration. Non-breaking defaults.
// Flags can be toggled via Vite env vars (VITE_FLAG_*) or at runtime if wired to a context later.

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

const envBool = (key: string, fallback: boolean) => {
  const v = import.meta?.env?.[key as any];
  if (typeof v === 'string') {
    const lower = v.toLowerCase();
    return lower === '1' || lower === 'true' || lower === 'yes' || lower === 'on';
  }
  return fallback;
};

export const featureFlags: FeatureFlags = {
  secondary_market_enabled: envBool('VITE_FLAG_SECONDARY_MARKET', true),  // Production-ready: enabled by default
  trading_ui_enabled: envBool('VITE_FLAG_TRADING_UI', true),
  trial_enforcement_enabled: envBool('VITE_FLAG_TRIAL_ENFORCEMENT', false),
  notifications_enabled: envBool('VITE_FLAG_NOTIFICATIONS', true),
  analytics_enabled: envBool('VITE_FLAG_ANALYTICS', true),  // Production-ready: enabled by default
};

export const isFeatureEnabled = (key: keyof FeatureFlags): boolean => featureFlags[key];

