import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Vote, Calendar, Clock, CheckCircle } from 'lucide-react';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  // Demo elections for display
  const elections = [
    { id: '1', title: 'Student Council President 2025', status: 'active', startTime: '2025-01-01', endTime: '2025-01-15', candidateCount: 4 },
    { id: '2', title: 'Department Representative', status: 'upcoming', startTime: '2025-02-01', endTime: '2025-02-10', candidateCount: 3 },
    { id: '3', title: 'Club Treasurer', status: 'ended', startTime: '2024-12-01', endTime: '2024-12-10', candidateCount: 2 },
  ];

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

  return (
    <Layout>
      <div className="container py-8 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Elections</h1>
          <p className="text-muted-foreground">View and participate in active elections</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {elections.map((election) => {
            const StatusIcon = getStatusIcon(election.status);
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
                      <span>{election.startTime} - {election.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Vote className="h-4 w-4" />
                      <span>{election.candidateCount} candidates</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    variant={election.status === 'active' ? 'hero' : 'secondary'}
                    disabled={election.status !== 'active'}
                  >
                    {election.status === 'active' ? 'Vote Now' : election.status === 'upcoming' ? 'Coming Soon' : 'View Results'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {elections.length === 0 && (
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
