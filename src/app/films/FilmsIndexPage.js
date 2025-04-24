'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Search, Film, Loader2 } from 'lucide-react';
import { getAllApprovedFilms } from '@/lib/services/filmService';
import Link from 'next/link';

export default function FilmsPage() {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  
  // Fetch films data
  useEffect(() => {
    const fetchFilms = async () => {
      try {
        setLoading(true);
        const filmsData = await getAllApprovedFilms();
        setFilms(filmsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching films:', err);
        setError('Failed to load films. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFilms();
  }, []);

  // Filter films based on search term and filters
  const filteredFilms = films.filter(film => {
    // Search term filter (case insensitive)
    const matchesSearch = searchTerm === '' || 
      film.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      film.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Year filter
    const matchesYear = filterYear === '' || 
      film.year.toString() === filterYear;
    
    // Location filter (case insensitive)
    const matchesLocation = filterLocation === '' || 
      film.location.toLowerCase().includes(filterLocation.toLowerCase());
    
    return matchesSearch && matchesYear && matchesLocation;
  });

  // Organize films by decade for easier browsing
  const filmsByDecade = filteredFilms.reduce((acc, film) => {
    const decade = Math.floor(film.year / 10) * 10;
    if (!acc[decade]) {
      acc[decade] = [];
    }
    acc[decade].push(film);
    return acc;
  }, {});

  // Sort decades
  const sortedDecades = Object.keys(filmsByDecade).map(Number).sort((a, b) => b - a);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Queer Films Archive</h1>
          <p className="text-muted-foreground">
            Explore our collection of {films.length} films in queer cinema history
          </p>
        </div>
        
        <Link href="/" passHref>
          <Button variant="outline" className="flex items-center">
            <MapPin className="mr-2 h-4 w-4" />
            View Map
          </Button>
        </Link>
      </div>
      
      {/* Search and filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find films by title, year, or location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or description"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div>
              <Input
                placeholder="Filter by year"
                type="number"
                min="1895"
                max={new Date().getFullYear()}
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              />
            </div>
            
            <div>
              <Input
                placeholder="Filter by location"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        {(searchTerm || filterYear || filterLocation) && (
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredFilms.length} of {films.length} films
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setFilterYear('');
                setFilterLocation('');
              }}
            >
              Clear Filters
            </Button>
          </CardFooter>
        )}
      </Card>
      
      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading films...</span>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <Card className="border-destructive mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Results */}
      {!loading && !error && (
        <>
          {filteredFilms.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Films Found</h2>
                <p className="text-muted-foreground mb-4">
                  We couldn't find any films matching your search criteria.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterYear('');
                    setFilterLocation('');
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {sortedDecades.map(decade => (
                <div key={decade}>
                  <h2 className="text-2xl font-bold mb-4 border-b pb-2">
                    {decade}s
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filmsByDecade[decade]
                      .sort((a, b) => a.year - b.year)
                      .map(film => (
                        <Link 
                          key={film.id}
                          href={`/films/${film.id}`}
                          className="block transition-all hover:scale-[1.02]"
                        >
                          <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                              <CardTitle>{film.title}</CardTitle>
                              <CardDescription className="flex items-center gap-4">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span>{film.year}</span>
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  <span>{film.location}</span>
                                </div>
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="line-clamp-3 text-sm">
                                {film.description}
                              </p>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}