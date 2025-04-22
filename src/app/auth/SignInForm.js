import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // Initialize Supabase client with error handling
  const getSupabaseClient = () => {
    try {
      return createClient();
    } catch (err) {
      setError('Failed to initialize authentication client: ' + err.message);
      setDebugInfo(JSON.stringify({ 
        errorType: err.name, 
        message: err.message,
        stack: err.stack?.split('\n')[0] || 'No stack trace'
      }));
      return null;
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setLoading(false);
        return; // Error already set in getSupabaseClient
      }

      console.log('Attempting sign in with:', { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        throw error;
      }

      console.log('Sign in successful, session:', !!data.session);
      
      // Successful sign in - redirect to home page
      router.push('/');
      router.refresh(); // Refresh the page to update auth state
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error.message || 'An unexpected error occurred');
      setDebugInfo(JSON.stringify({ 
        errorType: error.name, 
        message: error.message,
        status: error.status,
        stack: error.stack?.split('\n')[0] || 'No stack trace'
      }));
    } finally {
      setLoading(false);
    }
  };

  // Test connection to Supabase
  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      
      // Simple API call to check connection
      const { error } = await supabase.from('fake_table_just_for_testing').select('count', { count: 'exact', head: true });
      
      // This will likely fail with a 404, but that means the connection works
      if (error && error.code === '42P01') { // Table doesn't exist, which is expected
        setDebugInfo('Connection to Supabase successful!');
      } else if (error) {
        throw error;
      } else {
        setDebugInfo('Connection to Supabase successful!');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setError('Connection test failed: ' + error.message);
      setDebugInfo(JSON.stringify({ 
        errorType: error.name, 
        message: error.message,
        status: error.status || 'unknown',
        code: error.code || 'none'
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In to Queer Films Archive</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignIn} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {debugInfo && (
            <Alert>
              <AlertDescription className="whitespace-pre-wrap text-xs">
                <div className="font-mono overflow-auto">{debugInfo}</div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
          
          {process.env.NODE_ENV === 'development' && (
            <Button 
              type="button"
              variant="outline"
              className="w-full mt-2"
              onClick={testConnection}
              disabled={loading}
            >
              Test Supabase Connection
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}