'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';

// Type definition for McDonald's location data
interface LocationData {
  planningArea: string;
  location: string;
  locationX: number;
  locationY: number;
}

// Use dynamic import with ssr: false to avoid server-side rendering issues with Leaflet
const OneMap = dynamic(() => import('@/components/onemap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[800px] items-center justify-center bg-muted">
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
    </div>
  )
});

export default function OneMapPage() {
  const { theme } = useTheme();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        // Make sure to use a path starting with "/" for the public folder
        const response = await fetch('/outlets.json');
        
        if (!response.ok) {
          throw new Error(`Failed to load location data: ${response.statusText}`);
        }
        
        const data: LocationData[] = await response.json();
        setLocations(data);
      } catch (err) {
        console.error('Error loading location data:', err);
        setError('Failed to load location data');
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Transform data to match OneMap component props
  const transformedLocations = locations.map(item => ({
    name: item.planningArea,
    location: item.location,
    locationX: item.locationX,
    locationY: item.locationY
  }));

  return (
    <div className="container space-y-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">OneMap Singapore</h1>
        <div className="text-sm text-muted-foreground">
          {theme === 'dark' ? 'Night Mode' : 'Day Mode'}
        </div>
      </div>
      
      {error ? (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <p className="mt-2">Please make sure outlets.json is available in the public directory.</p>
        </div>
      ) : (
        <OneMap 
          height="800px"
          zoom={12}
          center={[1.3521, 103.8198]} // Center of Singapore
          locations={transformedLocations}
          generateRandomCoordinates={false} // Enable this since all locations have the same coordinates
          showPopups={true}
        />
      )}
      
      {!error && (
        <div className="text-sm text-muted-foreground">
          Displaying {locations.length} McDonald's locations across Singapore in {theme === 'dark' ? 'night' : 'day'} mode.
          {transformedLocations.length > 0 && 
            " Locations are shown with simulated coordinates for demonstration purposes."}
        </div>
      )}
    </div>
  );
}