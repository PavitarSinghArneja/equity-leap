import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MagicCard } from '@/components/magicui/magic-card';
import { useTheme } from 'next-themes';

const Auth = () => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithGoogle, user, profile, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated users to appropriate page, but only after auth loading is complete
    if (!authLoading && user && profile) {
      // Check if trial has expired
      if (!profile.subscription_active) {
        const trialExpires = new Date(profile.trial_expires_at);
        const now = new Date();
        
        if (now > trialExpires) {
          navigate('/trial-expired');
          return;
        }
      }
      
      navigate('/welcome');
    }
  }, [user, profile, authLoading, navigate]);


  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    // OAuth will handle the redirect - loading state will reset when component unmounts or redirects
  };

  // Show loading spinner while auth context is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-7 h-7 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 hero-gradient opacity-5" />
      
      <div className="relative w-full max-w-md z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome</h1>
          <p className="text-muted-foreground">
            Sign in to your account or create a new one to get started
          </p>
        </div>

        <Card className="p-0 max-w-md w-full shadow-none border-none">
          <MagicCard
            gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
            className="p-0"
          >
            <CardHeader className="border-b border-border p-6 text-center">
              <CardTitle>Access Your Account</CardTitle>
              <CardDescription>
                Start your investment journey with Retreat Slice
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <p className="text-center text-muted-foreground text-sm">
                  Sign in to your account or create a new one
                </p>

                <Button
                  type="button"
                  className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900 shadow-sm h-12 text-base"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {googleLoading ? "Signing in..." : "Continue with Google"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </CardContent>
          </MagicCard>
        </Card>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
