import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CheckCircle, Copy, Printer, ArrowLeft, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoteDetails {
  ballot_token: string;
  cast_at: string;
  election_title: string;
  candidate_name: string;
}

const VoteReceiptPage = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [voteDetails, setVoteDetails] = useState<VoteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ballotToken = searchParams.get('token');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchVoteDetails = async () => {
      if (!electionId || !user || !ballotToken) {
        navigate('/dashboard');
        return;
      }

      setIsLoading(true);
      try {
        // Fetch vote with election and candidate info
        const { data: voteData, error: voteError } = await supabase
          .from('votes')
          .select(`
            ballot_token,
            cast_at,
            candidate_id,
            election_id
          `)
          .eq('election_id', electionId)
          .eq('user_id', user.id)
          .eq('ballot_token', ballotToken)
          .single();

        if (voteError || !voteData) {
          toast({
            title: 'Vote not found',
            description: 'Could not find your vote record.',
            variant: 'destructive',
          });
          navigate('/dashboard');
          return;
        }

        // Fetch election title
        const { data: electionData } = await supabase
          .from('elections')
          .select('title')
          .eq('id', electionId)
          .single();

        // Fetch candidate name
        const { data: candidateData } = await supabase
          .from('candidates')
          .select('name')
          .eq('id', voteData.candidate_id)
          .single();

        setVoteDetails({
          ballot_token: voteData.ballot_token,
          cast_at: voteData.cast_at,
          election_title: electionData?.title || 'Unknown Election',
          candidate_name: candidateData?.name || 'Unknown Candidate',
        });
      } catch (error) {
        console.error('Error fetching vote details:', error);
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoteDetails();
  }, [electionId, user, ballotToken, navigate, toast]);

  const handleCopyToken = async () => {
    if (!voteDetails?.ballot_token) return;
    
    try {
      await navigator.clipboard.writeText(voteDetails.ballot_token);
      toast({
        title: 'Copied!',
        description: 'Ballot token copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please manually copy the token.',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    window.print();
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

  if (!voteDetails) {
    return null;
  }

  const formattedDate = new Date(voteDetails.cast_at).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <Layout>
      <div className="container py-8 lg:py-12 max-w-2xl">
        {/* Success animation */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-success/10 rounded-full flex items-center justify-center mb-4 animate-scale-in">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">Vote Submitted!</h1>
          <p className="text-muted-foreground">Your vote has been securely recorded.</p>
        </div>

        {/* Receipt Card */}
        <Card className="mb-6 print:shadow-none print:border-2" id="vote-receipt">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Official Ballot Receipt</span>
            </div>
            <CardTitle className="text-xl">{voteDetails.election_title}</CardTitle>
            <CardDescription>Keep this receipt for your records</CardDescription>
          </CardHeader>
          <CardContent className="py-6 space-y-6">
            {/* Ballot Token */}
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Ballot Token</p>
              <p className="font-mono text-xl font-bold tracking-wider">{voteDetails.ballot_token}</p>
            </div>

            {/* Vote details */}
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Selected Candidate</span>
                <span className="font-medium">{voteDetails.candidate_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Election</span>
                <span className="font-medium">{voteDetails.election_title}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Date & Time</span>
                <span className="font-medium">{formattedDate}</span>
              </div>
            </div>

            {/* Security note */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Security Notice:</strong> Your ballot token is unique and can be used to verify your vote was counted. 
                Your actual vote choice remains private and anonymous.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleCopyToken}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Token
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </div>

        <div className="mt-6 text-center print:hidden">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Elections
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default VoteReceiptPage;
