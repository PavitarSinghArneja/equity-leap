import { Session } from '@supabase/supabase-js';
import { UserProfile } from './AuthService';

/**
 * CacheService - handles localStorage operations synchronously
 * No async operations to avoid React lifecycle timing issues
 */
export class CacheService {
  private static readonly CACHE_KEYS = {
    SESSION: 'retreat_slice_cached_session',
    PROFILE: 'retreat_slice_cached_profile',
    TIMESTAMP: 'retreat_slice_cache_timestamp'
  } as const;

  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Load cached data synchronously - no async operations
   */
  static loadCache(): { session: Session | null; profile: UserProfile | null; isValid: boolean } {
    try {
      const timestamp = localStorage.getItem(this.CACHE_KEYS.TIMESTAMP);
      const sessionData = localStorage.getItem(this.CACHE_KEYS.SESSION);
      const profileData = localStorage.getItem(this.CACHE_KEYS.PROFILE);

      console.log('📦 CacheService: Loading cache synchronously');

      // Check if cache exists and is not expired
      if (!timestamp || !sessionData) {
        console.log('📭 CacheService: Cache miss - no timestamp or session');
        return { session: null, profile: null, isValid: false };
      }

      const cacheAge = Date.now() - parseInt(timestamp);
      const isExpired = cacheAge > this.CACHE_DURATION;

      if (isExpired) {
        console.log('⏰ CacheService: Cache expired, clearing');
        this.clearCache();
        return { session: null, profile: null, isValid: false };
      }

      // Parse cached data
      let session: Session | null = null;
      let profile: UserProfile | null = null;

      try {
        session = JSON.parse(sessionData);
        profile = profileData ? JSON.parse(profileData) : null;

        // Validate session structure
        if (!session?.user || !session?.access_token) {
          console.warn('🔍 CacheService: Invalid cached session structure');
          this.clearCache();
          return { session: null, profile: null, isValid: false };
        }

        console.log('✅ CacheService: Cache loaded successfully', {
          sessionExists: !!session,
          profileExists: !!profile,
          userId: session?.user?.id,
          profileId: profile?.id
        });

        return { session, profile, isValid: true };

      } catch (parseError) {
        console.error('❌ CacheService: Cache parse error, clearing cache:', parseError);
        this.clearCache();
        return { session: null, profile: null, isValid: false };
      }

    } catch (err) {
      console.error('❌ CacheService: Cache load error:', err);
      this.clearCache();
      return { session: null, profile: null, isValid: false };
    }
  }

  /**
   * Save session to cache
   */
  static saveSession(session: Session): void {
    try {
      localStorage.setItem(this.CACHE_KEYS.SESSION, JSON.stringify(session));
      localStorage.setItem(this.CACHE_KEYS.TIMESTAMP, Date.now().toString());
      console.log('💾 CacheService: Session cached successfully');
    } catch (err) {
      console.error('❌ CacheService: Failed to save session:', err);
      // Don't throw - caching is not critical
    }
  }

  /**
   * Save profile to cache
   */
  static saveProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(this.CACHE_KEYS.PROFILE, JSON.stringify(profile));
      console.log('💾 CacheService: Profile cached successfully');
    } catch (err) {
      console.error('❌ CacheService: Failed to save profile:', err);
      // Don't throw - caching is not critical
    }
  }

  /**
   * Clear all cached data
   */
  static clearCache(): void {
    try {
      Object.values(this.CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('🧹 CacheService: Cache cleared successfully');
    } catch (err) {
      console.error('❌ CacheService: Failed to clear cache:', err);
    }
  }

  /**
   * Check if cache is expired
   */
  static isCacheExpired(): boolean {
    try {
      const timestamp = localStorage.getItem(this.CACHE_KEYS.TIMESTAMP);
      if (!timestamp) return true;

      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge > this.CACHE_DURATION;
    } catch (err) {
      console.error('❌ CacheService: Error checking cache expiry:', err);
      return true;
    }
  }

  /**
   * Get cache info for debugging
   */
  static getCacheInfo(): {
    exists: boolean;
    expired: boolean;
    age: number;
    sessionExists: boolean;
    profileExists: boolean
  } {
    try {
      const timestamp = localStorage.getItem(this.CACHE_KEYS.TIMESTAMP);
      const sessionData = localStorage.getItem(this.CACHE_KEYS.SESSION);
      const profileData = localStorage.getItem(this.CACHE_KEYS.PROFILE);

      if (!timestamp) {
        return {
          exists: false,
          expired: true,
          age: 0,
          sessionExists: false,
          profileExists: false
        };
      }

      const age = Date.now() - parseInt(timestamp);
      const expired = age > this.CACHE_DURATION;

      return {
        exists: true,
        expired,
        age,
        sessionExists: !!sessionData,
        profileExists: !!profileData
      };
    } catch (err) {
      console.error('❌ CacheService: Error getting cache info:', err);
      return {
        exists: false,
        expired: true,
        age: 0,
        sessionExists: false,
        profileExists: false
      };
    }
  }
}