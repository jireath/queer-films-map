'use client';

import { useState } from 'react';
import Link from 'next/link';
import QueerFilmsMap from '@/components/QueerFilmsMap';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <main className="relative w-full h-screen">
      <div className="absolute inset-0">
        <QueerFilmsMap readOnly={true} />
      </div>
      
      {/* Overlay with call to action - fixed positioning in the center */}
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
              onClick={() => setIsLoading(true)}
            >
              {isLoading ? 'Loading...' : 'Sign In to Contribute'}
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}