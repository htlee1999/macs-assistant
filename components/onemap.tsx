import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, TileLayer } from 'leaflet';

interface OneMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
}

const OneMap: React.FC<OneMapProps> = ({
  center = [1.2868108, 103.8545349],
  zoom = 16,
  height = '800px'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    // Dynamic import for Leaflet to avoid SSR issues in Next.js
    const initializeMap = async () => {
      if (!mapRef.current) return;
      
      // Only import Leaflet on the client-side
      const L = (await import('leaflet')).default;
      
      // Ensure the div is cleared before creating a new map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
      
      // Define bounds for Singapore
      const sw = L.latLng(1.144, 103.535);
      const ne = L.latLng(1.494, 104.502);
      const bounds = L.latLngBounds(sw, ne);
      
      // Create map
      const map = L.map(mapRef.current, {
        center: L.latLng(center[0], center[1]),
        zoom: zoom
      });
      
      mapInstanceRef.current = map;
      
      map.setMaxBounds(bounds);
      
      // Add OneMap tile layer
      const basemap = L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
        detectRetina: true,
        maxZoom: 19,
        minZoom: 11,
        attribution: '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'
      });
      
      basemap.addTo(map);
    };

    // Initialize the map
    initializeMap();
    
    // Cleanup function to remove map when component unmounts
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom]); // Re-run effect if center or zoom changes
  
  return <div ref={mapRef} style={{ height }} />;
};

export default OneMap;