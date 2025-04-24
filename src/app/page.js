'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QueerFilmsMap from '@/components/QueerFilmsMap';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading } = useAuth();
  
  // Wait for auth state to be determined before rendering
  useEffect(() => {
    if (!loading) {
      setIsLoading(false);
    }
  }, [loading]);

  // Show loading state while determining authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <main className="relative w-full h-screen">
      <div className="absolute inset-0">
        {/* Pass auth state to QueerFilmsMap to control editability */}
        <QueerFilmsMap readOnly={!user} />
      </div>
      
      {/* Only show overlay when not authenticated */}
      {/* {!user && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full m-4 text-center space-y-4">
            <h1 className="text-2xl font-bold">Queer Films Archive</h1>
            <p className="text-muted-foreground">
              Join our community to contribute to this growing archive of queer cinema locations and stories.
            </p>
            <Link href="/auth" passHref>
              <Button 
                className="w-full"
                disabled={isLoading}
              >
                Sign In to Contribute
              </Button>
            </Link>
          </div>
        </div>
      )} */}
    </main>
  );
}