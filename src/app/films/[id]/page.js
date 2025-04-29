// This is a Server Component (no 'use client' directive)
import { createClient } from '@/lib/supabase/server';
import FilmDetailClient from './FilmDetailClient';

export default async function FilmPage({ params }) {
  // We can use params.id directly in a Server Component
  const id = params.id;
  
  let film = null;
  let author = null;
  let error = null;
  
  try {
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
    
    film = {
      ...filmData,
      coordinates
    };
    
    // Fetch author profile
    const { data: authorData } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url')
      .eq('id', filmData.user_id)
      .single();
      
    if (authorData) {
      author = authorData;
    }
    
  } catch (err) {
    console.error('Error fetching film:', err);
    error = err.message;
  }
  
  // Pass pre-fetched data to the client component
  return <FilmDetailClient 
    film={film}
    author={author}
    error={error}
  />;
}