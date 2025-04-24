// src/lib/supabase/client.js - Improved with error handling and debugging
import { createBrowserClient } from '@supabase/ssr';

let supabaseInstance = null;

export function createClient() {
  // Only create a new instance if one doesn't exist already
  if (supabaseInstance) return supabaseInstance;
  
  // Log environment variable status (without revealing actual values)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Supabase URL defined:', !!url);
  console.log('Supabase Anon Key defined:', !!key);
  
  if (!url || !key) {
    console.error('Supabase environment variables are missing!');
    // Provide a fallback or throw an informative error
    throw new Error('Supabase configuration is incomplete. Please check your environment variables.');
  }
  
  try {
    // Create the client
    supabaseInstance = createBrowserClient(url, key, {
      // Make sure to include this auth configuration
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    
    // Check if auth is initialized
    console.log('Supabase client created successfully');
    return supabaseInstance;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    throw error;
  }
}
