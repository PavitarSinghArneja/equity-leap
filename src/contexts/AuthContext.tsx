import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/use-notifications';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  tier: 'explorer' | 'waitlist_player' | 'small_investor' | 'large_investor';
  kyc_status: 'pending' | 'under_review' | 'approved' | 'rejected';
  trial_expires_at: string;
  subscription_active: boolean;
  is_admin?: boolean;
  tier_override_by_admin?: boolean;
}

interface NotificationItem {
  name: string;
  description: string;
  icon: string;
  color: string;
  isLogo?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  notifications: Array<NotificationItem & { id: string; time: string }>;
  addNotification: (notification: NotificationItem) => void;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastNotifiedUser, setLastNotifiedUser] = useState<string | null>(null);
  const [hasShownWelcomeThisSession, setHasShownWelcomeThisSession] = useState<boolean>(false);
  const { notifications, addNotification } = useNotifications();

  const fetchUserProfile = async (userId: string, retries = 3) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);

      // If no profile found and we have retries left (common after OAuth signup)
      if (!data && retries > 0) {
        console.log('Profile not found, retrying in 1 second...');
        setTimeout(() => {
          fetchUserProfile(userId, retries - 1);
        }, 1000);
        return;
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // If profile fetch fails and we have retries, try again
      if (retries > 0) {
        setTimeout(() => {
          fetchUserProfile(userId, retries - 1);
        }, 1000);
      }
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  }, [user]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
        // Check if we've already shown welcome notification for this session
        const sessionKey = `welcome_shown_${session.user.id}`;
        const hasShownThisSession = sessionStorage.getItem(sessionKey);
        if (hasShownThisSession) {
          setHasShownWelcomeThisSession(true);
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Handle different auth events with notifications
        if (event === 'SIGNED_IN' && session?.user) {
          // User signed in successfully (including email verification and OAuth)
          // Set loading to true while fetching profile
          setLoading(true);
          await fetchUserProfile(session.user.id);
          
          // Check if we've already shown welcome notification for this session
          const sessionKey = `welcome_shown_${session.user.id}`;
          const hasShownThisSession = sessionStorage.getItem(sessionKey);
          
          // Only show notification if we haven't shown it in this browser session
          if (!hasShownThisSession && !hasShownWelcomeThisSession) {
            setHasShownWelcomeThisSession(true);
            sessionStorage.setItem(sessionKey, 'true');
            
            // Check if this is a new user (Google sign-up)
            const isNewUser = session.user.created_at && 
              new Date(session.user.created_at).getTime() > (Date.now() - 10000); // Within last 10 seconds
            
            // Check if this is Google OAuth (has provider metadata)
            const isGoogleAuth = session.user.app_metadata?.provider === 'google';
            
            if (isGoogleAuth && isNewUser) {
              // Google Sign-Up (new account)
              addNotification({
                name: "Welcome to Retreat Slice! 🎉",
                description: "Your Google account has been connected successfully",
                icon: "GOOGLE",
                color: "#4285F4",
                isLogo: true
              });
            } else if (isGoogleAuth && !isNewUser) {
              // Google Sign-In (existing account)
              addNotification({
                name: "Welcome Back! 👋",
                description: "Successfully signed in with Google",
                icon: "GOOGLE",
                color: "#4285F4",
                isLogo: true
              });
            } else if (session.user.email_confirmed_at && !user) {
              // Email verification
              addNotification({
                name: "Email Verified! ✅",
                description: "Your account is now verified and ready to use",
                icon: "CHECK_CIRCLE",
                color: "#059669",
                isLogo: true
              });
            }
          }

          // Set loading to false after profile is fetched and notifications are processed
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setHasShownWelcomeThisSession(false);
          // Clear welcome notification flags from sessionStorage
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('welcome_shown_')) {
              sessionStorage.removeItem(key);
            }
          });
        } else if (event === 'TOKEN_REFRESHED') {
          // Token was refreshed successfully (silent)
        } else if (event === 'USER_UPDATED') {
          // User data was updated
          if (session?.user) {
            setTimeout(() => {
              fetchUserProfile(session.user.id);
            }, 0);
          }
        }

        // Only set loading to false if this is not a SIGNED_IN event
        // For SIGNED_IN, loading is set to false after profile is fetched
        if (event !== 'SIGNED_IN') {
          setLoading(false);
        }
      }
    );

    // Proactive refresh to keep sessions alive for long-lived browser tabs
    // Auto-refresh is enabled by the client, but this is a safety net to ensure
    // the session stays valid for extended periods (e.g., 24 hours+).
    const refreshInterval = setInterval(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await supabase.auth.refreshSession();
        }
      } catch (e) {
        // Best-effort; errors here should not disrupt the UX
      }
    }, 1000 * 60 * 30); // every 30 minutes

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/welcome`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      // Handle different signup error types with specific messages
      let errorMessage = error.message;
      let icon = "🚫";
      
      if (error.message.includes("already registered")) {
        errorMessage = "This email is already registered. Try signing in instead.";
        icon = "📧";
      } else if (error.message.includes("invalid email")) {
        errorMessage = "Please enter a valid email address";
        icon = "📝";
      } else if (error.message.includes("password")) {
        errorMessage = "Password must be at least 6 characters long";
        icon = "🔒";
      }
      
      addNotification({
        name: "Registration Failed",
        description: errorMessage,
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } else {
              addNotification({
                name: "Welcome to Retreat Slice! 🎉",
                description: "Check your email to verify your account and get started",
                icon: "CHECK_CIRCLE",
                color: "#059669",
                isLogo: true
              });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // Handle different signin error types with specific messages
      let errorMessage = error.message;
      let icon = "🚫";
      
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please check and try again.";
        icon = "🔐";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Please check your email and verify your account first";
        icon = "📬";
      } else if (error.message.includes("too many requests")) {
        errorMessage = "Too many login attempts. Please wait a moment and try again.";
        icon = "⏳";
      } else if (error.message.includes("invalid email")) {
        errorMessage = "Please enter a valid email address";
        icon = "📝";
      }
      
      addNotification({
        name: "Sign In Failed",
        description: errorMessage,
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } else {
      // Don't show immediate notification - let onAuthStateChange handle it
      // This prevents duplicate notifications
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    // Show loading notification for Google OAuth
    addNotification({
      name: "Connecting to Google...",
      description: "Opening Google authentication window",
      icon: "GOOGLE",
      color: "#4285F4",
      isLogo: true
    });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/welcome`
      }
    });

    if (error) {
      let errorMessage = error.message;
      let icon = "🚫";
      
      if (error.message.includes('provider is not enabled')) {
        errorMessage = "Google sign-in is temporarily unavailable. Please use email/password.";
        icon = "GOOGLE";
      } else if (error.message.includes('popup')) {
        errorMessage = "Google sign-in popup was blocked. Please allow popups and try again.";
        icon = "GOOGLE";
      } else if (error.message.includes('network')) {
        errorMessage = "Network error. Please check your connection and try again.";
        icon = "GOOGLE";
      } else if (error.message.includes('cancelled')) {
        errorMessage = "Google sign-in was cancelled. Please try again if you want to continue.";
        icon = "GOOGLE";
      }
      
      addNotification({
        name: "Google Authentication Failed",
        description: errorMessage,
        icon: icon === "GOOGLE" ? "GOOGLE" : "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    }
    // Success case handled by onAuthStateChange listener

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      addNotification({
        name: "Sign Out Failed",
        description: "There was an issue signing you out. Please try again.",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } else {
      addNotification({
        name: "See You Soon! 👋",
        description: "Successfully signed out. Thanks for using Retreat Slice!",
        icon: "CHECK_CIRCLE",
        color: "#D97706",
        isLogo: true
      });
      setProfile(null);
      setHasShownWelcomeThisSession(false);
      
      // Clear welcome notification flags from sessionStorage
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('welcome_shown_')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Delay redirect to allow notification to show
      setTimeout(() => {
        // Use window.location for sign out to ensure a clean state
        window.location.href = '/';
      }, 2000);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      notifications,
      addNotification,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
