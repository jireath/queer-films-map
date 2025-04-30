// src/app/auth/page.js
'use client';

import React, { useState } from 'react';
import SignInForm from '@/app/auth/SignInForm';
import SignUpForm from '@/app/auth/SignUpForm';
import { Button } from '@/components/ui/button';

export default function AuthPage() {
  // This state manages which form to show - 'signin' or 'signup'
  const [authMode, setAuthMode] = useState('signin');

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 relative"
      style={{
        backgroundImage: "url('/topographic-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      <div className="w-full max-w-md space-y-6 z-10">
        {/* Title and description section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Queer Films Archive</h1>
          <p className="text-muted-foreground">
            {authMode === 'signin' 
              ? 'Welcome back to our collaborative archive of queer cinema'
              : 'Join our community of film scholars and enthusiasts'
            }
          </p>
        </div>

        {/* Toggle buttons for switching between sign in and sign up */}
        <div className="flex gap-4 justify-center">
          <Button
            variant={authMode === 'signin' ? 'default' : 'outline'}
            onClick={() => setAuthMode('signin')}
          >
            Sign In
          </Button>
          <Button
            variant={authMode === 'signup' ? 'default' : 'outline'}
            onClick={() => setAuthMode('signup')}
          >
            Sign Up
          </Button>
        </div>

        {/* Render the appropriate form based on authMode */}
        <div className="transition-all duration-300 ease-in-out">
          {authMode === 'signin' ? <SignInForm /> : <SignUpForm />}
        </div>
      </div>
    </div>
  );
}