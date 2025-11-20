import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle2,
  PlayCircle,
  BookOpen,
  HelpCircle,
  GraduationCap,
  Search,
  ShieldCheck,
  TrendingUp,
  LogOut,
  MapPin,
  Star,
  ChevronDown,
  Hotel,
  Building2,
  Users,
  DollarSign
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/NewAuthContext";
import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LandingPage = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!loading && user && profile) {
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
  }, [user, profile, loading, navigate]);

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary-light to-secondary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                <Hotel className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground">
                Retreat Slice
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/properties" className="text-foreground hover:text-primary transition-colors font-medium">
                Properties
              </Link>
              <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors font-medium">
                How It Works
              </a>
              <a href="#benefits" className="text-foreground hover:text-primary transition-colors font-medium">
                Benefits
              </a>
              <a href="#seminar" className="text-foreground hover:text-primary transition-colors font-medium">
                Seminar
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/auth">
                <Button className="bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary shadow-lg shadow-primary/30">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071&auto=format&fit=crop"
            alt="Luxury Villa"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto px-4 py-20 text-center text-white">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />
            <span className="text-sm font-medium">Fractional Hospitality Ownership Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight tracking-tight">
            Co-Own Luxury <br />
            <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-light">
              Retreats
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed">
            Invest in premium holiday homes, earn rental income, and enjoy exclusive stays.
            <br className="hidden md:block" />
            Start your journey with just <span className="text-primary font-bold">₹5 Lakhs</span>.
          </p>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-primary mb-1">₹250Cr</div>
              <div className="text-sm text-gray-300">Assets Under Management</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-primary mb-1">12+</div>
              <div className="text-sm text-gray-300">Active Retreats</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-primary mb-1">100%</div>
              <div className="text-sm text-gray-300">Escrow Protected</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/properties">
              <Button size="lg" className="bg-primary hover:bg-primary-dark text-white px-8 py-6 text-lg rounded-full shadow-lg shadow-primary/25 transition-all hover:scale-105">
                Explore Projects
              </Button>
            </Link>
            <a href="#seminar">
              <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 px-8 py-6 text-lg rounded-full transition-all">
                Join Free Seminar
              </Button>
            </a>
            <Link to="/auth">
              <Button variant="ghost" className="text-white hover:text-primary hover:bg-white/10 px-6 py-6 text-lg rounded-full">
                Sign Up Free <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* The Dual Advantage */}
      <section id="benefits" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">The Dual Advantage</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Why settle for just returns when you can have a lifestyle upgrade too?
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Investment Side */}
            <div className="bg-card rounded-3xl p-8 border border-border shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-6">Why Retreat Slice?</h3>
              <ul className="space-y-4">
                {[
                  "Backed by Top Hospitality Experts",
                  "High Rental Yields (8-12%)",
                  "Capital Appreciation Potential",
                  "Hassle-Free Management",
                  "Transparent Exit Options"
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-muted-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Lifestyle Side */}
            <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-6">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-6">Your Lifestyle Perks</h3>
              <ul className="space-y-4">
                {[
                  "Free Annual Stays (7 Days/Year)",
                  "Exchange Stays Globally",
                  "VIP Concierge Service",
                  "Exclusive Owner Events",
                  "Discounts on F&B and Spa"
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-muted-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Learn Before You Invest */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-4">Learn Before You Invest</h2>
              <p className="text-muted-foreground text-lg">
                Empowering you with knowledge to make smart decisions.
              </p>
            </div>
            <Button variant="outline" className="mt-4 md:mt-0">
              Visit Knowledge Hub <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-all cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <PlayCircle className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>What is Fractional Ownership?</CardTitle>
                <CardDescription>Video • 5 Mins</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Understand the basics of co-ownership and how it differs from timeshare.
                </p>
                <span className="text-primary font-medium group-hover:underline">Watch Now</span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Complete Investment Guide</CardTitle>
                <CardDescription>Article • 10 Mins Read</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  A deep dive into legal structures, returns, and exit strategies.
                </p>
                <span className="text-primary font-medium group-hover:underline">Read Article</span>
              </CardContent>
            </Card>

            <Card className="bg-primary/20 border-primary/30 hover:shadow-lg transition-all cursor-pointer">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/30 rounded-full flex items-center justify-center mb-4">
                  <HelpCircle className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Still Have Questions?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Schedule a 1-on-1 call with our investment experts.
                </p>
                <Button className="w-full bg-primary text-white hover:bg-primary-dark">
                  Book Consultation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">
              Your seamless journey to hospitality ownership.
            </p>
          </div>

          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative z-10">
              {[
                { icon: GraduationCap, title: "Educate", desc: "Attend our seminars" },
                { icon: Search, title: "Browse", desc: "Select verified retreats" },
                { icon: ShieldCheck, title: "Invest", desc: "Secure via Escrow" },
                { icon: TrendingUp, title: "Earn", desc: "Rent + Stay Benefits" },
                { icon: LogOut, title: "Track", desc: "Exit Transparently" },
              ].map((step, i) => (
                <div key={i} className="bg-background p-6 rounded-xl border border-border text-center hover:border-primary transition-colors">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Investment Opportunities */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Featured Opportunities</h2>
            <p className="text-muted-foreground text-lg">
              Handpicked high-yield properties open for investment.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Goa Beachfront Villas",
                loc: "North Goa",
                img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
                yield: "9.2%",
                irr: "14.5%",
                occ: "85%"
              },
              {
                title: "Coorg Mountain Resort",
                loc: "Coorg, Karnataka",
                img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop",
                yield: "8.5%",
                irr: "13.8%",
                occ: "78%"
              },
              {
                title: "Alibaug Boutique Stay",
                loc: "Alibaug, Maharashtra",
                img: "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=2025&auto=format&fit=crop",
                yield: "10.1%",
                irr: "15.2%",
                occ: "90%"
              }
            ].map((prop, i) => (
              <Card key={i} className="overflow-hidden hover:shadow-xl transition-all group">
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={prop.img} 
                    alt={prop.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-primary uppercase tracking-wide">
                    Open Now
                  </div>
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="mb-1">{prop.title}</CardTitle>
                      <CardDescription className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" /> {prop.loc}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Yield</div>
                      <div className="font-bold text-primary">{prop.yield}</div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Target IRR</div>
                      <div className="font-bold text-primary">{prop.irr}</div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Occupancy</div>
                      <div className="font-bold text-primary">{prop.occ}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-t pt-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Min Investment</div>
                      <div className="font-bold">₹5,00,000</div>
                    </div>
                    <Button>View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/properties">
              <Button variant="outline" size="lg">View All Properties</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Join Our Free Seminar */}
      <section id="seminar" className="py-24 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="text-white">
              <div className="inline-block px-4 py-1 bg-white/20 rounded-full text-sm font-medium mb-6">
                Limited Seats Available
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Master Fractional Ownership
              </h2>
              <p className="text-xl text-primary-foreground/90 mb-8">
                Join our exclusive webinar to learn how the top 1% invest in hospitality.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Market Trends & Analysis",
                  "How to Evaluate Properties",
                  "Tax Implications & Benefits",
                  "Q&A with Industry Experts"
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-white">
                    <CheckCircle2 className="w-5 h-5 mr-3 text-white" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Card className="p-8 shadow-2xl">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-2xl">Reserve Your Spot</CardTitle>
                <CardDescription>Next Session: Saturday, 11:00 AM IST</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+91 98765 43210" />
                </div>
                <Button className="w-full text-lg py-6 mt-4">Register Now</Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  By registering, you agree to our Terms & Privacy Policy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Built on Transparency */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Trust Built on Transparency</h2>
            <p className="text-muted-foreground text-lg">
              Your security is our top priority.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Escrow Protected</h3>
              <p className="text-muted-foreground">
                All funds are routed through a SEBI-regulated trusteeship to ensure 100% safety.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">SPV Ownership</h3>
              <p className="text-muted-foreground">
                Each property is held in a separate Special Purpose Vehicle (LLP/Pvt Ltd) where you hold shares.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Audited Reporting</h3>
              <p className="text-muted-foreground">
                Quarterly performance reports and annual financial audits by top-tier firms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fees & What We Earn */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Transparent Fee Structure</h2>
            <p className="text-muted-foreground text-lg">
              We only win when you win.
            </p>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Fee Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Platform / Upfront Fee</TableCell>
                  <TableCell>2 - 3%</TableCell>
                  <TableCell className="text-muted-foreground">One-time fee on investment amount for deal sourcing and legal setup.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Annual Management Fee</TableCell>
                  <TableCell>1%</TableCell>
                  <TableCell className="text-muted-foreground">Of the asset value, for ongoing administration and reporting.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Performance Carry</TableCell>
                  <TableCell>10%</TableCell>
                  <TableCell className="text-muted-foreground">Charged ONLY on profits above a hurdle rate of 10% IRR.</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </div>
      </section>

      {/* Real Experiences */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Real Experiences</h2>
            <p className="text-muted-foreground text-lg">
              Hear from our community of 1,200+ investors.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Rajesh K.",
                role: "Tech Entrepreneur",
                text: "I've always wanted a holiday home in Goa but the maintenance was a nightmare. Retreat Slice solved that perfectly. I enjoy the stays and the returns are a bonus!",
                loc: "Bangalore"
              },
              {
                name: "Priya M.",
                role: "Marketing Director",
                text: "The transparency is what sold me. The dashboard is intuitive, and I can see exactly how my property is performing every month.",
                loc: "Mumbai"
              },
              {
                name: "Amit S.",
                role: "Investment Banker",
                text: "As a finance professional, I appreciate the SPV structure and the due diligence. It's a great diversification tool for my portfolio.",
                loc: "Delhi"
              }
            ].map((testi, i) => (
              <Card key={i} className="bg-muted/20 border-none shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">"{testi.text}"</p>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center font-bold text-primary mr-3">
                      {testi.name[0]}
                    </div>
                    <div>
                      <div className="font-bold">{testi.name}</div>
                      <div className="text-xs text-muted-foreground">{testi.role}, {testi.loc}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>What is the minimum investment?</AccordionTrigger>
              <AccordionContent>
                The minimum investment amount typically starts at ₹5 Lakhs per property, allowing you to own a fractional share of a premium asset.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>How do I exit my investment?</AccordionTrigger>
              <AccordionContent>
                We offer a secondary marketplace where you can list your shares for sale. Additionally, assets are typically held for 5-7 years before a strategic sale is voted on by all owners.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Can I stay at my property?</AccordionTrigger>
              <AccordionContent>
                Yes! As an owner, you are entitled to a certain number of free stay nights per year (typically 7 days), subject to availability and booking rules.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Who manages the property?</AccordionTrigger>
              <AccordionContent>
                Retreat Slice partners with professional hospitality management companies to handle all day-to-day operations, maintenance, and guest services.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Hotel className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">
                  Retreat Slice
                </span>
              </div>
              <p className="text-sm leading-relaxed mb-6">
                Democratizing hospitality real estate investment through fractional ownership.
              </p>
              <div className="flex space-x-4">
                {/* Social Icons Placeholders */}
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary transition-colors cursor-pointer">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary transition-colors cursor-pointer">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" /></svg>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/properties" className="hover:text-primary transition-colors">Browse Properties</Link></li>
                <li><a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a></li>
                <li><Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/learn" className="hover:text-primary transition-colors">Learn Center</Link></li>
                <li><Link to="/support" className="hover:text-primary transition-colors">Support</Link></li>
                <li><a href="#seminar" className="hover:text-primary transition-colors">Seminars</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Risk Disclosure</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm mb-4 md:mb-0">
              © 2024 Retreat Slice. All rights reserved.
            </p>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Back to Top <ChevronDown className="ml-2 w-4 h-4 rotate-180" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
