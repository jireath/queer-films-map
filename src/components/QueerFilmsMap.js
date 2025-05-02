'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Plus, X, Search, Loader2, Info, Video, RefreshCw } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '@/contexts/AuthContext';
import { getAllApprovedFilms, addFilm, uploadFilmImage } from '@/lib/services/filmService';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import ImageUpload from '@/components/ImageUpload';

// Replace with your actual token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

// Modal component defined inline for easier copy-paste
const Modal = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef(null);

  // Close when clicking outside the modal content
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    // Close on escape key press
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent scrolling on the body when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Modal content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Debug helper function
function debugCoordinatesFormat() {
  // Only run in development
  if (process.env.NODE_ENV !== 'development') return;
  
  // Get a supabase client
  const supabase = createClient();
  
  // Fetch a small sample of films with coordinates
  supabase
    .from('films')
    .select('id, title, coordinates')
    .limit(5)
    .then(({ data, error }) => {
      if (error) {
        console.error('Error fetching sample films:', error);
        return;
      }
      
      console.log('===== COORDINATES DEBUG =====');
      data.forEach(film => {
        console.log(`Film "${film.title}" (id: ${film.id}):`);
        console.log('  Coordinates type:', typeof film.coordinates);
        console.log('  Raw value:', film.coordinates);
        
        // If it's a string, show what our regex would extract
        if (typeof film.coordinates === 'string') {
          const match = film.coordinates.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          console.log('  Regex match result:', match);
          if (match) {
            console.log('  Parsed values:', {
              lng: parseFloat(match[1]),
              lat: parseFloat(match[2])
            });
          }
        }
        // If it's an object, show its structure
        else if (typeof film.coordinates === 'object') {
          console.log('  Object keys:', Object.keys(film.coordinates));
          if (film.coordinates && film.coordinates.coordinates) {
            console.log('  GeoJSON coordinates:', film.coordinates.coordinates);
          }
        }
        console.log('-------------------------');
      });
    });
}

const logCoordinateFormat = (film) => {
  if (process.env.NODE_ENV !== 'development') return;
  console.log(`Film "${film.title}" coordinates:`, film.coordinates);
  console.log('Type:', typeof film.coordinates);
  console.log('Format:', film.coordinates ? Object.keys(film.coordinates).join(', ') : 'null');
};

