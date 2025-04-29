import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }
  
  // Log the request for debugging
  console.log('Geocoding API request:', query);
  
  try {
    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error('Mapbox token is missing');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }
    
    // Determine if this is a forward or reverse geocoding request
    const isReverseGeocode = query.includes(',') && 
                            !isNaN(parseFloat(query.split(',')[0])) && 
                            !isNaN(parseFloat(query.split(',')[1]));
    
    let endpoint;
    if (isReverseGeocode) {
      // For reverse geocoding (coordinates to place name)
      // Mapbox expects coordinates in longitude,latitude format
      endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${accessToken}&limit=1`;
    } else {
      // For forward geocoding (place name to coordinates)
      endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${accessToken}&limit=5`;
    }
    
    console.log('Calling Mapbox endpoint:', endpoint.replace(accessToken, 'REDACTED'));
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      console.error(`Mapbox API error: ${response.status}`);
      return NextResponse.json(
        { error: `Geocoding service returned status ${response.status}` }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json({ error: 'Failed to geocode location' }, { status: 500 });
  }
}
