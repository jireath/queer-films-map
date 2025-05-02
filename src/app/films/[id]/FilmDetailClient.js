'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MapPin, Calendar, User, Clock, Loader2, Video } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

// Set Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export default function FilmDetailClient({ film, author, error }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const { user } = useAuth();
  const router = useRouter();
  
  // We still need loading state for client-side operations
  const [loading, setLoading] = useState(false);

  // In the useEffect for map initialization in FilmDetailClient.js
  useEffect(() => {
    if (!film || !mapContainer.current || map.current) return;
    
    // Initialize the map with explicit style options
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [film.coordinates.lng, film.coordinates.lat],
      zoom: 10,
      interactive: true,
      attributionControl: true // Ensure attribution control is enabled
    });
    
    // Handle both the load event and style data events
    const onStyleLoad = () => {
      if (map.current && map.current.isStyleLoaded()) {
        console.log("Map style loaded in film detail view");
        
        // Add navigation control
        if (!map.current.hasControl) {
          map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
          map.current.hasControl = true;
        }
        
        // Add marker for the film location - using a try/catch to be safe
        try {
          new mapboxgl.Marker({ color: '#ff69b4' })
            .setLngLat([film.coordinates.lng, film.coordinates.lat])
            .addTo(map.current);
        } catch (err) {
          console.error("Error adding marker:", err);
        }
      }
    };
    
    // Listen for style data events (fires multiple times during loading)
    map.current.on('styledata', onStyleLoad);
    
    // Also listen for the main load event
    map.current.on('load', onStyleLoad);
    
    // Force a resize after a short delay to help with rendering
    setTimeout(() => {
      if (map.current) {
        map.current.resize();
        // Trigger a style reload if needed
        if (!map.current.isStyleLoaded()) {
          map.current.setStyle('mapbox://styles/mapbox/dark-v11');
        }
      }
    }, 500);
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [film]);

  // Convert the loading screen UI to use our prop-based approach
  if (!film && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading film details...</span>
      </div>
    );
  }

  // Error handling directly uses the error prop
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

  // Helper function for date formatting
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
          {/* Film image - shown if available */}
          {film.image_url && (
            <div className="w-full overflow-hidden rounded-lg border border-border">
              <img 
                src={film.image_url} 
                alt={`Image for ${film.title}`}
                className="w-full h-auto object-cover aspect-video"
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{film.title}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <Calendar className="h-4 w-4" /> {film.year}
                <span className="mx-2">•</span>
                <MapPin className="h-4 w-4" /> {film.location}
                {film.director && (
                  <>
                    <span className="mx-2">•</span>
                    <Video className="h-4 w-4" /> Directed by {film.director}
                  </>
                )}
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
                  <Link href={`/films/${film.id}/edit`} passHref>
                    <Button variant="outline">Edit Details</Button>
                  </Link>
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