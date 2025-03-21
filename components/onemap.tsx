import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, TileLayer, Marker } from 'leaflet';

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
}

const OneMap: React.FC<OneMapProps> = ({
  center = [1.2868108, 103.8545349],
  zoom = 12,
  height = '800px',
  locations = [],
  generateRandomCoordinates = false,
  showPopups = true,
}) => {
  const { theme } = useTheme();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get tile URL based on theme
  const getTileUrl = (currentTheme: string | undefined) => {
    // If theme is dark, use Night tiles, otherwise use Default
    return currentTheme === 'dark'
      ? 'https://www.onemap.gov.sg/maps/tiles/Night/{z}/{x}/{y}.png'
      : 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png';
  };

  useEffect(() => {
    // Dynamic import for Leaflet to avoid SSR issues in Next.js
    const initializeMap = async () => {
      if (!mapRef.current) return;
      
      try {
        // Only import Leaflet on the client-side
        const L = (await import('leaflet')).default;
        
        // Fix marker icon issue
        // No need to delete _getIconUrl as it does not exist on Default
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
        
        // Clean up previous map instance if it exists
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          markersRef.current = [];
        }
        
        // Define bounds for Singapore
        const sw = L.latLng(1.144, 103.535);
        const ne = L.latLng(1.494, 104.502);
        const bounds = L.latLngBounds(sw, ne);
        
        // Create map
        const map = L.map(mapRef.current, {
          center: L.latLng(center[0], center[1]),
          zoom: zoom,
          maxBounds: bounds,
          minZoom: 11,
          maxZoom: 19
        });
        
        mapInstanceRef.current = map;
        
        // Add OneMap tile layer based on theme
        const tileUrl = getTileUrl(theme);
        const basemap = L.tileLayer(tileUrl, {
          detectRetina: true,
          maxZoom: 19,
          minZoom: 11,
          attribution: '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'
        });
        
        tileLayerRef.current = basemap;
        basemap.addTo(map);
        
        // Add markers for locations if provided
        if (locations.length > 0) {
          // Function to generate random offset for testing
          const generateRandomOffset = () => {
            return (Math.random() - 0.5) * 0.05; // +/- 0.025 degrees
          };
          
          // Add markers
          locations.forEach((location) => {
            let markerLat = location.locationX;
            let markerLng = location.locationY;
            
            // Check if we need to generate random coordinates
            // This is useful when all locations have the same coordinates
            if (generateRandomCoordinates) {
              // Base coordinates - center of Singapore
              const baseX = 1.3521;
              const baseY = 103.8198;
              markerLat = baseX + generateRandomOffset();
              markerLng = baseY + generateRandomOffset();
            }
            
            // Create marker
            const marker = L.marker([markerLat, markerLng]);
            markersRef.current.push(marker);
            marker.addTo(map);
            
            // Add popup if enabled
            if (showPopups) {
              marker.bindPopup(`
                <strong>${location.name}</strong><br>
                ${location.location}
              `);
            }
          });
          
          // If we have locations and random coordinates, fit bounds
          if (generateRandomCoordinates && locations.length > 1) {
            const markerGroup = L.featureGroup(markersRef.current);
            map.fitBounds(markerGroup.getBounds(), { padding: [50, 50] });
          }
        }
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize the map');
      }
    };

    initializeMap();
    
    // Cleanup function to remove map when component unmounts
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
    };
  }, [center, zoom, locations, generateRandomCoordinates, showPopups, theme]); // Added theme as dependency
  
  if (error) {
    return <div className="text-red-500 p-5">{error}</div>;
  }
  
  return <div ref={mapRef} style={{ height }} className="rounded-lg overflow-hidden" />;
};

export default OneMap;