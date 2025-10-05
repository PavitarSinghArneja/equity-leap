import { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { AuthService, UserProfile } from '@/services/AuthService';
import { CacheService } from '@/services/CacheService';
import { NotificationService } from '@/services/NotificationService';
import { AnalyticsService } from '@/services/AnalyticsService';

// Clear authentication phases - no ambiguity
type AuthPhase = 'INITIALIZING' | 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'ERROR';

// Single state object - no synchronization issues
interface AuthState {
  phase: AuthPhase;
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  error: string | null;
}

// All state changes through reducer actions - atomic updates
type AuthAction =
  | { type: 'INITIALIZE_START' }
  | { type: 'CACHE_LOADED', payload: { session: Session | null, profile: UserProfile | null } }
  | { type: 'SESSION_LOADED', payload: { session: Session | null } }
  | { type: 'PROFILE_LOADED', payload: { profile: UserProfile } }
  | { type: 'AUTH_COMPLETE', payload: { user: User, session: Session, profile: UserProfile } }
  | { type: 'AUTH_ERROR', payload: { error: string } }
  | { type: 'UNAUTHENTICATED' }
  | { type: 'SIGN_OUT' }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
  phase: 'INITIALIZING',
  user: null,
  profile: null,
  session: null,
  error: null
};

// Reducer for atomic state updates
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'INITIALIZE_START':
      console.log('🔄 AuthReducer: INITIALIZE_START');
      return {
        ...state,
        phase: 'INITIALIZING',
        error: null
      };

    case 'CACHE_LOADED':
      console.log('🔄 AuthReducer: CACHE_LOADED', {
        sessionExists: !!action.payload.session,
        profileExists: !!action.payload.profile
      });

      const { session, profile } = action.payload;

      if (!session) {
        return {
          ...state,
          phase: 'UNAUTHENTICATED',
          user: null,
          profile: null,
          session: null
        };
      }

      return {
        ...state,
        phase: profile ? 'AUTHENTICATED' : 'LOADING', // If we have profile, we're done
        user: session.user,
        session,
        profile
      };

    case 'SESSION_LOADED':
      console.log('🔄 AuthReducer: SESSION_LOADED', {
        sessionExists: !!action.payload.session
      });

      if (!action.payload.session) {
        return {
          ...state,
          phase: 'UNAUTHENTICATED',
          user: null,
          profile: null,
          session: null
        };
      }

      return {
        ...state,
        phase: 'LOADING', // Now we need to load profile
        user: action.payload.session.user,
        session: action.payload.session,
        profile: null // Reset profile when loading new session
      };

    case 'PROFILE_LOADED':
      console.log('🔄 AuthReducer: PROFILE_LOADED', {
        profileId: action.payload.profile.id
      });

      // Only update if we have a session (should always be true)
      if (!state.session || !state.user) {
        console.error('❌ AuthReducer: Profile loaded but no session/user');
        return {
          ...state,
          phase: 'ERROR',
          error: 'Invalid state: profile loaded without session'
        };
      }

      return {
        ...state,
        phase: 'AUTHENTICATED',
        profile: action.payload.profile
      };

    case 'AUTH_COMPLETE':
      console.log('🔄 AuthReducer: AUTH_COMPLETE', {
        userId: action.payload.user.id,
        profileId: action.payload.profile.id
      });

      return {
        ...state,
        phase: 'AUTHENTICATED',
        user: action.payload.user,
        session: action.payload.session,
        profile: action.payload.profile,
        error: null
      };

    case 'AUTH_ERROR':
      console.log('🔄 AuthReducer: AUTH_ERROR', action.payload.error);
      return {
        ...state,
        phase: 'ERROR',
        error: action.payload.error
      };

    case 'UNAUTHENTICATED':
      console.log('🔄 AuthReducer: UNAUTHENTICATED');
      return {
        ...state,
        phase: 'UNAUTHENTICATED',
        user: null,
        profile: null,
        session: null,
        error: null
      };

    case 'SIGN_OUT':
      console.log('🔄 AuthReducer: SIGN_OUT');
      return {
        ...initialState,
        phase: 'UNAUTHENTICATED'
      };

    case 'CLEAR_ERROR':
      console.log('🔄 AuthReducer: CLEAR_ERROR');
      return {
        ...state,
        error: null
      };

    default:
      console.warn('❌ AuthReducer: Unknown action', action);
      return state;
  }
}