const QueerFilmsMap = ({ readOnly: explicitReadOnly }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const searchInput = useRef(null);
  const mapInitializedRef = useRef(false);
  const layersInitializedRef = useRef(false);
  const retryTimeoutRef = useRef(null);
  
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedLocation, setConfirmedLocation] = useState(null);
  const [selectedFilm, setSelectedFilm] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  
  // Debug state - only used in development mode
  const [debugInfo, setDebugInfo] = useState({
    mapInitialized: false,
    filmsLoaded: 0,
    dataInitialized: false,
    lastUpdate: null,
    layersCreated: false,
    retryCount: 0,
    layerStatus: {}
  });
  
  const [newFilm, setNewFilm] = useState({
    title: '',
    director: '',
    location: '',
    year: '',
    description: ''
  });

  // Update debug info helper
  const updateDebugInfo = (updates) => {
    if (process.env.NODE_ENV === 'development') {
      setDebugInfo(prev => ({
        ...prev, 
        ...updates, 
        lastUpdate: new Date().toLocaleTimeString()
      }));
    }
  };

  // Function to initialize map data layers
  const initializeMapLayers = () => {
    if (!map.current || !map.current.isStyleLoaded()) {
      updateDebugInfo({ 
        retryCount: debugInfo.retryCount + 1,
        layerStatus: {...debugInfo.layerStatus, initAttempt: 'Map not ready'} 
      });
      
      // Schedule retry with backoff
      const retryDelay = Math.min(1000 * (1 + debugInfo.retryCount / 2), 5000);
      retryTimeoutRef.current = setTimeout(initializeMapLayers, retryDelay);
      return false;
    }

    try {
      // Check if source already exists
      if (!map.current.getSource('films')) {
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
        
        updateDebugInfo({ 
          layerStatus: {...debugInfo.layerStatus, sourceAdded: true}
        });
      }

      // Check if layers already exist
      if (!map.current.getLayer('clusters')) {
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
        
        updateDebugInfo({ 
          layerStatus: {...debugInfo.layerStatus, clustersAdded: true}
        });
      }

      if (!map.current.getLayer('cluster-count')) {
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
        
        updateDebugInfo({ 
          layerStatus: {...debugInfo.layerStatus, clusterCountAdded: true}
        });
      }

      if (!map.current.getLayer('unclustered-point')) {
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
        
        updateDebugInfo({ 
          layerStatus: {...debugInfo.layerStatus, pointsAdded: true}
        });
      }

      // Mark layers as initialized
      layersInitializedRef.current = true;
      updateDebugInfo({ 
        layersCreated: true,
        layerStatus: {...debugInfo.layerStatus, complete: true}
      });

      return true;
    } catch (error) {
      console.error('Error initializing map layers:', error);
      updateDebugInfo({ 
        layerStatus: {...debugInfo.layerStatus, error: error.message}
      });
      
      // Schedule retry with backoff
      const retryDelay = Math.min(1000 * (1 + debugInfo.retryCount / 2), 5000);
      retryTimeoutRef.current = setTimeout(initializeMapLayers, retryDelay);
      return false;
    }
  };

  // Function to check and fix layers if they're missing
  const checkAndFixLayers = () => {
    if (!map.current || !map.current.isStyleLoaded()) return false;
    
    try {
      // Check if source exists
      if (!map.current.getSource('films')) {
        console.warn('Films source is missing, attempting to recreate...');
        updateDebugInfo({ 
          layerStatus: {...debugInfo.layerStatus, checkResult: 'Source missing'}
        });
        return initializeMapLayers();
      }
      
      // Check if layers exist
      const layersToCheck = ['clusters', 'cluster-count', 'unclustered-point'];
      let allLayersPresent = true;
      
      for (const layerId of layersToCheck) {
        if (!map.current.getLayer(layerId)) {
          console.warn(`Layer ${layerId} is missing, need to recreate layers`);
          allLayersPresent = false;
          
          // Try to remove all layers and source to start fresh
          for (const id of layersToCheck) {
            try {
              if (map.current.getLayer(id)) {
                map.current.removeLayer(id);
              }
            } catch (e) {
              console.error(`Error removing layer ${id}:`, e);
            }
          }
          
          try {
            if (map.current.getSource('films')) {
              map.current.removeSource('films');
            }
          } catch (e) {
            console.error('Error removing films source:', e);
          }
          
          // Recreate all layers
          updateDebugInfo({ 
            layerStatus: {...debugInfo.layerStatus, checkResult: 'Layers missing, recreating'}
          });
          return initializeMapLayers();
        }
      }
      
      updateDebugInfo({ 
        layerStatus: {...debugInfo.layerStatus, checkResult: 'All layers present'}
      });
      return allLayersPresent;
    } catch (e) {
      console.error('Error checking layers:', e);
      updateDebugInfo({ 
        layerStatus: {...debugInfo.layerStatus, checkError: e.message}
      });
      return false;
    }
  };

  // Update map data with current films
  const updateMapData = () => {
    // If map isn't ready, defer the update
    if (!map.current || !map.current.isStyleLoaded()) {
      console.log("Map not ready for data update, will retry in 1000ms");
      updateDebugInfo({ 
        layerStatus: {...debugInfo.layerStatus, updateAttempt: 'Map not ready'}
      });
      setTimeout(updateMapData, 1000);
      return;
    }

    // Check if layers are initialized, if not, initialize them
    if (!layersInitializedRef.current) {
      if (!initializeMapLayers()) {
        console.log("Layers not initialized, retrying later");
        updateDebugInfo({ 
          layerStatus: {...debugInfo.layerStatus, updateAttempt: 'Layers not ready'}
        });
        setTimeout(updateMapData, 1000);
        return;
      }
    }

    try {
      // Verify the source still exists, if not recreate layers
      if (!map.current.getSource('films')) {
        console.warn("Films source not found, reinitializing map data");
        layersInitializedRef.current = false;
        updateDebugInfo({ 
          layerStatus: {...debugInfo.layerStatus, updateAttempt: 'Source missing'}
        });
        initializeMapLayers();
        
        // Retry after layers are recreated
        setTimeout(updateMapData, 1000);
        return;
      }

      console.log("Updating map data with films:", films.length);
      updateDebugInfo({ 
        filmsLoaded: films.length,
        layerStatus: {...debugInfo.layerStatus, updateAttempt: 'Updating with ' + films.length + ' films'}
      });
      
      // First validate all coordinates to ensure they're valid
      const validFilms = films.filter(film => {
        // Only keep films with valid coordinates
        const hasValidCoords = film.coordinates && 
                            typeof film.coordinates.lat === 'number' && 
                            typeof film.coordinates.lng === 'number' &&
                            !isNaN(film.coordinates.lat) && 
                            !isNaN(film.coordinates.lng);
                            
        if (!hasValidCoords) {
          console.warn(`Film "${film.title}" has invalid coordinates:`, film.coordinates);
        }
        
        // Skip films at 0,0 coordinates (likely parsing errors)
        const isAtOrigin = film.coordinates && 
                          film.coordinates.lat === 0 && 
                          film.coordinates.lng === 0;
                          
        if (isAtOrigin) {
          console.warn(`Film "${film.title}" is at 0,0 coordinates, likely an error`);
        }
        
        return hasValidCoords && !isAtOrigin;
      });
      
      console.log(`Found ${validFilms.length} films with valid coordinates out of ${films.length} total`);
      updateDebugInfo({ 
        layerStatus: {...debugInfo.layerStatus, validFilms: validFilms.length}
      });
      
      // Create GeoJSON feature collection with only valid coordinates
      const geojson = {
        type: 'FeatureCollection',
        features: validFilms.map(film => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [film.coordinates.lng, film.coordinates.lat] // Mapbox expects [longitude, latitude]
          },
          properties: {
            id: film.id,
            title: film.title,
            location: film.location,
            year: film.year,
            description: film.description,
            director: film.director,
            image_url: film.image_url || ""
          }
        }))
      };

      // Set the data on the source
      const source = map.current.getSource('films');
      if (source) {
        console.log("Updating films source with", geojson.features.length, "features");
        source.setData(geojson);
        
        updateDebugInfo({ 
          dataInitialized: true,
          layerStatus: {...debugInfo.layerStatus, dataUpdated: geojson.features.length + ' features'}
        });
        
        // Verify the update worked by checking the layer visibility
        setTimeout(() => {
          checkAndFixLayers();
        }, 500);
      } else {
        console.warn("Films source not found on map");
        updateDebugInfo({ 
          layerStatus: {...debugInfo.layerStatus, updateError: 'Source disappeared'}
        });
        
        // Try to reinitialize
        layersInitializedRef.current = false;
        initializeMapLayers();
        
        // Retry data update
        setTimeout(updateMapData, 1000);
      }
    } catch (error) {
      console.error("Error updating map data:", error);
      updateDebugInfo({ 
        layerStatus: {...debugInfo.layerStatus, updateError: error.message}
      });
      
      // Try to recover
      setTimeout(() => {
        checkAndFixLayers();
        updateMapData();
      }, 2000);
    }
  };

  // Fetch films data
  useEffect(() => {
    const fetchFilms = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Instead of calling getAllApprovedFilms which might not be properly parsing coordinates,
        // we'll use our new database function that extracts coordinates correctly
        const { data, error } = await supabase.rpc('get_approved_films');
        
        if (error) throw error;
        
        console.log('Raw films data from database with extracted coordinates:', data);
        
        // Now the data already contains correctly formatted lng and lat properties
        // No need for complex parsing - just map the data to the expected format
        const formattedFilms = data.map(film => ({
          ...film,
          coordinates: {
            lng: film.lng,
            lat: film.lat
          }
        }));
        
        console.log('Formatted films with coordinates:', formattedFilms);
        updateDebugInfo({ filmsLoaded: formattedFilms.length });
        
        setFilms(formattedFilms);
        setError(null);
      } catch (err) {
        console.error('Error fetching films:', err);
        setError('Failed to load films. Please try again later.');
        updateDebugInfo({ filmsLoadError: err.message });
      } finally {
        setLoading(false);
      }
    };
    fetchFilms();
    
    // In development mode, debug coordinate format issues
    if (process.env.NODE_ENV === 'development') {
      debugCoordinatesFormat();
    }
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

      // Add listener for style data loading
      map.current.on('styledata', () => {
        if (map.current.isStyleLoaded()) {
          console.log("Map style loaded completely");
          updateDebugInfo({ styleLoaded: true });
          
          // Try to initialize layers after style loads
          if (!layersInitializedRef.current) {
            initializeMapLayers();
            
            // If films data is already loaded, update the map
            if (films.length > 0) {
              updateMapData();
            }
          }
        }
      });

      // Original load event
      map.current.on('load', () => {
        console.log("Map loaded event fired");
        setMapLoaded(true);
        updateDebugInfo({ mapInitialized: true });
        
        // Initialize layers and add data if available
        if (!layersInitializedRef.current) {
          initializeMapLayers();
        }
        
        // If films data is already loaded, update the map
        if (films.length > 0) {
          updateMapData();
        }
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      mapInitializedRef.current = true;

      // Safety timeout to ensure initialization happens
      setTimeout(() => {
        if (map.current && !layersInitializedRef.current) {
          console.log("Safety initialization after timeout");
          updateDebugInfo({ safetyInitTriggered: true });
          initializeMapLayers();
          
          // If films data is already loaded, update the map
          if (films.length > 0) {
            updateMapData();
          }
        }
      }, 3000);

      // Add click handlers for clusters
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

      // Add click handler for individual film points
      map.current.on('click', 'unclustered-point', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const properties = e.features[0].properties;
        
        // Find the full film data in our state by ID
        const film = films.find(f => f.id === properties.id);
        
        // Create a popup with title and year
        let popupContent = `
          <div class="p-3">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <h3 style="font-weight: bold; margin: 0;">${properties.title} (${properties.year})</h3>
            </div>
            <p style="font-size: 0.875rem; margin-top: 8px;"><strong>Location:</strong> ${properties.location}</p>
        `;
        
        // Add director if available (check both film object and properties)
        const director = film?.director || properties.director;
        if (director) {
          popupContent += `<p style="font-size: 0.875rem; margin-top: 4px;"><strong>Director:</strong> ${director}</p>`;
        }
        
        // Add image if available
        if (film?.image_url || properties.image_url) {
          popupContent += `
            <div style="margin-top: 8px; margin-bottom: 8px;">
              <img src="${properties.image_url}" alt="${properties.title}" 
                   style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;">
            </div>
          `;
        }
        
        // Add view details link
        popupContent += `
            <a href="/films/${properties.id}" 
               style="font-size: 0.875rem; color: #3b82f6; display: block; margin-top: 8px; text-decoration: none;">
              View details
            </a>
          </div>
        `;
        
        // Create the popup with custom options
        new mapboxgl.Popup({
          maxWidth: '300px',
          className: 'custom-popup', // We'll add CSS for this
          closeButton: true,
          closeOnClick: false
        })
          .setLngLat(coordinates)
          .setHTML(popupContent)
          .addTo(map.current);
      });

      // Add click handler for adding new locations
      map.current.on('click', (e) => {
        // Don't allow adding markers in readOnly mode
        if (readOnly) return;
      
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['clusters', 'unclustered-point']
        });
        
        // If clicked on an existing marker or cluster, don't add a new marker
        if (features.length > 0) return;
      
        // Remove existing temporary marker and popup if any
        if (window.tempMarker) {
          window.tempMarker.remove();
        }
        if (window.tempPopup) {
          window.tempPopup.remove();
        }
      
        // Get coordinates
        const coordinates = {
          lng: e.lngLat.lng,
          lat: e.lngLat.lat
        };
      
        // Start reverse geocoding to get location name
        reverseGeocode(coordinates.lng, coordinates.lat)
          .then(placeName => {
            if (placeName) {
              setNewFilm(prev => ({
                ...prev,
                location: placeName
              }));
            }
          });
      
        // Update selected location
        setSelectedLocation(coordinates);
        
        // Add a temporary marker
        window.tempMarker = new mapboxgl.Marker({ color: '#ff69b4' })
          .setLngLat(coordinates)
          .addTo(map.current);
      
        // Create a popup with the confirmation button
        const popupContent = document.createElement('div');
        popupContent.className = 'confirmation-popup';
        
        // Add the confirm button
        const confirmButton = document.createElement('button');
        confirmButton.className = 'bg-grey text-white py-1 px-3 rounded text-sm hover:bg-primary/90 transition-colors';
        confirmButton.textContent = 'Add a film here?';
        confirmButton.onclick = (e) => {
          e.preventDefault();
          
          // Save the confirmed location
          setConfirmedLocation(coordinates);

          // Open the modal
          setShowAddModal(true);
          
          // Close the popup but keep the marker
          if (window.tempPopup) {
            window.tempPopup.remove();
          }
        };
        
        // Add button to the popup content
        popupContent.appendChild(confirmButton);
        
        // Create and show the popup
        window.tempPopup = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          anchor: 'top',
          offset: [0, -10],
          className: 'confirmation-popup-container'
        })
          .setLngLat(coordinates)
          .setDOMContent(popupContent)
          .addTo(map.current);
          
        // When popup is closed, also remove the marker
        window.tempPopup.on('close', () => {
          if (window.tempMarker && !showAddModal) {
            window.tempMarker.remove();
            window.tempMarker = null;
            setSelectedLocation(null);
          }
        });
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
      updateDebugInfo({ initError: error.message });
    }
    
    return () => {
      // Clean up timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      // Clean up map instance
      if (map.current) {
        map.current.remove();
        mapInitializedRef.current = false;
        layersInitializedRef.current = false;
      }
    };
  }, []);

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
      // Validate coordinates (longitude: -180 to 180, latitude: -90 to 90)
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        console.warn('Invalid coordinates:', lng, lat);
        return `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
      
      // Format coordinates properly - Mapbox expects "longitude,latitude"
      const formattedCoords = `${lng.toFixed(6)},${lat.toFixed(6)}`;
      
      console.log('Geocoding request for coordinates:', formattedCoords);
      
      const response = await fetch(`/api/geocode?query=${encodeURIComponent(formattedCoords)}`);
      
      // Log the response status for debugging
      console.log('Geocoding response status:', response.status);
      
      if (!response.ok) {
        console.error(`Geocoding error: Status ${response.status}`);
        // Return a fallback instead of throwing
        return `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      
      // Fallback if no features found
      return `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Return a fallback value instead of failing
      return `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
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
    
    // Use confirmedLocation if available, otherwise use selectedLocation
    const locationToUse = confirmedLocation || selectedLocation;
    
    if (!locationToUse) {
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
      
      // Upload image if provided
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadFilmImage(imageFile);
      }
      
      // Prepare film data with absolute certainty about the user ID
      const filmData = {
        title: newFilm.title || "Untitled Film",
        director: newFilm.director || null,
        location: newFilm.location || `Location at ${locationToUse.lat.toFixed(4)}, ${locationToUse.lng.toFixed(4)}`,
        // Store PostGIS point data - ensure correct formatting
        coordinates: `POINT(${locationToUse.lng} ${locationToUse.lat})`,
        year: parseInt(newFilm.year, 10) || new Date().getFullYear(),
        description: newFilm.description || "No description provided",
        // Use the ID directly from the session
        user_id: sessionData.session.user.id,
        status: 'pending', // New films are pending until approved
        image_url: imageUrl
      };
      
      console.log('Film data being submitted:', filmData);
      
      // Submit to the database
      const addedFilm = await addFilm(filmData);
      
      // Format for local state
      const newFilmForState = {
        ...addedFilm,
        coordinates: {
          lng: locationToUse.lng,
          lat: locationToUse.lat
        }
      };
      
      // Update local state
      setFilms(prevFilms => [...prevFilms, newFilmForState]);
      
      // Reset form
      setNewFilm({ title: '', director: '', location: '', year: '', description: '' });
      setSelectedLocation(null);
      setConfirmedLocation(null);
      setImageFile(null);
      setShowAddModal(false);
      
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
    setShowAddModal(false);
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

  // Update map data whenever films change or map loads
  useEffect(() => {
    if (films.length > 0 && mapLoaded) {
      console.log('Films changed or map loaded, updating map data...');
      updateDebugInfo({ 
        filmsLoaded: films.length,
        updateTriggered: 'films/mapLoaded change' 
      });
      updateMapData();
    }
  }, [films, mapLoaded]);

  // Force a map data refresh if layers aren't visible after a delay
  useEffect(() => {
    if (mapLoaded && films.length > 0) {
      // After 2 seconds, check if layers are visible and fix if needed
      const timeout = setTimeout(() => {
        if (!layersInitializedRef.current || !checkAndFixLayers()) {
          console.log("Layers not properly created, reinitializing");
          updateDebugInfo({ forcedReinit: true });
          
          layersInitializedRef.current = false;
          initializeMapLayers();
          setTimeout(updateMapData, 500);
        }
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [mapLoaded, films.length]);

  // Debug authentication state
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (user) {
        console.log('Authenticated user:', user);
        console.log('User ID:', user.id);
        updateDebugInfo({ authenticated: true, userId: user.id });
      } else {
        console.log('No authenticated user');
        updateDebugInfo({ authenticated: false });
      }
    }
  }, [user]);

  // Function to manually force data refresh
  const forceDataRefresh = () => {
    // Reinitialize layers
    layersInitializedRef.current = false;
    if (initializeMapLayers()) {
      // If layers initialized successfully, update data
      setTimeout(updateMapData, 500);
    }
  };

  // Function to reset and reinitialize completely
  const hardReset = () => {
    // Remove all map layers and sources
    try {
      if (map.current) {
        ['clusters', 'cluster-count', 'unclustered-point'].forEach(layerId => {
          if (map.current.getLayer(layerId)) {
            map.current.removeLayer(layerId);
          }
        });
        
        if (map.current.getSource('films')) {
          map.current.removeSource('films');
        }
      }
    } catch (e) {
      console.error('Error during hard reset:', e);
    }
    
    // Reset refs and states
    layersInitializedRef.current = false;
    updateDebugInfo({ 
      mapInitialized: true,
      dataInitialized: false,
      layersCreated: false,
      forcedReset: true,
      layerStatus: {}
    });
    
    // Reinitialize
    setTimeout(() => {
      initializeMapLayers();
      setTimeout(updateMapData, 500);
    }, 500);
  };

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
                  onClick={() => {
                    // Reset confirmed location when manually opening the modal
                    // This forces users to select a new location on the map
                    setConfirmedLocation(null);
                    setSelectedLocation(null);
                    setShowAddModal(true);
                  }}
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

      {/* Debug panel - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 z-10 bg-black/70 text-white p-3 rounded text-xs max-w-xs">
          <h3 className="font-bold mb-1">Debug Info</h3>
          <div>Map Initialized: {debugInfo.mapInitialized ? '✅' : '❌'}</div>
          <div>Films Loaded: {debugInfo.filmsLoaded}</div>
          <div>Data Initialized: {debugInfo.dataInitialized ? '✅' : '❌'}</div>
          <div>Layers Created: {debugInfo.layersCreated ? '✅' : '❌'}</div>
          <div>Last Update: {debugInfo.lastUpdate || 'Never'}</div>
          
          <div className="mt-2 flex space-x-2">
            <Button 
              size="sm"
              variant="outline"
              className="text-xs py-1 px-2 h-auto bg-blue-500/20 hover:bg-blue-500/40 text-white"
              onClick={forceDataRefresh}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
            
            <Button 
              size="sm"
              variant="destructive"
              className="text-xs py-1 px-2 h-auto"
              onClick={hardReset}
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* Add Film Modal Dialog */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => {
          setShowAddModal(false);
          setSelectedLocation(null);
          setConfirmedLocation(null);
          setImageFile(null);
          
          // Clear temporary UI elements
          if (window.tempMarker) {
            window.tempMarker.remove();
            window.tempMarker = null;
          }
          if (window.tempPopup) {
            window.tempPopup.remove();
            window.tempPopup = null;
          }
        }}
        title="Add New Film"
      >
        <div className="space-y-4">
          {/* Display warning if no location is selected */}
          {!confirmedLocation && !selectedLocation && (
            <div className="p-3 bg-yellow-100 text-yellow-800 rounded-md mb-4">
              Please select a location on the map first.
              <Button 
                variant="link" 
                onClick={() => {
                  setShowAddModal(false);
                }}
                className="ml-2 p-0 text-yellow-800 underline"
              >
                Close and select location
              </Button>
            </div>
          )}
          
          <p className="text-muted-foreground">
            Your submission will be reviewed before being added to the public archive.
          </p>
          
          <form onSubmit={handleAddFilm} className="space-y-4">
            <Input
              placeholder="Film Title"
              value={newFilm.title}
              onChange={(e) => setNewFilm({...newFilm, title: e.target.value})}
              required
            />
            
            <Input
              placeholder="Director"
              value={newFilm.director}
              onChange={(e) => setNewFilm({...newFilm, director: e.target.value})}
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
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                placeholder="Describe the film and its significance to queer cinema, your identity, or whatever your heart desires :)."
                value={newFilm.description}
                onChange={(e) => setNewFilm({...newFilm, description: e.target.value})}
                required
                className="w-full h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2">Film Image</label>
              <ImageUpload 
                onImageChange={(file) => setImageFile(file)}
              />
              <p className="text-xs text-muted-foreground">
                Upload a still image, poster, or other visual representation of the film
              </p>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedLocation(null);
                  setImageFile(null);
                  if (window.tempMarker) {
                    window.tempMarker.remove();
                  }
                }}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit" 
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : 'Submit Film'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default QueerFilmsMap;