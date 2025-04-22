'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// Create the authentication context
const AuthContext = createContext();

// This provider component will wrap your application
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  let supabase;

  // Initialize Supabase client
  try {
    supabase = createClient();
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    setError('Authentication service initialization failed');
    setLoading(false);
  }

  // Check for user session and update state
  useEffect(() => {
    if (!supabase) return;
    
    let mounted = true;

    // Get the current session
    const getSession = async () => {
      try {
        console.log('Checking for existing session...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          if (mounted) {
            setError(sessionError);
          }
          return;
        }
        
        if (mounted) {
          if (session?.user) {
            console.log('User is authenticated:', session.user.email);
            setUser(session.user);
          } else {
            console.log('No active session found');
            setUser(null);
          }
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
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (mounted) {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
        setError(null);
      }
      
      // Handle specific auth events
      if (event === 'SIGNED_IN') {
        console.log('User signed in, refreshing page');
        router.refresh();
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, refreshing page');
        router.refresh();
      }
    });

    // Clean up subscription and mounted flag when component unmounts
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase]);

  // Sign out function
  const signOut = async () => {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      
      console.log('Signing out...');
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      console.log('Sign out successful');
      
      // After signing out, redirect to home
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error.message);
      setError(error);
    }
  };

  // Debug function to check auth state (for development only)
  const checkAuthState = async () => {
    if (!supabase) return { error: 'Supabase client not initialized' };
    
    try {
      const { data, error } = await supabase.auth.getSession();
      return { data, error, user };
    } catch (error) {
      return { error };
    }
  };

  // Create auth context value
  const value = {
    user,
    loading,
    error,
    signOut,
    ...(process.env.NODE_ENV === 'development' && { checkAuthState })
  };

  // Provide the auth context to children components
  return (
    <AuthContext.Provider value={value}>
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