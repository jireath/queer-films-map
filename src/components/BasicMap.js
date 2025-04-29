import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Don't forget to replace this with your actual token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const BasicMap = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng] = useState(-40);
  const [lat] = useState(20);
  const [zoom] = useState(1.5);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat],
      zoom: zoom,
      projection: 'globe'
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => map.current.remove();
  }, [lng, lat, zoom]);

  return (
    <div className="w-full h-screen">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default BasicMap;