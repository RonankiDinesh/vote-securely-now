import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Vote, Calendar, Clock, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { OtpVerification } from '@/components/OtpVerification';
import { supabase } from '@/integrations/supabase/client';

interface Election {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'upcoming' | 'ended';
  start_time: string;
  end_time: string;
}

interface VotedElection {
  election_id: string;
}

const Dashboard = () => {
  const { user, loading, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<{ email: string; phone: string | null } | null>(null);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [elections, setElections] = useState<Election[]>([]);
  const [votedElections, setVotedElections] = useState<string[]>([]);
  const [isLoadingElections, setIsLoadingElections] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Check if user is verified and get profile
  useEffect(() => {
    const checkVerification = async () => {
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('verified, email, phone')
        .eq('id', user.id)
        .single();

      if (!error && profile) {
        setIsVerified(profile.verified ?? false);
        setUserProfile({ email: profile.email, phone: profile.phone });
      }
    };

    checkVerification();
  }, [user]);

  // Fetch elections and user's voted elections
  useEffect(() => {
    const fetchElections = async () => {
      if (!user) return;

      setIsLoadingElections(true);
      try {
        // Fetch elections (active, upcoming, ended)
        const { data: electionsData, error: electionsError } = await supabase
          .from('elections')
          .select('id, title, description, status, start_time, end_time')
          .in('status', ['active', 'upcoming', 'ended'])
          .order('start_time', { ascending: false });

        if (!electionsError && electionsData) {
          setElections(electionsData);
        }

        // Fetch user's votes
        const { data: votesData } = await supabase
          .from('votes')
          .select('election_id')
          .eq('user_id', user.id);

        if (votesData) {
          setVotedElections(votesData.map(v => v.election_id));
        }
      } catch (error) {
        console.error('Error fetching elections:', error);
      } finally {
        setIsLoadingElections(false);
      }
    };

    fetchElections();
  }, [user]);

  const handleVerified = async () => {
    setIsVerified(true);
    setShowOtpVerification(false);
    await refreshSession();
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  // Show OTP verification modal
  if (showOtpVerification && user && userProfile) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center min-h-[60vh]">
          <OtpVerification
            userId={user.id}
            email={userProfile.email}
            phone={userProfile.phone ?? undefined}
            onVerified={handleVerified}
            onSkip={() => setShowOtpVerification(false)}
          />
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'upcoming': return 'bg-warning/10 text-warning border-warning/20';
      case 'ended': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Vote;
      case 'upcoming': return Clock;
      case 'ended': return CheckCircle;
      default: return Calendar;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const hasVoted = (electionId: string) => votedElections.includes(electionId);

  return (
    <Layout>
      <div className="container py-8 lg:py-12">
        {/* Verification banner */}
        {isVerified === false && (
          <Card className="mb-6 border-warning/30 bg-warning/5">
            <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium">Verify your identity to vote</p>
                  <p className="text-sm text-muted-foreground">Complete OTP verification to participate in elections</p>
                </div>
              </div>
              <Button onClick={() => setShowOtpVerification(true)}>
                Verify Now
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Elections</h1>
          <p className="text-muted-foreground">View and participate in active elections</p>
        </div>

        {isLoadingElections ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {elections.map((election) => {
              const StatusIcon = getStatusIcon(election.status);
              const userHasVoted = hasVoted(election.id);
              return (
                <Card key={election.id} variant="interactive">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight">{election.title}</CardTitle>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(election.status)}`}>
                        <StatusIcon className="h-3 w-3" />
                        {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(election.start_time)} - {formatDate(election.end_time)}</span>
                      </div>
                      {userHasVoted && election.status === 'active' && (
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle className="h-4 w-4" />
                          <span>You have voted</span>
                        </div>
                      )}
                    </div>
                    {election.status === 'active' ? (
                      userHasVoted ? (
                        <Button className="w-full" variant="secondary" disabled>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Vote Cast
                        </Button>
                      ) : isVerified === false ? (
                        <Button 
                          className="w-full" 
                          variant="secondary"
                          onClick={() => setShowOtpVerification(true)}
                        >
                          Verify to Vote
                        </Button>
                      ) : (
                        <Link to={`/vote/${election.id}`}>
                          <Button className="w-full" variant="hero">
                            <Vote className="h-4 w-4 mr-2" />
                            Vote Now
                          </Button>
                        </Link>
                      )
                    ) : election.status === 'upcoming' ? (
                      <Button className="w-full" variant="secondary" disabled>
                        Coming Soon
                      </Button>
                    ) : (
                      <Button className="w-full" variant="secondary" disabled>
                        View Results
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!isLoadingElections && elections.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Vote className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">No Elections Available</h3>
              <p className="text-muted-foreground">Check back later for upcoming elections.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
