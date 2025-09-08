import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Eye, EyeOff, Chrome } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatedNotifications } from '@/components/ui/notification';
import { MagicCard } from '@/components/magicui/magic-card';
import { useTheme } from 'next-themes';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, user, profile, notifications, addNotification, loading: authLoading } = useAuth();
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

  const validateForm = (isSignUp = false) => {
    // Check for empty fields
    if (!email.trim()) {
      addNotification({
        name: "Email Required",
        description: "Please enter your email address",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return false;
    }

    if (!password) {
      addNotification({
        name: "Password Required", 
        description: "Please enter your password",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      addNotification({
        name: "Invalid Email",
        description: "Please enter a valid email address",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return false;
    }

    // Validate password length (especially important for sign up)
    if (password.length < 6) {
      addNotification({
        name: "Password Too Short",
        description: "Password must be at least 6 characters long",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return false;
    }

    // Additional validation for sign up
    if (isSignUp && password.length < 8) {
      addNotification({
        name: "Weak Password",
        description: "For better security, use at least 8 characters",
        icon: "ALERT_TRIANGLE",
        color: "#F59E0B",
        isLogo: true
      });
      // Don't return false - this is just a warning
    }

    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submitting
    if (!validateForm(false)) {
      return;
    }
    
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    
    if (!error) {
      navigate('/welcome');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submitting (with sign-up specific checks)
    if (!validateForm(true)) {
      return;
    }
    
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    
    // Don't navigate here - OAuth will handle the redirect
    // Only stop loading if there's an error (user will stay on this page)
    if (error) {
      setGoogleLoading(false);
    }
    // If no error, user will be redirected to Google and then back to /welcome
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
          <Link to="/" className="inline-flex items-center space-x-3 mb-12">
            <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-foreground">
              EquityLeap
            </span>
          </Link>
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
                Start your investment journey with EquityLeap
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="bg-input text-base"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="bg-input pr-10 text-base"
                        autoComplete="current-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-base"
                    disabled={loading}
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>
                  
                  <Button 
                    type="button"
                    className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900 shadow-sm h-11 text-base"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {googleLoading ? "Signing in..." : "Sign in with Google"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="bg-input text-base"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        required
                        minLength={6}
                        className="bg-input pr-10 text-base"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-base"
                    disabled={loading}
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>
                  
                  <Button 
                    type="button"
                    className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900 shadow-sm h-11 text-base"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {googleLoading ? "Creating account..." : "Sign up with Google"}
                  </Button>
                </form>
                <div className="text-xs text-muted-foreground mt-2">
                  <p className="font-medium mb-1">Password requirements:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• At least 8 characters long</li>
                    <li>• One uppercase letter (A-Z)</li>
                    <li>• One lowercase letter (a-z)</li>
                    <li>• One number (0-9)</li>
                    <li>• One special character (@$!%*?&)</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  By creating an account, you agree to our Terms of Service and Privacy Policy
                </p>
              </TabsContent>
            </Tabs>
            </CardContent>
          </MagicCard>
        </Card>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to Home
          </Link>
        </div>
      </div>
      
      {/* Animated Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50">
          <AnimatedNotifications notifications={notifications} />
        </div>
      )}
    </div>
  );
};

export default Auth;