// Context interface
interface AuthContextType {
  // State
  phase: AuthPhase;
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  error: string | null;

  // Computed properties for backward compatibility
  loading: boolean;
  isAuthenticated: boolean;

  // Actions
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;

}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * New AuthProvider using useReducer for atomic state updates
 * No state synchronization issues, clear phases, proper error handling
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const initializationRef = useRef(false);
  const authListenerRef = useRef<(() => void) | null>(null);

  // Initialize authentication
  useEffect(() => {
    // Prevent double initialization
    if (initializationRef.current) return;
    initializationRef.current = true;

    console.log('🔧 AuthProvider: Initializing new authentication system');

    const initializeAuth = async () => {
      dispatch({ type: 'INITIALIZE_START' });

      // Step 1: Try to load from cache synchronously
      const cacheResult = CacheService.loadCache();

      if (cacheResult.isValid) {
        console.log('✅ AuthProvider: Cache hit - loading from cache');
        dispatch({
          type: 'CACHE_LOADED',
          payload: {
            session: cacheResult.session,
            profile: cacheResult.profile
          }
        });

        // If we have both session and profile, we're done
        if (cacheResult.session && cacheResult.profile) {
          console.log('🎯 AuthProvider: Complete cache hit - authentication ready');
          // Show welcome back notification
          const firstName = cacheResult.profile.full_name?.split(' ')[0] || 'there';
          NotificationService.success('👋 Welcome back!', `Good to see you again, ${firstName}`, 4000);
          // Track login
          AnalyticsService.login();
          return;
        }

        // If we have session but no profile, fetch profile
        if (cacheResult.session && !cacheResult.profile) {
          console.log('📡 AuthProvider: Fetching missing profile from Supabase');
          const profileResult = await AuthService.getUserProfile(cacheResult.session.user.id);

          if (profileResult.error) {
            console.error('❌ AuthProvider: Failed to fetch profile:', profileResult.error);
            dispatch({ type: 'AUTH_ERROR', payload: { error: profileResult.error } });
            return;
          }

          if (profileResult.data) {
            // Cache the profile and complete authentication
            CacheService.saveProfile(profileResult.data);
            dispatch({ type: 'PROFILE_LOADED', payload: { profile: profileResult.data } });
            console.log('✅ AuthProvider: Profile loaded and cached');
            return;
          }
        }
      }

      // Step 2: Cache miss - fetch from Supabase
      console.log('📡 AuthProvider: Cache miss - fetching from Supabase');
      const sessionResult = await AuthService.getSession();

      if (sessionResult.error) {
        console.error('❌ AuthProvider: Session fetch error:', sessionResult.error);
        NotificationService.authError(sessionResult.error);
        dispatch({ type: 'AUTH_ERROR', payload: { error: sessionResult.error } });
        return;
      }

      // Handle no session
      if (!sessionResult.data) {
        console.log('📭 AuthProvider: No active session');
        dispatch({ type: 'UNAUTHENTICATED' });
        return;
      }

      // We have a session, dispatch and fetch profile
      dispatch({ type: 'SESSION_LOADED', payload: { session: sessionResult.data } });

      // Cache the session
      CacheService.saveSession(sessionResult.data);

      // Fetch profile
      const profileResult = await AuthService.getUserProfile(sessionResult.data.user.id);

      if (profileResult.error) {
        console.error('❌ AuthProvider: Profile fetch error:', profileResult.error);
        NotificationService.authError(profileResult.error);
        dispatch({ type: 'AUTH_ERROR', payload: { error: profileResult.error } });
        return;
      }

      if (profileResult.data) {
        // Cache profile and complete authentication
        CacheService.saveProfile(profileResult.data);
        dispatch({ type: 'PROFILE_LOADED', payload: { profile: profileResult.data } });
        console.log('✅ AuthProvider: Authentication complete');

        // Show welcome notification for new sign-in
        const firstName = profileResult.data.full_name?.split(' ')[0] || 'there';
        NotificationService.authSuccess('signin', firstName);
        AnalyticsService.login();
      } else {
        NotificationService.authError('Profile not found');
        dispatch({ type: 'AUTH_ERROR', payload: { error: 'Profile not found' } });
      }
    };

    // Start initialization
    initializeAuth().catch(err => {
      console.error('❌ AuthProvider: Initialization failed:', err);
      NotificationService.authError('Authentication initialization failed');
      dispatch({ type: 'AUTH_ERROR', payload: { error: 'Authentication initialization failed' } });
    });

    // Set up auth state listener
    const unsubscribe = AuthService.onAuthStateChange(async (session) => {
      console.log('🔄 AuthProvider: Auth state changed', session ? 'Session exists' : 'No session');

      if (!session) {
        CacheService.clearCache();
        dispatch({ type: 'UNAUTHENTICATED' });
        return;
      }

      // Only update if we don't already have this session
      if (state.session?.access_token !== session.access_token) {
        dispatch({ type: 'SESSION_LOADED', payload: { session } });

        // Cache session and fetch profile
        CacheService.saveSession(session);

        const profileResult = await AuthService.getUserProfile(session.user.id);
        if (profileResult.data) {
          CacheService.saveProfile(profileResult.data);
          dispatch({ type: 'PROFILE_LOADED', payload: { profile: profileResult.data } });
        }
      }
    });

    authListenerRef.current = unsubscribe;

    // Cleanup
    return () => {
      if (authListenerRef.current) {
        authListenerRef.current();
        authListenerRef.current = null;
      }
    };
  }, []); // Only run once

  // Actions
  const signInWithGoogle = async () => {
    const result = await AuthService.signInWithGoogle();
    if (result.error) {
      NotificationService.authError(result.error);
      dispatch({ type: 'AUTH_ERROR', payload: { error: result.error } });
    }
  };

  const signOut = async () => {
    const result = await AuthService.signOut();
    CacheService.clearCache();

    if (result.error) {
      console.error('❌ AuthProvider: Sign out error:', result.error);
      NotificationService.authError(result.error);
      dispatch({ type: 'AUTH_ERROR', payload: { error: result.error } });
    } else {
      NotificationService.authSuccess('signout');
      dispatch({ type: 'SIGN_OUT' });
    }
  };

  const refreshProfile = async () => {
    if (!state.user) {
      console.warn('⚠️ AuthProvider: Cannot refresh profile - no user');
      return;
    }

    const result = await AuthService.getUserProfile(state.user.id);
    if (result.error) {
      NotificationService.authError(result.error);
      dispatch({ type: 'AUTH_ERROR', payload: { error: result.error } });
    } else if (result.data) {
      CacheService.saveProfile(result.data);
      dispatch({ type: 'PROFILE_LOADED', payload: { profile: result.data } });
      NotificationService.profileUpdate(true, 'Profile refreshed successfully');
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Context value
  const contextValue: AuthContextType = {
    // State
    phase: state.phase,
    user: state.user,
    profile: state.profile,
    session: state.session,
    error: state.error,

    // Computed properties for backward compatibility
    loading: state.phase === 'INITIALIZING' || state.phase === 'LOADING',
    isAuthenticated: state.phase === 'AUTHENTICATED',

    // Actions
    signInWithGoogle,
    signOut,
    refreshProfile,
    clearError
  };

  console.log('🔍 AuthProvider: Current state', {
    phase: state.phase,
    userExists: !!state.user,
    profileExists: !!state.profile,
    sessionExists: !!state.session,
    hasError: !!state.error
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Add display name for better debugging
useAuth.displayName = 'useAuth';
