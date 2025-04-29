// src/lib/services/filmService.js
import { createClient } from '@/lib/supabase/client';

export async function getAllApprovedFilms() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('films')
    .select('id, title, location, coordinates, year, description, director, image_url, user_id, created_at')
    .eq('status', 'approved');
    
  if (error) throw error;
  return data;
}

export async function getUserFilms(userId) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('films')
    .select('id, title, location, coordinates, year, description, director, image_url, status, rejection_reason, created_at')
    .eq('user_id', userId);
    
  if (error) throw error;
  return data;
}

/**
 * Add a new film to the database
 */
export async function addFilm(filmData) {
  try {
    const supabase = createClient();
    
    // Log auth status
    const { data: authData } = await supabase.auth.getSession();
    console.log('Current auth status before insert:', !!authData.session);
    console.log('User ID from session:', authData.session?.user?.id);
    console.log('Film data user_id:', filmData.user_id);
    
    // Ensure user IDs match
    if (authData.session?.user?.id !== filmData.user_id) {
      console.warn('User ID mismatch! Session ID vs film user_id:', 
        authData.session?.user?.id, filmData.user_id);
    }
    
    // Sanitize and validate the data
    const cleanData = {
      ...filmData,
      // Ensure coordinates are properly formatted
      coordinates: typeof filmData.coordinates === 'string' 
        ? filmData.coordinates 
        : `POINT(${filmData.coordinates.lng} ${filmData.coordinates.lat})`,
      // Ensure year is an integer
      year: typeof filmData.year === 'number' 
        ? filmData.year 
        : parseInt(filmData.year, 10) || new Date().getFullYear()
    };
    
    console.log('Submitting film with data:', cleanData);
    
    // Add the film
    const { data, error } = await supabase
      .from('films')
      .insert(cleanData)
      .select()
      .single();
      
    if (error) {
      console.error('Supabase error details:', error);
      throw error;
    }
    
    console.log('Film added successfully:', data);
    return data;
  } catch (error) {
    console.error('Detailed error in addFilm:', error);
    throw error;
  }
}
  
export async function updateFilm(id, filmData) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('films')
    .update(filmData)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteFilm(id) {
  try {
    console.log(`Attempting to delete film with ID: ${id}`);
    const supabase = createClient();
    
    // First verify we have a valid session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Authentication error. Please sign in again.');
    }
    
    if (!sessionData.session) {
      throw new Error('No active session. Please sign in again.');
    }
    
    // Get the film to check ownership
    const { data: filmData, error: filmError } = await supabase
      .from('films')
      .select('user_id, image_url')
      .eq('id', id)
      .single();
      
    if (filmError) {
      console.error('Error fetching film:', filmError);
      throw filmError;
    }
    
    if (!filmData) {
      throw new Error('Film not found');
    }
    
    // Verify ownership (unless user is admin)
    const userId = sessionData.session.user.id;
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('Error fetching user profile:', userError);
    }
    
    const isAdmin = userData?.is_admin || false;
    
    if (filmData.user_id !== userId && !isAdmin) {
      throw new Error('You do not have permission to delete this film');
    }
    
    // Delete the image from storage if it exists
    if (filmData.image_url) {
      try {
        // Extract the path from the URL
        const urlParts = filmData.image_url.split('/');
        const filePath = urlParts[urlParts.length - 1];
        
        const { error: storageError } = await supabase
          .storage
          .from('film-images')
          .remove([filePath]);
          
        if (storageError) {
          console.error('Error deleting image file:', storageError);
          // Continue with deletion even if image removal fails
        }
      } catch (err) {
        console.error('Error processing image deletion:', err);
        // Continue with film deletion anyway
      }
    }
    
    // Proceed with deletion
    const { error: deleteError } = await supabase
      .from('films')
      .delete()
      .eq('id', id);
      
    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw deleteError;
    }
    
    console.log(`Film ${id} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Error in deleteFilm:', error);
    throw error;
  }
}

/**
 * Upload a film image to Supabase Storage
 */
export async function uploadFilmImage(file) {
  try {
    if (!file) return null;
    
    const supabase = createClient();
    
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    // Upload the file
    const { data, error } = await supabase
      .storage
      .from('film-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) throw error;
    
    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('film-images')
      .getPublicUrl(data.path);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * For admin use - get all films regardless of status
 */
export async function getAllFilms() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('films')
    .select('*, profiles(username, full_name)');
    
  if (error) throw error;
  return data;
}