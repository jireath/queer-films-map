'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminPanel() {
  const [pendingFilms, setPendingFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin and fetch pending films
  useEffect(() => {
    const checkAdminAndFetchFilms = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // First check if current user is an admin
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (!userData.user) {
          throw new Error('Not authenticated');
        }
        
        // Get the user's profile to check admin status
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', userData.user.id)
          .single();
          
        if (profileError) throw profileError;
        
        if (!profileData?.is_admin) {
          setIsAdmin(false);
          return; // Not an admin, don't fetch films
        }
        
        setIsAdmin(true);
        
        // Fetch all pending films
        const { data: filmsData, error: filmsError } = await supabase
          .from('films')
          .select('*, profiles(username, full_name)')
          .eq('status', 'pending');
          
        if (filmsError) throw filmsError;
        
        setPendingFilms(filmsData);
      } catch (err) {
        console.error('Error in admin panel:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminAndFetchFilms();
  }, []);

  // Approve a film
  const handleApprove = async (filmId) => {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('films')
        .update({ status: 'approved' })
        .eq('id', filmId);
        
      if (error) throw error;
      
      // Update local state
      setPendingFilms(pendingFilms.filter(film => film.id !== filmId));
    } catch (err) {
      console.error('Error approving film:', err);
      alert('Failed to approve film: ' + err.message);
    }
  };

  // Reject a film
  const handleReject = async (filmId, reason) => {
    // You could add a modal or prompt for rejection reason
    const rejectionReason = prompt('Please provide a reason for rejection:');
    if (rejectionReason === null) return; // User cancelled
    
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('films')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason || 'No reason provided'
        })
        .eq('id', filmId);
        
      if (error) throw error;
      
      // Update local state
      setPendingFilms(pendingFilms.filter(film => film.id !== filmId));
    } catch (err) {
      console.error('Error rejecting film:', err);
      alert('Failed to reject film: ' + err.message);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading admin panel...</span>
        </CardContent>
      </Card>
    );
  }

  // Not an admin
  if (!isAdmin) {
    return null; // Don't show anything
  }

  // Show error
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Panel</CardTitle>
        <CardDescription>
          Review and approve film submissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingFilms.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">No pending films to review!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingFilms.map(film => (
              <Card key={film.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{film.title} ({film.year})</h3>
                      <p className="text-sm text-muted-foreground mb-1">
                        Location: {film.location}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Submitted by: {film.profiles?.full_name || film.profiles?.username || 'Unknown user'}
                      </p>
                      
                      <div className="bg-muted p-3 rounded-md mb-3">
                        <p className="text-sm">{film.description}</p>
                      </div>
                      
                      <div className="flex items-center text-yellow-500">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Pending Review</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 mt-4">
                    <Button 
                      variant="default" 
                      className="flex items-center"
                      onClick={() => handleApprove(film.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      className="flex items-center"
                      onClick={() => handleReject(film.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}