import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, TrendingUp, Shield, Users, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-image.jpg";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 hero-gradient rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">EquityLeap</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/auth">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url('https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop')` 
          }}
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95" />
        
        <div className="relative container mx-auto px-4 py-24 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Fractional Property
            <span className="block text-primary">Investment</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-200 mb-8 max-w-3xl mx-auto leading-relaxed">
            Invest in premium real estate with as little as $100. 
            Professional management, transparent returns, and seamless trading.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/auth">
              <Button size="lg" className="bg-primary text-white hover:bg-primary/80 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 px-8 py-3">
                Start Investing <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-slate-900 px-8 py-3">
              View Properties
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose EquityLeap?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional-grade property investment platform with institutional-quality opportunities
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="investment-card border-border/50">
              <CardHeader className="text-center">
                <TrendingUp className="w-16 h-16 text-primary mx-auto mb-4" />
                <CardTitle>High Returns</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Target 8-12% annual returns through carefully selected premium properties
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="investment-card border-border/50">
              <CardHeader className="text-center">
                <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
                <CardTitle>Secure Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Bank-grade security, full KYC compliance, and regulated investment framework
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="investment-card border-border/50">
              <CardHeader className="text-center">
                <Users className="w-16 h-16 text-primary mx-auto mb-4" />
                <CardTitle>Low Minimums</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Start with just $100 and build your real estate portfolio gradually
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="investment-card border-border/50">
              <CardHeader className="text-center">
                <BarChart3 className="w-16 h-16 text-primary mx-auto mb-4" />
                <CardTitle>Easy Trading</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Trade your property shares like stocks with our intuitive platform
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              Get started in minutes with our simple process
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-2xl font-semibold mb-4">Sign Up & Verify</h3>
              <p className="text-muted-foreground">
                Create your account, complete KYC verification, and start your free trial
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-2xl font-semibold mb-4">Browse Properties</h3>
              <p className="text-muted-foreground">
                Explore vetted properties with detailed analytics and investment projections
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-2xl font-semibold mb-4">Invest & Earn</h3>
              <p className="text-muted-foreground">
                Buy shares, track performance, and receive regular dividend payments
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Investing?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of investors building wealth through fractional real estate
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-primary text-white hover:bg-primary/80">
              Get Started Today <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold">EquityLeap</span>
            </div>
            <p className="text-muted-foreground">
              © 2024 EquityLeap. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;