import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Plus, X, Search, Loader2, Info } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '@/contexts/AuthContext';
import { getAllApprovedFilms, addFilm } from '@/lib/services/filmService';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

// Replace with your actual token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const QueerFilmsMap = ({ readOnly: explicitReadOnly }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const searchInput = useRef(null);
  const mapInitializedRef = useRef(false);
  
  // Get auth context to determine if user can edit
  const { user } = useAuth();
  
  // If readOnly is explicitly set, use that value, otherwise determine from auth state
  const readOnly = explicitReadOnly !== undefined ? explicitReadOnly : !user;
  
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [films, setFilms] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState(null);
  
  const [newFilm, setNewFilm] = useState({
    title: '',
    location: '',
    year: '',
    description: ''
  });

  // Fetch films data
  useEffect(() => {
    const fetchFilms = async () => {
      try {
        setLoading(true);
        const filmsData = await getAllApprovedFilms();
        
        // Transform data format if needed
        const formattedFilms = filmsData.map(film => {
          // Parse the PostGIS point data
          let coordinates = { lat: 0, lng: 0 };
          
          if (typeof film.coordinates === 'string') {
            // Handle if stored as string like 'POINT(lng lat)'
            const match = film.coordinates.match(/POINT\(([^ ]+) ([^ ]+)\)/);
            if (match) {
              coordinates = { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
            }
          } else if (film.coordinates && film.coordinates.coordinates) {
            // Handle GeoJSON format
            coordinates = { 
              lng: film.coordinates.coordinates[0], 
              lat: film.coordinates.coordinates[1] 
            };
          }
          
          return {
            ...film,
            coordinates
          };
        });
        
        setFilms(formattedFilms);
        setError(null);
      } catch (err) {
        console.error('Error fetching films:', err);
        setError('Failed to load films. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFilms();
  }, []);

  // Initialize map
  useEffect(() => {
    // Only initialize the map once and when the container exists
    if (!mapContainer.current || mapInitializedRef.current) return;
    
    try {
      console.log("Initializing map...");
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-40, 20],
        zoom: 1.5,
        projection: 'globe'
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Set flag to avoid re-initialization
      mapInitializedRef.current = true;

      // Wait for map to load before adding data
      map.current.on('load', () => {
        console.log("Map loaded, adding data layers...");
        setMapLoaded(true);
        
        // Add a source for film points that will be clustered
        map.current.addSource('films', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });

        // Add cluster circles
        map.current.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'films',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#ff69b4', // Pink for small clusters
              10,
              '#da70d6', // Purple for medium clusters
              30,
              '#9370db'  // Darker purple for large clusters
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              10,
              30,
              30,
              40
            ]
          }
        });

        // Add cluster count labels
        map.current.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'films',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': '#ffffff'
          }
        });

        // Add unclustered point layer
        map.current.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'films',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#ff69b4',
            'circle-radius': 8,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
          }
        });

        // Update initial data
        updateMapData();
      });

      // Add click handlers
      map.current.on('click', 'clusters', (e) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        const clusterId = features[0].properties.cluster_id;
        map.current.getSource('films').getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;
            map.current.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          }
        );
      });

      map.current.on('click', 'unclustered-point', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const properties = e.features[0].properties;
        
        // Find the film in our state by ID
        const film = films.find(f => f.id === properties.id);
        if (film) {
          setSelectedFilm(film);
        }
        
        // Create a popup
        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(`
            <div class="p-2">
              <h3 class="font-bold">${properties.title} (${properties.year})</h3>
              <p class="text-sm">${properties.location}</p>
              <p class="text-sm mt-1">${properties.description}</p>
              <a href="/films/${properties.id}" class="text-sm text-blue-500 mt-2 block">View details</a>
            </div>
          `)
          .addTo(map.current);
      });

      // Add click handler for adding new locations
      map.current.on('click', (e) => {
        // Don't allow adding markers in readOnly mode
        if (readOnly) return;

        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['clusters', 'unclustered-point']
        });
        if (features.length > 0) return;

        // Remove existing temporary marker if any
        if (window.tempMarker) {
          window.tempMarker.remove();
        }

        // Add a temporary marker
        window.tempMarker = new mapboxgl.Marker({ color: '#ff69b4' })
          .setLngLat(e.lngLat)
          .addTo(map.current);

        // Reverse geocode to get location name
        reverseGeocode(e.lngLat.lng, e.lngLat.lat)
          .then(placeName => {
            setNewFilm(prev => ({
              ...prev,
              location: placeName || `Location at ${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}`
            }));
          });

        setSelectedLocation({
          lng: e.lngLat.lng,
          lat: e.lngLat.lat
        });
        setShowAddForm(true);
      });

      // Change cursor on hover
      map.current.on('mouseenter', ['clusters', 'unclustered-point'], () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', ['clusters', 'unclustered-point'], () => {
        map.current.getCanvas().style.cursor = '';
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map. Please refresh the page.');
    }
    
    return () => {
      if (map.current) {
        map.current.remove();
        mapInitializedRef.current = false;
      }
    };
  }, []);

  // Update map data when films change
  const updateMapData = () => {
    if (!map.current || !map.current.isStyleLoaded()) {
      console.log("Map not ready for data update, will try again later");
      return;
    }

    try {
      console.log("Updating map data with films:", films.length);
      const geojson = {
        type: 'FeatureCollection',
        features: films.map(film => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [film.coordinates.lng, film.coordinates.lat]
          },
          properties: {
            id: film.id,
            title: film.title,
            location: film.location,
            year: film.year,
            description: film.description
          }
        }))
      };

      const source = map.current.getSource('films');
      if (source) {
        source.setData(geojson);
      } else {
        console.warn("Films source not found on map");
      }
    } catch (error) {
      console.error("Error updating map data:", error);
    }
  };

  // Update map data when films change and map is loaded
  useEffect(() => {
    if (mapLoaded && films.length > 0) {
      updateMapData();
    }
  }, [films, mapLoaded]);

  // Function to search for locations
  const handleSearch = async (query) => {
    if (!query) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`Geocoding request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      setSearchResults(data.features || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
    }
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

  const handleSearchResultClick = (result) => {
    const [lng, lat] = result.center;
    map.current.flyTo({
      center: [lng, lat],
      zoom: 12
    });
    setShowSearchResults(false);
    searchInput.current.value = result.place_name;
  };

  const handleAddFilm = async (e) => {
    e.preventDefault();
    
    if (!selectedLocation) {
      alert("Please select a location on the map first");
      return;
    }
    
    if (!user) {
      alert("You must be logged in to add a film");
      console.error("Attempted to add film without authentication");
      return;
    }
    
    // Log authentication status
    console.log("User authenticated:", !!user);
    console.log("User ID:", user.id);
    
    try {
      setSubmitting(true);
      
      // Perform a quick authentication check
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        alert("Your session may have expired. Please sign out and sign in again.");
        console.error("Session validation failed:", sessionError || "No active session");
        setSubmitting(false);
        return;
      }
      
      // Prepare film data with absolute certainty about the user ID
      const filmData = {
        title: newFilm.title || "Untitled Film",
        location: newFilm.location || `Location at ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`,
        // Store PostGIS point data - ensure correct formatting
        coordinates: `POINT(${selectedLocation.lng} ${selectedLocation.lat})`,
        year: parseInt(newFilm.year, 10) || new Date().getFullYear(),
        description: newFilm.description || "No description provided",
        // Use the ID directly from the session
        user_id: sessionData.session.user.id,
        status: 'pending' // New films are pending until approved
      };
      
      console.log('Film data being submitted:', filmData);
      
      // Submit to the database
      const addedFilm = await addFilm(filmData);
      
      // Format for local state
      const newFilmForState = {
        ...addedFilm,
        coordinates: {
          lng: selectedLocation.lng,
          lat: selectedLocation.lat
        }
      };
      
      // Update local state
      setFilms(prevFilms => [...prevFilms, newFilmForState]);
      
      // Reset form
      setNewFilm({ title: '', location: '', year: '', description: '' });
      setSelectedLocation(null);
      setShowAddForm(false);
      
      // Remove temporary marker
      if (window.tempMarker) {
        window.tempMarker.remove();
      }
      
      // Show success message
      alert('Film added successfully! It will be visible to others after review.');
      
    } catch (error) {
      console.error('Detailed error when adding film:', error);
      
      // Provide helpful error messages
      if (error.message?.includes('violates row-level security policy')) {
        console.error('RLS policy violation. Auth state:', !!user, "User ID:", user?.id);
        alert('Permission error: Your session may have expired. Please try signing out and back in.');
      } else if (error.code === '23505') { // Unique violation
        alert('A film with this title already exists. Please use a different title.');
      } else if (error.code?.startsWith('22')) { // Data exception
        alert('There was an issue with the data format. Please check your inputs.');
      } else {
        alert(`Failed to add film: ${error.message || 'Unknown error'}. Please try again.`);
      }
    } finally {
      setSubmitting(false);
    }
  };
  

  // Function to handle logging out and resetting form state
  const resetState = () => {
    setShowAddForm(false);
    setSelectedLocation(null);
    if (window.tempMarker) {
      window.tempMarker.remove();
    }
  };

  // Watch for changes in readOnly state
  useEffect(() => {
    // When user logs out (readOnly becomes true), reset the form
    if (readOnly) {
      resetState();
    }
  }, [readOnly]);

  useEffect(() => {
    if (user) {
      console.log('Authenticated user:', user);
      console.log('User ID:', user.id);
    } else {
      console.log('No authenticated user');
    }
  }, [user]);

  // Add this to your QueerFilmsMap component
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getSession();
        
        console.log("Auth session check:");
        console.log("Session exists:", !!data.session);
        if (data.session) {
          console.log("User ID from session:", data.session.user.id);
          console.log("User email:", data.session.user.email);
          console.log("Token expiry:", new Date(data.session.expires_at * 1000).toLocaleString());
        }
        
        if (error) {
          console.error("Session error:", error);
        }
      } catch (err) {
        console.error("Auth checking error:", err);
      }
    };
    
    checkAuth();
  }, []);
  

  return (
    <div className="w-full h-screen relative">
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0" style={{width: '100%', height: '100%'}} />
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-20">
          <div className="bg-card p-4 rounded-lg shadow-lg flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Loading films...</span>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute top-4 left-4 right-4 z-50">
          <Card className="border-destructive">
            <CardContent className="p-4 flex items-center space-x-2">
              <Info className="h-5 w-5 text-destructive" />
              <p>{error}</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Search and title card */}
      <div className="absolute top-4 left-4 z-10 space-y-4">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Queer Films Archive</span>
              {!readOnly && (
                <Button 
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Film
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              Exploring queer cinema across the globe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Input
                ref={searchInput}
                placeholder="Search locations..."
                onChange={(e) => handleSearch(e.target.value)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-slate-400" />
              
              {showSearchResults && searchResults.length > 0 && (
                <Card className="absolute w-full mt-1 z-50">
                  <CardContent className="p-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded"
                        onClick={() => handleSearchResultClick(result)}
                      >
                        {result.place_name}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Show film count */}
            <div className="mt-2 text-sm text-muted-foreground">
              {films.length} films in the archive
            </div>
            
            {/* Add a message for authenticated users */}
            {!readOnly && (
              <p className="text-xs text-muted-foreground mt-2">
                Click anywhere on the map to add a new film location.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add film form */}
      {showAddForm && (
        <Card className="absolute top-48 left-4 z-10 w-96">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Add New Film</span>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedLocation(null);
                  if (window.tempMarker) {
                    window.tempMarker.remove();
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              Your submission will be reviewed before being added to the public archive.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddFilm} className="space-y-4">
              <Input
                placeholder="Film Title"
                value={newFilm.title}
                onChange={(e) => setNewFilm({...newFilm, title: e.target.value})}
                required
              />
              <Input
                placeholder="Location"
                value={newFilm.location}
                onChange={(e) => setNewFilm({...newFilm, location: e.target.value})}
                required
              />
              <Input
                placeholder="Year"
                type="number"
                min="1895"
                max={new Date().getFullYear()}
                value={newFilm.year}
                onChange={(e) => setNewFilm({...newFilm, year: e.target.value})}
                required
              />
              <div>
                <Input
                  placeholder="Description"
                  value={newFilm.description}
                  onChange={(e) => setNewFilm({...newFilm, description: e.target.value})}
                  required
                  className="h-20"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Briefly describe the film and its significance to queer cinema.
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : 'Submit Film'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      
      {/* Film details panel (when a film is selected) */}
      {selectedFilm && (
        <Card className="absolute bottom-4 right-4 z-10 w-96">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{selectedFilm.title} ({selectedFilm.year})</span>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedFilm(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              {selectedFilm.location}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{selectedFilm.description}</p>
            <Link href={`/films/${selectedFilm.id}`} passHref>
              <Button variant="outline" className="w-full">
                View Film Details
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QueerFilmsMap;