'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MapPin, Calendar, User, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

// Set Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export default function FilmPage({ params }) {
  const { id } = params;
  const [film, setFilm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [author, setAuthor] = useState(null);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const { user } = useAuth();
  const router = useRouter();

  // Fetch film data
  useEffect(() => {
    const fetchFilm = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Fetch film with id
        const { data: filmData, error: filmError } = await supabase
          .from('films')
          .select('*')
          .eq('id', id)
          .single();
        
        if (filmError) throw filmError;
        if (!filmData) throw new Error('Film not found');
        
        // Parse coordinates
        let coordinates = { lat: 0, lng: 0 };
        if (typeof filmData.coordinates === 'string') {
          // Handle if stored as string like 'POINT(lng lat)'
          const match = filmData.coordinates.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (match) {
            coordinates = { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
          }
        } else if (filmData.coordinates && filmData.coordinates.coordinates) {
          // Handle GeoJSON format
          coordinates = { 
            lng: filmData.coordinates.coordinates[0], 
            lat: filmData.coordinates.coordinates[1] 
          };
        }
        
        setFilm({
          ...filmData,
          coordinates
        });
        
        // Fetch author profile
        const { data: authorData, error: authorError } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('id', filmData.user_id)
          .single();
          
        if (!authorError && authorData) {
          setAuthor(authorData);
        }
        
      } catch (err) {
        console.error('Error fetching film:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFilm();
    }
  }, [id]);

  // Initialize map once film data is loaded
  useEffect(() => {
    if (!film || !mapContainer.current || map.current) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [film.coordinates.lng, film.coordinates.lat],
      zoom: 10,
      interactive: true
    });
    
    // Add navigation control
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Add marker for the film location
    new mapboxgl.Marker({ color: '#ff69b4' })
      .setLngLat([film.coordinates.lng, film.coordinates.lat])
      .addTo(map.current);
      
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [film]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading film details...</span>
      </div>
    );
  }

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
              <ArrowLeft className="mr-2 h-4 w-4" /> Return to Map
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!film) {
    return null;
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="outline"
        className="mb-6"
        onClick={() => router.push('/')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Map
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{film.title}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> {film.year}
                <span className="mx-2">•</span>
                <MapPin className="h-4 w-4" /> {film.location}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert">
                <p className="text-lg">{film.description}</p>
                
                {/* Additional metadata */}
                <div className="mt-8 pt-6 border-t border-border space-y-2">
                  {author && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Submitted by {author.full_name || author.username || 'Anonymous'}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Added on {formatDate(film.created_at)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* User actions */}
          {user && user.id === film.user_id && film.status === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle>Manage Your Submission</CardTitle>
                <CardDescription>
                  This film is pending approval by our moderators.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button variant="outline">Edit Details</Button>
                  <Button variant="destructive">Delete Submission</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map and sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div ref={mapContainer} className="h-64 w-full" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Related Films</CardTitle>
              <CardDescription>Other queer films in this region</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                This feature is coming soon. We're working on connecting films by location, themes, and directors.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/" className="text-sm text-primary hover:underline">
                Explore the map
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}