import { Vote, Shield, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
                <Vote className="h-5 w-5 text-primary-foreground" />
              </div>
              VoteSecure
            </Link>
            <p className="text-muted-foreground text-sm max-w-md">
              A secure, transparent, and accessible online voting platform for organizations, 
              colleges, and communities. Your vote matters, and we protect it.
            </p>
            <div className="flex gap-4 mt-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 text-accent" />
                Secure Authentication
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-4 w-4 text-accent" />
                End-to-End Encryption
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-display font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/dashboard" className="hover:text-foreground transition-colors">Elections</Link></li>
              <li><Link to="/history" className="hover:text-foreground transition-colors">Vote History</Link></li>
              <li><Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-display font-semibold mb-4">Security</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>OTP Verification</li>
              <li>Audit Logging</li>
              <li>Vote Secrecy</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} VoteSecure. All rights reserved. Built with security in mind.</p>
        </div>
      </div>
    </footer>
  );
};
