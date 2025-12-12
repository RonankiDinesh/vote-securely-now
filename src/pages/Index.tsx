import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Layout } from '@/components/layout/Layout';
import { Vote, Shield, Clock, CheckCircle, Users, BarChart3 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const Index = () => {
  const { user } = useAuth();

  const features = [
    { icon: Shield, title: 'OTP Verification', description: 'Two-factor authentication via email or SMS ensures only verified voters can participate.' },
    { icon: Vote, title: 'One Vote Per Person', description: 'Unique constraints prevent duplicate voting while maintaining ballot secrecy.' },
    { icon: Clock, title: 'Real-time Results', description: 'Watch election results update live as votes are cast and counted.' },
    { icon: CheckCircle, title: 'Vote Receipt', description: 'Receive a unique token confirming your vote was recorded without revealing your choice.' },
    { icon: Users, title: 'Easy Voter Management', description: 'Admins can upload voter lists via CSV and manage election participants.' },
    { icon: BarChart3, title: 'Audit Logging', description: 'Complete audit trail of all system events for transparency and security.' },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyek0zNiA0NHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="container relative py-24 lg:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent-foreground mb-6 animate-fade-in">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Secure & Transparent Voting</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Online Voting Made{' '}
              <span className="text-accent">Simple & Secure</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              A trusted platform for college elections, corporate polls, and community voting. 
              OTP-verified, auditable, and designed for transparency.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
              {user ? (
                <Link to="/dashboard">
                  <Button size="xl" variant="accent">
                    <Vote className="h-5 w-5" />
                    View Elections
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth?mode=register">
                    <Button size="xl" variant="accent">
                      Get Started Free
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="xl" variant="glass">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Everything You Need for{' '}
              <span className="text-accent">Secure Elections</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Built with security and transparency at its core. Every vote counts, every vote is protected.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                variant="interactive"
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent mb-4">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <Card variant="elevated" className="overflow-hidden">
            <div className="gradient-primary p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-4">
                Ready to Run Your First Election?
              </h2>
              <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
                Set up your organization's secure voting in minutes. No technical expertise required.
              </p>
              <Link to={user ? "/dashboard" : "/auth?mode=register"}>
                <Button size="lg" variant="accent">
                  {user ? "Go to Dashboard" : "Create Free Account"}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
