'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import QueerFilmsMap from '@/components/QueerFilmsMap';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If user is not authenticated, show limited view with sign-in prompt
  if (!user) {
    return (
      <main className="relative">
        <div className="absolute inset-0">
          <QueerFilmsMap readOnly={true} />
        </div>
        
        {/* Overlay with call to action */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full m-4 text-center space-y-4">
            <h1 className="text-2xl font-bold">Queer Films Archive</h1>
            <p className="text-muted-foreground">
              Join our community to contribute to this growing archive of queer cinema locations and stories.
            </p>
            <Button 
              onClick={() => router.push('/auth')}
              className="w-full"
            >
              Sign In to Contribute
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // If user is authenticated, show full interface
  return (
    <main>
      <QueerFilmsMap />
    </main>
  );
}