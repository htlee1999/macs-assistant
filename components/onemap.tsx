// onemap.tsx - Updated to use H3HeatmapLayer correctly
import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import H3HeatmapLayer from './H3HeatmapLayer';

// Define the location data interface
interface LocationData {
  name: string;
  location: string;
  locationX: number;
  locationY: number;
}

// Define component props
interface OneMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  locations?: LocationData[];
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

// Fix marker icon issue
if (typeof window !== 'undefined') {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Helper function to validate and correct coordinates
const validateCoordinates = (lat: number, lng: number): [number, number] => {
  // Define valid bounds for Singapore
  const validLatRange = [1.14, 1.5]; // Singapore latitude range
  const validLngRange = [103.5, 104.5]; // Singapore longitude range
  
  // Check if coordinates are within valid ranges
  const isValidLat = lat >= validLatRange[0] && lat <= validLatRange[1];
  const isValidLng = lng >= validLngRange[0] && lng <= validLngRange[1];
  
  // If coordinates are valid, return them
  if (isValidLat && isValidLng) {
    return [lat, lng];
  }
  
  // If coordinates are swapped, swap them back
  if (lng >= validLatRange[0] && lng <= validLatRange[1] && 
      lat >= validLngRange[0] && lat <= validLngRange[1]) {
    console.log(`Swapped coordinates detected, correcting: [${lat}, ${lng}] to [${lng}, ${lat}]`);
    return [lng, lat];
  }
  
  // If coordinates are completely invalid, return default Singapore center
  console.log(`Invalid coordinates detected: [${lat}, ${lng}], using default`);
  return [1.3521, 103.8198]; // Default to Singapore center
};

// Component to handle theme changes and tile layer updates
const ThemeTileLayer = ({ theme }: { theme: string | undefined }) => {
  const map = useMap();
  
  // Get tile URL based on theme
  const getTileUrl = (currentTheme: string | undefined) => {
    return currentTheme === 'dark'
      ? 'https://www.onemap.gov.sg/maps/tiles/Night/{z}/{x}/{y}.png'
      : 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png';
  };
  
  useEffect(() => {
    const tileUrl = getTileUrl(theme);
    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });
    
    // Add new tile layer
    L.tileLayer(tileUrl, {
      detectRetina: true,
      maxZoom: 19,
      minZoom: 11,
      attribution: '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;©&nbsp;contributors&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'
    }).addTo(map);
  }, [theme, map]);
  
  return null;
};

const OneMap: React.FC<OneMapProps> = ({
  center = [1.3521, 103.8198], // Singapore center
  zoom = 12,
  height = '800px',
  locations = [],
  generateRandomCoordinates = false,
  showPopups = true,
  h3Options = {
    resolution: 7,
    fillColor: '#3182bd',
    strokeColor: '#1e3a8a',
    strokeWidth: 2,
    opacity: 0.7,
    showCellId: false,
    enableHover: true
  },
  showH3Grid = true
}) => {
  const { theme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [processedLocations, setProcessedLocations] = useState<LocationData[]>([]);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  
  // Track map zoom level changes
  const MapZoomMonitor = () => {
    const map = useMap();
    
    useEffect(() => {
      const handleZoom = () => {
        setCurrentZoom(map.getZoom());
      };
      
      map.on('zoomend', handleZoom);
      
      return () => {
        map.off('zoomend', handleZoom);
      };
    }, [map]);
    
    return null;
  };
  
  // Process location data
  useEffect(() => {
    try {
      if (locations.length > 0) {
        let newLocations: LocationData[] = [...locations];
        const processedPoints: [number, number][] = [];
        
        // Generate random coordinates if needed
        if (generateRandomCoordinates) {
          newLocations = locations.map(loc => {
            const baseX = 1.3521; // Singapore center lat
            const baseY = 103.8198; // Singapore center lng
            const offset = () => (Math.random() - 0.5) * 0.05;
            
            return {
              ...loc,
              locationX: baseX + offset(),
              locationY: baseY + offset()
            };
          });
        }
        
        // Process each location for marker display
        newLocations.forEach(location => {
          // Validate and possibly correct coordinates for markers
          const [lat, lng] = validateCoordinates(location.locationX, location.locationY);
          processedPoints.push([lat, lng]);
        });
        
        setProcessedLocations(newLocations);
        setPoints(processedPoints);
        console.log(`Processed ${processedPoints.length} location points`);
      }
    } catch (err) {
      console.error('Error processing location data:', err);
      setError('Failed to process location data');
    }
  }, [locations, generateRandomCoordinates]);
  
  if (error) {
    return <div className="text-red-500 p-5">{error}</div>;
  }
  
  // Define bounds for Singapore
  const sw = L.latLng(1.144, 103.535);
  const ne = L.latLng(1.494, 104.502);
  const bounds = L.latLngBounds(sw, ne);
  
  // Adjust colors based on theme
  const themeAwareOptions = {
    ...h3Options,
    fillColor: theme === 'dark' ? '#4299e1' : h3Options.fillColor,
    strokeColor: theme === 'dark' ? '#2b6cb0' : h3Options.strokeColor,
  };
  
  return (
    <MapContainer 
      center={center}
      zoom={zoom} 
      style={{ height }} 
      className="rounded-lg overflow-hidden"
      maxBounds={bounds}
      minZoom={11}
      maxZoom={19}
    >
      <ThemeTileLayer theme={theme} />
      <MapZoomMonitor />
      
      {/* Add H3 hexagon grid layer when showH3Grid is true and we have locations */}
      {showH3Grid && (
        <H3HeatmapLayer 
          locations={processedLocations}
          options={themeAwareOptions}
        />
      )}
      
      {/* Add markers but only show at higher zoom levels */}
      {locations.map((location, index) => {
        // Only proceed if we have processed coordinates for this index
        if (points[index]) {
          const [lat, lng] = points[index];
          
          // Only show markers at higher zoom levels (16+) when hexagons are hidden
          return (
            <Marker 
              key={index} 
              position={[lat, lng]}
              opacity={currentZoom >= 16 ? 1 : 0} // Only visible at high zoom
            >
              {showPopups && (
                <Popup>
                  <strong>{location.name}</strong><br />
                  {location.location}<br />
                  <small>Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}</small>
                </Popup>
              )}
            </Marker>
          );
        }
        return null;
      })}
    </MapContainer>
  );
};

export default OneMap;