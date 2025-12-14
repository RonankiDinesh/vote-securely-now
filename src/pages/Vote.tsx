import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, User, AlertCircle, Loader2, Vote as VoteIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Election {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'upcoming' | 'ended';
  start_time: string;
  end_time: string;
}

interface Candidate {
  id: string;
  name: string;
  bio: string | null;
  image_url: string | null;
  position: number | null;
}

const VotePage = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Check verification status
  useEffect(() => {
    const checkVerification = async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('verified')
        .eq('id', user.id)
        .single();
      setIsVerified(profile?.verified ?? false);
    };
    checkVerification();
  }, [user]);

  // Fetch election, candidates, and check if user has voted
  useEffect(() => {
    const fetchData = async () => {
      if (!electionId || !user) return;
      
      setIsLoading(true);
      try {
        // Fetch election
        const { data: electionData, error: electionError } = await supabase
          .from('elections')
          .select('*')
          .eq('id', electionId)
          .single();

        if (electionError || !electionData) {
          toast({
            title: 'Election not found',
            description: 'The election you are looking for does not exist.',
            variant: 'destructive',
          });
          navigate('/dashboard');
          return;
        }
        setElection(electionData);

        // Fetch candidates
        const { data: candidatesData, error: candidatesError } = await supabase
          .from('candidates')
          .select('*')
          .eq('election_id', electionId)
          .order('position', { ascending: true });

        if (candidatesError) {
          console.error('Error fetching candidates:', candidatesError);
        } else {
          setCandidates(candidatesData || []);
        }

        // Check if user has already voted
        const { data: voteData } = await supabase
          .from('votes')
          .select('id')
          .eq('election_id', electionId)
          .eq('user_id', user.id)
          .maybeSingle();

        setHasVoted(!!voteData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [electionId, user, navigate, toast]);

  const handleVoteSubmit = async () => {
    if (!selectedCandidate || !user || !electionId) return;
    
    setIsSubmitting(true);
    try {
      // Generate ballot token using the database function
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_ballot_token');

      if (tokenError) throw tokenError;

      const ballotToken = tokenData as string;

      // Insert the vote
      const { error: voteError } = await supabase
        .from('votes')
        .insert({
          user_id: user.id,
          election_id: electionId,
          candidate_id: selectedCandidate,
          ballot_token: ballotToken,
        });

      if (voteError) {
        if (voteError.code === '23505') { // Unique constraint violation
          toast({
            title: 'Already Voted',
            description: 'You have already cast your vote in this election.',
            variant: 'destructive',
          });
          setHasVoted(true);
        } else {
          throw voteError;
        }
        return;
      }

      // Navigate to receipt page with the ballot token
      navigate(`/vote/${electionId}/receipt?token=${encodeURIComponent(ballotToken)}`);
      
    } catch (error: any) {
      console.error('Vote submission error:', error);
      toast({
        title: 'Vote Failed',
        description: error.message || 'Failed to submit your vote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!election) {
    return null;
  }

  // Check if user is verified
  if (isVerified === false) {
    return (
      <Layout>
        <div className="container py-12 max-w-2xl">
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-warning mb-4" />
              <h2 className="text-xl font-semibold mb-2">Verification Required</h2>
              <p className="text-muted-foreground mb-4">
                You need to verify your identity before you can vote.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Check if election is active
  if (election.status !== 'active') {
    return (
      <Layout>
        <div className="container py-12 max-w-2xl">
          <Card className="border-border/50">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {election.status === 'upcoming' ? 'Election Not Started' : 'Election Ended'}
              </h2>
              <p className="text-muted-foreground mb-4">
                {election.status === 'upcoming' 
                  ? 'This election has not started yet. Please check back later.'
                  : 'This election has ended. Voting is no longer available.'}
              </p>
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Elections
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // User has already voted
  if (hasVoted) {
    return (
      <Layout>
        <div className="container py-12 max-w-2xl">
          <Card className="border-success/30 bg-success/5">
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
              <h2 className="text-xl font-semibold mb-2">Vote Already Cast</h2>
              <p className="text-muted-foreground mb-4">
                You have already voted in this election. Thank you for participating!
              </p>
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Elections
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const selectedCandidateInfo = candidates.find(c => c.id === selectedCandidate);

  return (
    <Layout>
      <div className="container py-8 lg:py-12 max-w-4xl">
        {/* Back button */}
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Elections
        </Button>

        {/* Election header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">{election.title}</h1>
          {election.description && (
            <p className="text-muted-foreground">{election.description}</p>
          )}
        </div>

        {/* Instructions */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <p className="text-sm">
              <strong>Instructions:</strong> Select one candidate below and click "Cast Your Vote" to submit your ballot. 
              Your vote is final and cannot be changed.
            </p>
          </CardContent>
        </Card>

        {/* Candidates grid */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          {candidates.map((candidate) => (
            <Card 
              key={candidate.id}
              variant="interactive"
              className={`cursor-pointer transition-all ${
                selectedCandidate === candidate.id 
                  ? 'ring-2 ring-primary border-primary bg-primary/5' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedCandidate(candidate.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedCandidate === candidate.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    {candidate.image_url ? (
                      <img 
                        src={candidate.image_url} 
                        alt={candidate.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {candidate.name}
                      {selectedCandidate === candidate.id && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm line-clamp-3">
                  {candidate.bio || 'No biography provided.'}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {candidates.length === 0 && (
          <Card className="text-center py-12 mb-8">
            <CardContent>
              <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">No Candidates</h3>
              <p className="text-muted-foreground">There are no candidates registered for this election.</p>
            </CardContent>
          </Card>
        )}

        {/* Submit button */}
        {candidates.length > 0 && (
          <div className="flex justify-center">
            <Button 
              size="xl" 
              variant="hero"
              disabled={!selectedCandidate || isSubmitting}
              onClick={() => setShowConfirmDialog(true)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <VoteIcon className="h-5 w-5 mr-2" />
                  Cast Your Vote
                </>
              )}
            </Button>
          </div>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Your Vote</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>You are about to cast your vote for:</p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-semibold text-foreground">{selectedCandidateInfo?.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {election.title}
                    </p>
                  </div>
                  <p className="text-warning font-medium">
                    This action cannot be undone. Your vote is final.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleVoteSubmit}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Confirm Vote'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default VotePage;
