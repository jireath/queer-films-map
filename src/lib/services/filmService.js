import { createClient } from '@/lib/supabase/client';

export async function getAllApprovedFilms() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('films')
    .select('id, title, location, coordinates, year, description, user_id, created_at')
    .eq('status', 'approved');
    
  if (error) throw error;
  return data;
}

export async function getUserFilms(userId) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('films')
    .select('id, title, location, coordinates, year, description, status, rejection_reason, created_at')
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
      .select('user_id')
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