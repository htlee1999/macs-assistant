'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

// Define the props interface for OneMap component
interface OneMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  locations?: {
    name: string;
    location: string;
    locationX: number;
    locationY: number;
  }[];
  generateRandomCoordinates?: boolean;
  showPopups?: boolean;
  h3Options?: {
    resolution?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    opacity?: number;
    showCellId?: boolean;
    enableHover?: boolean;
  };
  showH3Grid?: boolean;
}

// Type definition for McDonald's location data
interface LocationData {
  planningArea: string;
  location: string;
  locationX: number;
  locationY: number;
}

// Use dynamic import with ssr: false to avoid server-side rendering issues with Leaflet
const OneMap = dynamic<OneMapProps>(() => import('@/components/onemap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[800px] items-center justify-center bg-gray-100">
      <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
    </div>
  )
});

export default function OneMapPage() {
  const { theme } = useTheme();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useRandomCoords, setUseRandomCoords] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        // Make sure to use a path starting with "/" for the public folder
        const response = await fetch('/outlets.json');
        
        if (!response.ok) {
          throw new Error(`Failed to load location data: ${response.statusText}`);
        }
        
        const data: LocationData[] = await response.json();
        
        // Validate a sample of coordinates to determine if we need random ones
        const sampleValidation = validateSampleCoordinates(data);
        if (!sampleValidation.valid) {
          console.warn('Coordinate issues detected in data:', sampleValidation.message);
          // Only use random if serious issues detected
          if (sampleValidation.severity === 'high') {
            setUseRandomCoords(true);
          }
        }
        
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

  // Function to validate a sample of coordinates
  const validateSampleCoordinates = (data: LocationData[]) => {
    // Define valid bounds for Singapore
    const validLatRange = [1.14, 1.5]; // Singapore latitude range
    const validLngRange = [103.5, 104.5]; // Singapore longitude range
    
    // Check a sample of 5 locations or all if less than 5
    const sampleSize = Math.min(5, data.length);
    let validCount = 0;
    let swappedCount = 0;
    let invalidCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      const loc = data[i];
      const isValidX = loc.locationX >= validLatRange[0] && loc.locationX <= validLatRange[1];
      const isValidY = loc.locationY >= validLngRange[0] && loc.locationY <= validLngRange[1];
      
      if (isValidX && isValidY) {
        validCount++;
      } else if (loc.locationY >= validLatRange[0] && loc.locationY <= validLatRange[1] && 
                 loc.locationX >= validLngRange[0] && loc.locationX <= validLngRange[1]) {
        swappedCount++;
      } else {
        invalidCount++;
      }
    }
    
    if (validCount === sampleSize) {
      return { valid: true, message: 'All sample coordinates are valid', severity: 'none' };
    } else if (swappedCount > 0) {
      return { 
        valid: false, 
        message: `${swappedCount} of ${sampleSize} samples have swapped coordinates`, 
        severity: 'medium'
      };
    } else if (invalidCount > 0) {
      return { 
        valid: false, 
        message: `${invalidCount} of ${sampleSize} samples have invalid coordinates`, 
        severity: 'high'
      };
    }
    
    return { valid: true, message: 'Coordinates appear valid', severity: 'none' };
  };

  // Transform data to match OneMap component props
  const transformedLocations = locations.map(item => ({
    name: item.planningArea,
    location: item.location,
    locationX: item.locationX,
    locationY: item.locationY
  }));

  // Color scheme based on theme
  const getColors = () => {
    if (theme === 'dark') {
      return {
        fillColor: '#4299e1',     // Lighter blue for dark mode
        strokeColor: '#2b6cb0'    // Medium blue stroke for dark mode
      };
    } else {
      return {
        fillColor: '#3182bd',     // Medium blue for light mode
        strokeColor: '#1e3a8a'    // Darker blue stroke for light mode
      };
    }
  };
  
  const colors = getColors();

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">McDonald's Singapore Outlets</h1>
        <div className="text-sm text-gray-500">
          {theme === 'dark' ? 'Night Mode' : 'Day Mode'}
        </div>
      </div>
      
      {/* Error message */}
      {error ? (
        <div className="rounded-md bg-red-100 p-4 text-red-700">
          <p>{error}</p>
          <p className="mt-2">Please make sure outlets.json is available in the public directory.</p>
        </div>
      ) : (
        <OneMap 
          height="800px"
          zoom={12}
          center={[1.3521, 103.8198]} // Center of Singapore
          locations={transformedLocations}
          generateRandomCoordinates={useRandomCoords}
          showPopups={true}
          showH3Grid={true}
          h3Options={{
            resolution: 7,  // Medium cells by default
            fillColor: colors.fillColor,
            strokeColor: colors.strokeColor,
            strokeWidth: 1,
            opacity: 0.7,
            showCellId: false,
            enableHover: true
          }}
        />
      )}
      
      {!error && (
        <div className="text-sm text-gray-500">
          <p>
            Displaying {locations.length} McDonald's locations across Singapore in {theme === 'dark' ? 'night' : 'day'} mode.
            {useRandomCoords && " Using simulated coordinates due to data issues."}
          </p>
          <p className="mt-1">
            Heatmap shows outlet density - darker blue indicates more outlets in that area.
            Click on a hexagon to see the number of outlets in that cell.
          </p>
        </div>
      )}
    </div>
  );
}