import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/NewAuthContext';
import { useAdmin } from '@/hooks/useNewAdmin';

/**
 * Loading screen component - shows during INITIALIZING and LOADING phases
 */
export const LoadingScreen = ({ message = "Loading..." }: { message?: string }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
          <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

/**
 * Error screen component - shows during ERROR phase
 */
export const ErrorScreen = ({ onRetry }: { onRetry?: () => void }) => {
  const { error, clearError } = useAuth();

  const handleRetry = () => {
    clearError();
    if (onRetry) {
      onRetry();
    } else {
      // Reload the page as fallback
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 bg-destructive rounded-xl flex items-center justify-center mx-auto mb-4">
          <span className="text-destructive-foreground text-xl">⚠️</span>
        </div>
        <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
        <p className="text-muted-foreground mb-4">
          {error || 'Something went wrong with authentication.'}
        </p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

/**
 * Auth guard that handles all loading states and redirects
 */
interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  fallbackPath?: string;
}

export const AuthGuard = ({
  children,
  requireAuth = false,
  requireAdmin = false,
  fallbackPath = '/auth'
}: AuthGuardProps) => {
  const { phase, user, profile, error } = useAuth();
  const { isAdmin } = useAdmin();

  // Show loading screen during initialization and loading
  if (phase === 'INITIALIZING') {
    return <LoadingScreen message="Initializing..." />;
  }

  if (phase === 'LOADING') {
    return <LoadingScreen message="Loading your account..." />;
  }

  // Show error screen on error
  if (phase === 'ERROR') {
    return <ErrorScreen />;
  }

  // Handle authentication requirements
  if (requireAuth && phase === 'UNAUTHENTICATED') {
    return <Navigate to={fallbackPath} replace />;
  }

  // Handle admin requirements
  if (requireAdmin && (!user || !isAdmin)) {
    if (phase === 'UNAUTHENTICATED') {
      return <Navigate to="/auth" replace />;
    }
    // User is authenticated but not admin
    return <Navigate to="/dashboard/overview" replace />;
  }

  // All checks passed, render children
  return <>{children}</>;
};

/**
 * Route guard for pages that require authentication
 */
export const AuthenticatedRoute = ({ children }: { children: ReactNode }) => {
  return (
    <AuthGuard requireAuth={true}>
      {children}
    </AuthGuard>
  );
};

/**
 * Route guard for pages that require admin privileges
 */
export const AdminRoute = ({ children }: { children: ReactNode }) => {
  return (
    <AuthGuard requireAuth={true} requireAdmin={true}>
      {children}
    </AuthGuard>
  );
};

/**
 * Route guard for pages that should redirect authenticated users
 * (like login page)
 */
export const UnauthenticatedRoute = ({
  children,
  redirectTo = '/welcome'
}: {
  children: ReactNode;
  redirectTo?: string;
}) => {
  const { phase } = useAuth();

  // Show loading during initialization
  if (phase === 'INITIALIZING' || phase === 'LOADING') {
    return <LoadingScreen />;
  }

  // Show error screen on error
  if (phase === 'ERROR') {
    return <ErrorScreen />;
  }

  // Redirect authenticated users
  if (phase === 'AUTHENTICATED') {
    return <Navigate to={redirectTo} replace />;
  }

  // User is unauthenticated, show children (like login form)
  return <>{children}</>;
};

/**
 * Simple loading boundary for components that need to wait for auth
 */
export const AuthLoadingBoundary = ({
  children,
  fallback = <LoadingScreen />
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const { phase } = useAuth();

  if (phase === 'INITIALIZING' || phase === 'LOADING') {
    return <>{fallback}</>;
  }

  if (phase === 'ERROR') {
    return <ErrorScreen />;
  }

  return <>{children}</>;
};