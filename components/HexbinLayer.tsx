// HexbinLayer.tsx
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
// Import the required libraries
import 'd3-hexbin';
import 'leaflet-hexbin';

interface HexbinLayerProps {
  data: [number, number][];
  options?: {
    radius?: number;
    opacity?: number;
    duration?: number;
    colorRange?: string[];
    radiusRange?: [number, number];
    colorScaleExtent?: [number, number];
  };
}

const HexbinLayer = ({ 
  data, 
  options = {
    radius: 12,
    opacity: 0.7,
    duration: 500,
    colorRange: ['#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594'],
    colorScaleExtent: [0, 1]
  } 
}: HexbinLayerProps) => {
  const map = useMap();
  const layerRef = useRef<any>(null);
  
  useEffect(() => {
    if (!map || !data.length) return;
    
    // Check if hexbinLayer is available
    if (!(L as any).hexbinLayer) {
      console.error('L.hexbinLayer is not available. Make sure leaflet-hexbin is properly imported.');
      return;
    }
    
    try {
      // Use type assertion to access hexbinLayer
      const hexLayer = (L as any).hexbinLayer({
        radius: options.radius,
        opacity: options.opacity,
        duration: options.duration,
        colorRange: options.colorRange,
        colorScaleExtent: options.colorScaleExtent,
      });
      
      // Add data
      hexLayer.data(data);
      
      // Add to map
      hexLayer.addTo(map);
      
      // Store reference
      layerRef.current = hexLayer;
    } catch (error) {
      console.error('Error creating hexbin layer:', error);
    }
    
    // Clean up on unmount
    return () => {
      if (layerRef.current) {
        try {
          map.removeLayer(layerRef.current);
        } catch (error) {
          console.error('Error removing hexbin layer:', error);
        }
        layerRef.current = null;
      }
    };
  }, [map, data, options]);
  
  return null;
};

export default HexbinLayer;