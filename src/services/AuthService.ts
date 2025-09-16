import { supabase } from '@/integrations/supabase/client';
import { User, Session, AuthError } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  phone?: string;
  is_admin: boolean;
  tier: string;
  subscription_active: boolean;
  trial_expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Clean AuthService - handles all Supabase operations
 * No state management, no caching - pure operations
 */
export class AuthService {

  /**
   * Get current session from Supabase
   */
  static async getSession(): Promise<AuthResult<Session>> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ AuthService: Failed to get session:', error);
        return { data: null, error: error.message };
      }

      return { data: session, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error getting session';
      console.error('❌ AuthService: Session error:', err);
      return { data: null, error: errorMessage };
    }
  }

  /**
   * Fetch user profile from Supabase
   */
  static async getUserProfile(userId: string): Promise<AuthResult<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ AuthService: Failed to get profile:', error);
        return { data: null, error: error.message };
      }

      if (!data) {
        return { data: null, error: 'Profile not found' };
      }

      console.log('✅ AuthService: Profile fetched successfully');
      return { data: data as UserProfile, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error getting profile';
      console.error('❌ AuthService: Profile error:', err);
      return { data: null, error: errorMessage };
    }
  }

  /**
   * Sign in with Google
   */
  static async signInWithGoogle(): Promise<AuthResult<void>> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/welcome`
        }
      });

      if (error) {
        console.error('❌ AuthService: Google sign-in failed:', error);
        return { data: null, error: error.message };
      }

      console.log('✅ AuthService: Google sign-in initiated');
      return { data: null, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error signing in';
      console.error('❌ AuthService: Sign-in error:', err);
      return { data: null, error: errorMessage };
    }
  }

  /**
   * Sign out user
   */
  static async signOut(): Promise<AuthResult<void>> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ AuthService: Sign-out failed:', error);
        return { data: null, error: error.message };
      }

      console.log('✅ AuthService: User signed out successfully');
      return { data: null, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error signing out';
      console.error('❌ AuthService: Sign-out error:', err);
      return { data: null, error: errorMessage };
    }
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChange(callback: (session: Session | null) => void): () => void {
    console.log('🔗 AuthService: Setting up auth state listener');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔄 AuthService: Auth event - ${event}`, session ? 'Session exists' : 'No session');
      callback(session);
    });

    // Return unsubscribe function
    return () => {
      console.log('🔇 AuthService: Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }

  /**
   * Create a managed timeout that can be cancelled
   */
  static createManagedTimeout(callback: () => void, delay: number): () => void {
    const timeoutId = setTimeout(callback, delay);
    return () => clearTimeout(timeoutId);
  }
}