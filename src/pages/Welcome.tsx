import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Building, 
  GraduationCap,
  Scale,
  Mail,
  Crown,
  Clock,
  LogOut,
  Bell
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Welcome = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
  }, [user, loading, navigate]);

  const getTrialDaysLeft = () => {
    if (!profile) return 0;
    const trialExpires = new Date(profile.trial_expires_at);
    const now = new Date();
    const diffTime = trialExpires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  if (loading) {
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">EquityLeap</span>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Home
            </Button>
            <Button 
              variant="ghost" 
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/properties')}
            >
              Properties
            </Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Learn
            </Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Support
            </Button>
          </nav>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Bell className="w-4 h-4" />
            </Button>
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Welcome, {getUserDisplayName()}!
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Your complimentary 14-day trial is active. Explore our features and upgrade to unlock your full investment potential.
          </p>
          
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-primary" />
            <Badge variant="outline" className="text-primary border-primary">
              {getTrialDaysLeft()} Days Left
            </Badge>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Wealth Projector */}
          <Card className="investment-card group cursor-pointer hover:border-primary/50 transition-all duration-200">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Wealth Projector</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Estimate your potential returns and project your investment growth over time.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Browse Properties */}
          <Card className="investment-card group cursor-pointer hover:border-primary/50 transition-all duration-200">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Building className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Browse Properties</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription className="text-base leading-relaxed">
                View our portfolio of available properties. Full details are available upon upgrade.
              </CardDescription>
              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                Read-Only
              </Badge>
            </CardContent>
          </Card>

          {/* Educational Seminars */}
          <Card className="investment-card group cursor-pointer hover:border-primary/50 transition-all duration-200">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Educational Seminars</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Access our library of webinars and articles to sharpen your investment knowledge.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Legal Assistance */}
          <Card className="investment-card group cursor-pointer hover:border-primary/50 transition-all duration-200">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Scale className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Legal Assistance</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Get guidance on the legal aspects of fractional property investment.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Email Support */}
          <Card className="investment-card group cursor-pointer hover:border-primary/50 transition-all duration-200">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Email Support</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Have questions? Our dedicated support team is here to assist you via email.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Upgrade Account */}
          <Card className="investment-card group cursor-pointer hover:border-primary/50 transition-all duration-200 border-primary/30 bg-primary/5">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Upgrade Account</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed mb-4">
                Unlock full access to property investments, advanced tools, and premium support.
              </CardDescription>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Upgrade Now
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <Card className="investment-card bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="pt-8 pb-8">
              <h2 className="text-2xl font-bold mb-4">Ready to Start Your Investment Journey?</h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Upgrade your account to access our full suite of investment tools and start building your real estate portfolio today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Account
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/properties')}
                >
                  <Building className="w-4 h-4 mr-2" />
                  Browse Properties
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Welcome;