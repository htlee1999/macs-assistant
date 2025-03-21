import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HexbinLayer from './HexbinLayer'; // Import our custom component

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
  hexbinOptions?: {
    radius?: number;
    opacity?: number;
    colorRange?: string[];
    radiusRange?: [number, number];
  };
}

// Fix marker icon issue
if (typeof window !== 'undefined') {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

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
      attribution: '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'
    }).addTo(map);
  }, [theme, map]);
  
  return null;
};

const OneMap: React.FC<OneMapProps> = ({
  center = [1.2868108, 103.8545349],
  zoom = 12,
  height = '800px',
  locations = [],
  generateRandomCoordinates = false,
  showPopups = true,
  hexbinOptions = {
    radius: 12,
    opacity: 0.7,
    colorRange: ['#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594']
  }
}) => {
  const { theme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<[number, number][]>([]);
  
  // Process location data
  useEffect(() => {
    try {
      if (locations.length > 0) {
        const processedPoints: [number, number][] = locations.map(location => {
          let markerLat = location.locationX;
          let markerLng = location.locationY;
          
          // Check if we need to generate random coordinates
          if (generateRandomCoordinates) {
            const baseX = 1.3521;
            const baseY = 103.8198;
            const generateRandomOffset = () => (Math.random() - 0.5) * 0.05;
            markerLat = baseX + generateRandomOffset();
            markerLng = baseY + generateRandomOffset();
          }
          
          return [markerLat, markerLng];
        });
        
        setPoints(processedPoints);
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
      
      {/* Add hexbin layer if we have points */}
      {points.length > 0 && (
        <HexbinLayer 
          data={points}
          options={{
            radius: hexbinOptions.radius,
            opacity: hexbinOptions.opacity,
            colorRange: hexbinOptions.colorRange,
          }}
        />
      )}
      
      {/* Add markers */}
      {locations.map((location, index) => {
        let markerLat = location.locationX;
        let markerLng = location.locationY;
        
        // Check if we're using random coordinates
        if (generateRandomCoordinates && points[index]) {
          markerLat = points[index][0];
          markerLng = points[index][1];
        }
        
        return (
          <Marker key={index} position={[markerLat, markerLng]}>
            {showPopups && (
              <Popup>
                <strong>{location.name}</strong><br />
                {location.location}
              </Popup>
            )}
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default OneMap;