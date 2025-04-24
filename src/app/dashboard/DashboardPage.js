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

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [updating, setUpdating] = useState(false);
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
        
        // Fetch user's films
        const userFilms = await getUserFilms(user.id);
        setFilms(userFilms);
        
        // Fetch user profile
        const supabase = createClient();
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching profile:', profileError);
        } else {
          setProfile(profileData);
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load your data. Please try again later.');
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
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          username: profile.username,
          website: profile.website
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Handle film deletion
  const handleDeleteFilm = async (filmId) => {
    if (!confirm('Are you sure you want to delete this film? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteFilm(filmId);
      setFilms(films.filter(film => film.id !== filmId));
    } catch (err) {
      console.error('Error deleting film:', err);
      alert('Failed to delete film. Please try again.');
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
      </Tabs>
    </div>
  );
}
