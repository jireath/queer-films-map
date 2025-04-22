import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Plus, X, Search } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';  // Important: Keep this import
import { useAuth } from '@/contexts/AuthContext';

// Replace with your actual token
mapboxgl.accessToken = 'pk.eyJ1IjoiamltcmFldGgiLCJhIjoiY203M3ppazIzMDR1bjJycHg2eXNueXUwZSJ9.mH29QT02-7Egh9TTW3dnog';

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
  
  const [films, setFilms] = useState([
    {
      id: 1,
      title: "Portrait of a Lady on Fire",
      location: "Brittany, France",
      year: 2019,
      coordinates: { lat: 48.2020, lng: -2.9326 },
      description: "A female painter is commissioned to paint a wedding portrait of a young woman."
    },
    {
      id: 2,
      title: "Moonlight",
      location: "Miami, Florida",
      year: 2016,
      coordinates: { lat: 25.7617, lng: -80.1918 },
      description: "A young African-American man grapples with his identity and sexuality."
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newFilm, setNewFilm] = useState({
    title: '',
    location: '',
    year: '',
    description: ''
  });

  // Initialize map
  useEffect(() => {
    // Only initialize the map once and when the container exists
    if (!mapContainer.current || mapInitializedRef.current) return;
    
    // Use a small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
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
                '#ff69b4',
                10,
                '#da70d6',
                30,
                '#9370db'
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
          const { title, year, description, location } = e.features[0].properties;

          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
              <div class="p-2">
                <h3 class="font-bold">${title} (${year})</h3>
                <p class="text-sm">${location}</p>
                <p class="text-sm mt-1">${description}</p>
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
      }
    }, 500); // Small delay to ensure DOM is ready
    
    return () => {
      clearTimeout(timer);
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
    if (mapLoaded) {
      updateMapData();
    }
  }, [films, mapLoaded]);

  const handleSearch = async (query) => {
    if (!query) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.features);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
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

  const handleAddFilm = (e) => {
    e.preventDefault();
    if (!selectedLocation) return;

    setFilms(prevFilms => [...prevFilms, {
      id: prevFilms.length + 1,
      ...newFilm,
      coordinates: selectedLocation
    }]);

    setNewFilm({ title: '', location: '', year: '', description: '' });
    setSelectedLocation(null);
    setShowAddForm(false);
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

  return (
    <div className="w-full h-screen relative">
      {/* Add debug info to help troubleshoot */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-0 right-0 z-50 bg-black bg-opacity-50 text-white p-2 text-xs">
          Map Initialized: {mapInitializedRef.current ? 'Yes' : 'No'}<br/>
          Map Loaded: {mapLoaded ? 'Yes' : 'No'}<br/>
          Films: {films.length}<br/>
          Read Only: {readOnly ? 'Yes' : 'No'}<br/>
          User: {user ? 'Authenticated' : 'Anonymous'}
        </div>
      )}
      
      <div ref={mapContainer} className="absolute inset-0" style={{width: '100%', height: '100%'}} />
      
      <div className="absolute top-4 left-4 z-10 space-y-4">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Queer Films World Map</span>
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
            
            {/* Add a message for authenticated users */}
            {!readOnly && (
              <p className="text-xs text-muted-foreground mt-2">
                Click anywhere on the map to add a new film location.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

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
                value={selectedLocation ? `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}` : ''}
                disabled
              />
              <Input
                placeholder="Year"
                type="number"
                value={newFilm.year}
                onChange={(e) => setNewFilm({...newFilm, year: e.target.value})}
                required
              />
              <Input
                placeholder="Description"
                value={newFilm.description}
                onChange={(e) => setNewFilm({...newFilm, description: e.target.value})}
                required
              />
              <Button type="submit" className="w-full">Submit Film</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QueerFilmsMap;