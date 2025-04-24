'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { getUserFilms, deleteFilm } from '@/lib/services/filmService';
import { createClient } from '@/lib/supabase/client';
import { MapPin, Calendar, CheckCircle, Clock, XCircle, AlertCircle, Loader2, Edit, Trash } from 'lucide-react';
import Link from 'next/link';
// Import AdminPanel only if available - otherwise this line can be commented out
// import AdminPanel from '@/components/AdminPanel';

// Simple approval panel component for admin functions
function ApprovalPanel() {
  const [pendingFilms, setPendingFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch pending films
  useEffect(() => {
    const fetchPendingFilms = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Fetch all pending films
        const { data, error } = await supabase
          .from('films')
          .select('*')
          .eq('status', 'pending');
          
        if (error) throw error;
        setPendingFilms(data || []);
      } catch (err) {
        console.error('Error fetching pending films:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPendingFilms();
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
      alert('Film approved successfully!');
    } catch (err) {
      console.error('Error approving film:', err);
      alert('Failed to approve film: ' + err.message);
    }
  };

  // Reject a film
  const handleReject = async (filmId) => {
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
      alert('Film rejected successfully!');
    } catch (err) {
      console.error('Error rejecting film:', err);
      alert('Failed to reject film: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading pending films...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive rounded-md text-destructive">
        <h3 className="font-semibold">Error loading pending films</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (pendingFilms.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 mx-auto text-primary mb-4" />
        <p className="text-muted-foreground">No pending films to review!</p>
      </div>
    );
  }

  return (
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
  );
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null); // Add debug info state
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  // Fetch user's films and profile
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setDebugInfo(null);
        
        // Fetch user's films
        try {
          const userFilms = await getUserFilms(user.id);
          console.log('Fetched films:', userFilms);
          setFilms(userFilms || []);
        } catch (filmError) {
          console.error('Error fetching films:', filmError);
          setDebugInfo(prev => {
            const newDebugInfo = prev || '';
            return newDebugInfo + '\nFilms error: ' + JSON.stringify(filmError, Object.getOwnPropertyNames(filmError));
          });
          // Continue to profile fetch even if films fetch fails
        }
        
        // Fetch user profile
        try {
          const supabase = createClient();
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (profileError) {
            console.error('Error fetching profile:', profileError);
            setDebugInfo(prev => {
              const newDebugInfo = prev || '';
              return newDebugInfo + '\nProfile error: ' + JSON.stringify(profileError, Object.getOwnPropertyNames(profileError));
            });
          } else {
            console.log('Fetched profile:', profileData);
            setProfile(profileData);
            // Check if is_admin field exists, default to false if not
            setIsAdmin(profileData?.is_admin === true);
          }
        } catch (profileFetchError) {
          console.error('Exception fetching profile:', profileFetchError);
          setDebugInfo(prev => {
            const newDebugInfo = prev || '';
            return newDebugInfo + '\nProfile fetch error: ' + JSON.stringify(profileFetchError, Object.getOwnPropertyNames(profileFetchError));
          });
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to load your data: ${err.message || 'Unknown error'}`);
        setDebugInfo('Main error: ' + JSON.stringify(err, Object.getOwnPropertyNames(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    try {
      setUpdating(true);
      
      const supabase = createClient();
      
      // Create update object with only the fields we want to update
      const updateData = {
        full_name: profile.full_name,
        username: profile.username
      };
      
      // Only include website if it exists in the profile
      if (profile.website !== undefined) {
        updateData.website = profile.website;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
        
      if (error) throw error;
      
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert(`Failed to update profile: ${err.message || 'Unknown error'}`);
    } finally {
      setUpdating(false);
    }
  };

  // Handle film deletion - improved version
  const handleDeleteFilm = async (filmId) => {
    if (!confirm('Are you sure you want to delete this film? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDebugInfo(`Attempting to delete film ID: ${filmId}`);
      
      // Direct database deletion as a fallback if the service function fails
      const supabase = createClient();
      
      // First check if film exists and user owns it
      const { data: filmData, error: filmError } = await supabase
        .from('films')
        .select('user_id')
        .eq('id', filmId)
        .single();
        
      if (filmError) {
        setDebugInfo(prev => `${prev}\nError checking film: ${filmError.message}`);
        throw filmError;
      }
      
      if (filmData.user_id !== user.id) {
        setDebugInfo(prev => `${prev}\nPermission denied: User doesn't own this film`);
        throw new Error("You don't have permission to delete this film");
      }
      
      // Proceed with deletion
      const { error: deleteError } = await supabase
        .from('films')
        .delete()
        .eq('id', filmId);
        
      if (deleteError) {
        setDebugInfo(prev => `${prev}\nDeletion error: ${deleteError.message}`);
        throw deleteError;
      }
      
      setDebugInfo(prev => `${prev}\nFilm deleted successfully!`);
      
      // Update the UI by removing the deleted film
      setFilms(films.filter(film => film.id !== filmId));
      
      alert('Film deleted successfully!');
    } catch (err) {
      console.error('Error deleting film:', err);
      setDebugInfo(prev => `${prev}\nException: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
      alert(`Failed to delete film: ${err.message || 'Unknown error'}`);
    }
  };

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }
  
  // Show error
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
            <p>{error}</p>
            {debugInfo && (
              <div className="mt-4 p-4 bg-muted rounded-md overflow-auto">
                <h3 className="text-sm font-semibold mb-2">Debug Information:</h3>
                <pre className="text-xs whitespace-pre-wrap">{debugInfo}</pre>
              </div>
            )}
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push('/')}
            >
              Return to Map
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get status counts
  const pendingFilms = films.filter(film => film.status === 'pending');
  const approvedFilms = films.filter(film => film.status === 'approved');
  const rejectedFilms = films.filter(film => film.status === 'rejected');

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    switch (status) {
      case 'approved':
        return (
          <div className="flex items-center text-green-500">
            <CheckCircle className="h-4 w-4 mr-1" />
            <span>Approved</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center text-yellow-500">
            <Clock className="h-4 w-4 mr-1" />
            <span>Pending Review</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center text-red-500">
            <XCircle className="h-4 w-4 mr-1" />
            <span>Rejected</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-muted-foreground">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span>Unknown</span>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Your Dashboard</h1>

      {/* Debug info for development */}
      {debugInfo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap overflow-auto bg-muted p-4 rounded-md">{debugInfo}</pre>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Films</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{films.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{pendingFilms.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Approved Films</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{approvedFilms.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="films" className="space-y-6">
        <TabsList>
          <TabsTrigger value="films">Your Films</TabsTrigger>
          <TabsTrigger value="profile">Profile Settings</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin Panel</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="films" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Submitted Films</CardTitle>
              <CardDescription>
                Manage the films you've added to the Queer Films Archive
              </CardDescription>
            </CardHeader>
            <CardContent>
              {films.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You haven't submitted any films yet.</p>
                  <Link href="/" passHref>
                    <Button>Add Your First Film</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {films.map(film => (
                    <Card key={film.id} className="overflow-hidden">
                      <div className="p-4 sm:p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold mb-1">{film.title}</h3>
                            <div className="text-sm text-muted-foreground mb-2">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span>{film.year}</span>
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  <span>{film.location}</span>
                                </div>
                              </div>
                            </div>
                            <StatusBadge status={film.status} />
                          </div>
                          
                          <div className="flex space-x-2">
                            <Link href={`/films/${film.id}`} passHref>
                              <Button variant="outline" size="icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                              </Button>
                            </Link>
                            
                            {film.status === 'pending' && (
                              <>
                                <Link href={`/films/${film.id}/edit`} passHref>
                                  <Button variant="outline" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                                
                                <Button 
                                  variant="destructive" 
                                  size="icon"
                                  onClick={() => handleDeleteFilm(film.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {film.status === 'rejected' && film.rejection_reason && (
                          <div className="mt-4 p-3 bg-destructive/10 rounded-md">
                            <p className="text-sm font-medium mb-1">Rejection Reason:</p>
                            <p className="text-sm">{film.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Link href="/" passHref>
                <Button variant="outline">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add New Film
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Update your profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Your email cannot be changed
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-medium">Username</label>
                    <Input
                      id="username"
                      value={profile.username || ''}
                      onChange={(e) => setProfile({...profile, username: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
                    <Input
                      id="fullName"
                      value={profile.full_name || ''}
                      onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="website" className="text-sm font-medium">Website</label>
                    <Input
                      id="website"
                      type="url"
                      value={profile.website || ''}
                      onChange={(e) => setProfile({...profile, website: e.target.value})}
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : 'Update Profile'}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Profile information could not be loaded.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => router.reload()}
                  >
                    Reload
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Admin Tab - Only show if AdminPanel component exists and user is admin */}
        {isAdmin && (
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>Admin Functions</CardTitle>
                <CardDescription>
                  Manage film approvals and system settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Temporary admin functions until the AdminPanel component is available */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Pending Films</CardTitle>
                      <CardDescription>
                        Approve or reject submitted films
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Simple admin approval interface */}
                        <ApprovalPanel />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}