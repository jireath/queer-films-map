'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Plus, X, Search, Loader2, Info, Video } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '@/contexts/AuthContext';
import { getAllApprovedFilms, addFilm, uploadFilmImage } from '@/lib/services/filmService';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import ImageUpload from '@/components/ImageUpload';
import Modal from '@/components/Modal'; // Import the Modal component

// Rest of your imports and setup code...

const QueerFilmsMap = ({ readOnly: explicitReadOnly }) => {
  // Your existing state variables...
  
  // Update showAddForm to showAddModal
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Rest of your state management...

  // Modify handleAddFilm to close the modal at the end
  const handleAddFilm = async (e) => {
    e.preventDefault();
    
    // Your existing code for form submission...
    
    try {
      setSubmitting(true);
      
      // Upload image if provided
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadFilmImage(imageFile);
      }
      
      // Prepare film data...
      
      // Submit to the database
      const addedFilm = await addFilm(filmData);
      
      // Reset form
      setNewFilm({ title: '', director: '', location: '', year: '', description: '' });
      setSelectedLocation(null);
      setImageFile(null);
      setShowAddModal(false); // Close the modal instead of the form
      
      // Remove temporary marker
      if (window.tempMarker) {
        window.tempMarker.remove();
      }
      
      // Show success message
      alert('Film added successfully! It will be visible to others after review.');
      
    } catch (error) {
      // Your error handling...
    } finally {
      setSubmitting(false);
    }
  };

  // Modify your map click handler to open the modal
  useEffect(() => {
    // Your map initialization code...
    
    // Modify the click handler
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
          if (placeName) {
            setNewFilm(prev => ({
              ...prev,
              location: placeName || `Location at ${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}`
            }));
          }
        });

      setSelectedLocation({
        lng: e.lngLat.lng,
        lat: e.lngLat.lat
      });
      
      // Open the modal instead of showing the form
      setShowAddModal(true);
    });
    
    // Rest of your map setup...
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
                  onClick={() => setShowAddModal(true)}
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
            {/* Your existing search content */}
          </CardContent>
        </Card>
      </div>

      {/* Add Film Modal Dialog */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => {
          setShowAddModal(false);
          setSelectedLocation(null);
          setImageFile(null);
          if (window.tempMarker) {
            window.tempMarker.remove();
          }
        }}
        title="Add New Film"
      >
        <div className="space-y-4">
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
                placeholder="Describe the film and its significance to queer cinema"
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
      
      {/* Film details panel (when a film is selected) */}
      {selectedFilm && (
        <Card className="absolute bottom-4 right-4 z-10 w-96">
          {/* Your existing film details panel */}
        </Card>
      )}
    </div>
  );
};

export default QueerFilmsMap;