'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Create the authentication context
const AuthContext = createContext();

// This provider component will wrap your application
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const supabase = createClient();

  // Check for user session and update state
  useEffect(() => {
    let mounted = true;

    // Get the current session
    const getSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          if (mounted) {
            setError(sessionError);
          }
          return;
        }
        
        if (mounted) {
          setUser(session?.user || null);
          setError(null);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        if (mounted) {
          setError(error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    // Listen for authentication state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setUser(session?.user || null);
        setLoading(false);
        setError(null);
      }
    });

    // Clean up subscription and mounted flag when component unmounts
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error.message);
      setError(error);
    }
  };

  // Provide the auth context to children components
  return (
    <AuthContext.Provider value={{ user, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}