'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Save, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { updateFilm } from '@/lib/services/filmService';
import Link from 'next/link';

// Set Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export default function EditFilmPage({ params }) {
  const { id } = params;
  const { user, loading: authLoading } = useAuth();
  const [film, setFilm] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    year: '',
    description: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  // Fetch film data
  useEffect(() => {
    const fetchFilm = async () => {
      if (!user) return;
      
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
        
        // Check if user is the author
        if (filmData.user_id !== user.id) {
          throw new Error('You do not have permission to edit this film');
        }
        
        // Check if film is in pending status
        if (filmData.status !== 'pending') {
          throw new Error('Only pending films can be edited');
        }
        
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
        
        const formattedFilm = {
          ...filmData,
          coordinates
        };
        
        setFilm(formattedFilm);
        setFormData({
          title: formattedFilm.title || '',
          location: formattedFilm.location || '',
          year: formattedFilm.year?.toString() || '',
          description: formattedFilm.description || ''
        });
        setSelectedLocation(coordinates);
        
      } catch (err) {
        console.error('Error fetching film:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id && user) {
      fetchFilm();
    }
  }, [id, user]);

  // Initialize map
  useEffect(() => {
    if (!selectedLocation || !mapContainer.current || map.current) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [selectedLocation.lng, selectedLocation.lat],
      zoom: 10
    });
    
    // Add navigation control
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Add marker for the film location
    marker.current = new mapboxgl.Marker({ 
      color: '#ff69b4',
      draggable: true
    })
      .setLngLat([selectedLocation.lng, selectedLocation.lat])
      .addTo(map.current);
      
    // Add event listener for marker drag end
    marker.current.on('dragend', () => {
      const lngLat = marker.current.getLngLat();
      setSelectedLocation({
        lng: lngLat.lng,
        lat: lngLat.lat
      });
      
      // Update location name
      reverseGeocode(lngLat.lng, lngLat.lat)
        .then(placeName => {
          if (placeName) {
            setFormData(prev => ({
              ...prev,
              location: placeName
            }));
          }
        });
    });
      
    // Add click handler for moving marker
    map.current.on('click', (e) => {
      marker.current.setLngLat(e.lngLat);
      setSelectedLocation({
        lng: e.lngLat.lng,
        lat: e.lngLat.lat
      });
      
      // Update location name
      reverseGeocode(e.lngLat.lng, e.lngLat.lat)
        .then(placeName => {
          if (placeName) {
            setFormData(prev => ({
              ...prev,
              location: placeName
            }));
          }
        });
    });
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [selectedLocation]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to reverse geocode coordinates to a place name
  const reverseGeocode = async (lng, lat) => {
    try {
      const response = await fetch(`/api/geocode?query=${lat},${lng}`);
      
      if (!response.ok) {
        throw new Error(`Reverse geocoding request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user || !film || !selectedLocation) return;
    
    try {
      setSubmitting(true);
      
      // Prepare film data for submission
      const filmData = {
        title: formData.title,
        location: formData.location,
        coordinates: `POINT(${selectedLocation.lng} ${selectedLocation.lat})`,
        year: parseInt(formData.year, 10),
        description: formData.description
      };
      
      // Update in database
      await updateFilm(film.id, filmData);
      
      // Redirect to film page
      router.push(`/films/${film.id}`);
      
    } catch (err) {
      console.error('Error updating film:', err);
      setError('Failed to update film. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
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
            <div className="mt-4 flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => router.push('/')}
              >
                View Map
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!film) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Film</h1>
        <Button
          variant="outline"
          onClick={() => router.push(`/films/${film.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Film Details</CardTitle>
              <CardDescription>
                Edit your submission - it will need to be reviewed again after changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form id="edit-film-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">Film Title</label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="location" className="text-sm font-medium">
                    Location
                    <span className="text-muted-foreground ml-2 text-xs">
                      (Click the map to update)
                    </span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (map.current && selectedLocation) {
                          map.current.flyTo({
                            center: [selectedLocation.lng, selectedLocation.lat],
                            zoom: 12
                          });
                        }
                      }}
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="year" className="text-sm font-medium">Year</label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    min="1895"
                    max={new Date().getFullYear()}
                    value={formData.year}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    className="flex h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe the film and explain its significance in queer cinema history
                  </p>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Link href={`/films/${film.id}`} passHref>
                <Button variant="outline">Cancel</Button>
              </Link>
              
              <Button 
                type="submit" 
                form="edit-film-form"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
              <CardDescription>
                Click the map or drag the marker to update the location
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div ref={mapContainer} className="h-96 w-full" />
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              Changes to the location will require re-approval
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}