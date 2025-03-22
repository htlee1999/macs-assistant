// OptimizedH3Layer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as h3 from 'h3-js';

interface H3LayerProps {
  options?: {
    resolution?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    opacity?: number;
    showCellId?: boolean;
    enableHover?: boolean;
  };
}

const OptimizedH3Layer: React.FC<H3LayerProps> = ({
  options = {
    resolution: 7, // Default to 7 for Singapore
    fillColor: '#3182bd', // Blue fill
    strokeColor: '#1e3a8a', // Darker blue stroke
    strokeWidth: 2, // Thicker border for visibility
    opacity: 0.7, // Higher opacity for better visibility
    showCellId: false,
    enableHover: true
  }
}) => {
  const map = useMap();
  const hexLayerRef = useRef<L.LayerGroup | null>(null);
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());
  
  // Dynamically adjust resolution based on zoom level
  const getResolutionForZoom = (zoom: number): number => {
    if (zoom <= 10) return 6;      // Very zoomed out
    if (zoom <= 12) return 7;      // City level
    if (zoom <= 14) return 8;      // Neighborhood level
    return 9;                      // Street level
  };
  
  useEffect(() => {
    console.log("OptimizedH3Layer mounted, initializing...");
    
    // Create our layer if it doesn't exist
    if (!hexLayerRef.current) {
      hexLayerRef.current = L.layerGroup().addTo(map);
      console.log("Created new H3 layer group and added to map");
    }
    
    // Add a test polygon to verify rendering is working
    const center = map.getCenter();
    const testPolygon = L.polygon([
      [center.lat - 0.01, center.lng - 0.01],
      [center.lat - 0.01, center.lng + 0.01],
      [center.lat + 0.01, center.lng + 0.01],
      [center.lat + 0.01, center.lng - 0.01]
    ], {
      color: 'blue',
      fillColor: 'blue',
      fillOpacity: 0.8,
      weight: 3,
      pane: 'overlayPane',
    }).addTo(map);
    
    console.log("Added test rectangle at center for visibility verification");
    
    const generateHexagons = () => {
      if (!hexLayerRef.current) return;
      
      // Clear existing hexagons
      hexLayerRef.current.clearLayers();
      console.log("Cleared existing hexagons");
      
      // Get current zoom and update state
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
      
      // Get appropriate resolution for current zoom
      // Allow manual override via options, otherwise calculate dynamically
      const useResolution = options.resolution || getResolutionForZoom(zoom);
      
      // Get visible bounds
      const bounds = map.getBounds();
      const center = map.getCenter();
      
      console.log(`Generating hexagons at zoom ${zoom} using resolution ${useResolution}`);
      
      try {
        // Generate hexagons using the center point and rings
        const centerHex = h3.latLngToCell(center.lat, center.lng, useResolution);
        
        // Adjust ring size based on zoom level
        let ringSize = 2; // Default small ring
        if (zoom < 12) ringSize = 4;
        if (zoom < 10) ringSize = 6;
        
        console.log(`Using ring size ${ringSize} at zoom ${zoom}`);
        
        // Generate hexagons around center
        const hexagons = h3.gridDisk(centerHex, ringSize);
        
        // Limit total hexagons if too many
        const maxHexagons = 200; // Performance threshold
        let displayHexagons = hexagons;
        
        if (hexagons.length > maxHexagons) {
          console.warn(`Too many hexagons (${hexagons.length}). Limiting to ${maxHexagons}.`);
          displayHexagons = hexagons.slice(0, maxHexagons);
        }
        
        console.log(`Rendering ${displayHexagons.length} hexagons out of ${hexagons.length} total`);
        
        // Render visible hexagons
        displayHexagons.forEach((hexId, index) => {
          try {
            // Get boundary vertices
            // Important fix: use false to get [lat, lng] format instead of GeoJSON format
            const hexBoundary = h3.cellToBoundary(hexId, false) as [number, number][];
            
            // Create and style the polygon with improved visibility
            const polygon = L.polygon(hexBoundary, {
              fillColor: options.fillColor,
              color: options.strokeColor,
              weight: options.strokeWidth,
              fillOpacity: options.opacity,
              interactive: true,
              bubblingMouseEvents: true,
              pane: 'overlayPane'
            });
            
            // Add hover effects if enabled
            if (options.enableHover) {
              polygon.on('mouseover', (e) => {
                e.target.setStyle({ 
                  fillOpacity: Math.min(1, (options.opacity || 0.7) * 1.5), 
                  weight: (options.strokeWidth || 2) * 1.5,
                  fillColor: '#4299e1' // Lighter blue on hover
                });
              });
              
              polygon.on('mouseout', (e) => {
                e.target.setStyle({ 
                  fillOpacity: options.opacity, 
                  weight: options.strokeWidth,
                  fillColor: options.fillColor
                });
              });
            }
            
            // Add cell info on click
            polygon.on('click', (e) => {
              const cellCenter = h3.cellToLatLng(hexId);
              L.popup()
                .setLatLng([cellCenter[0], cellCenter[1]])
                .setContent(`
                  <div>
                    <strong>H3 Cell Info</strong><br>
                    Cell ID: ${hexId}<br>
                    Resolution: ${useResolution}<br>
                    Center: ${cellCenter[0].toFixed(6)}, ${cellCenter[1].toFixed(6)}
                  </div>
                `)
                .openOn(map);
            });
            
            // Add hex ID as tooltip if enabled
            if (options.showCellId) {
              polygon.bindTooltip(hexId);
            }
            
            polygon.addTo(map); // Add directly to map for testing
            if (hexLayerRef.current) {
              hexLayerRef.current.addLayer(polygon);
            }
            
            // For debugging: Add a marker at the center of each 10th hexagon
            if (index % 10 === 0) {
              const center = h3.cellToLatLng(hexId);
              const marker = L.marker([center[0], center[1]], {
                icon: L.divIcon({
                  html: `<div style="background-color: yellow; width: 6px; height: 6px; border-radius: 50%;"></div>`,
                  className: ''
                })
              });
              if (hexLayerRef.current) {
                hexLayerRef.current.addLayer(marker);
              }
            }
          } catch (error) {
            console.error(`Error rendering hexagon ${hexId}:`, error);
          }
        });
        
        console.log(`Successfully rendered H3 hexagons with enhanced visibility`);
        
      } catch (error) {
        console.error("Error generating hexagons:", error);
      }
    };
    
    // Generate hexagons initially with a short delay
    setTimeout(() => {
      generateHexagons();
    }, 500);
    
    // Throttled event handler to prevent too frequent updates
    let throttleTimer: number | null = null;
    const throttleDelay = 300; // ms
    
    const handleMapChange = () => {
      if (throttleTimer) return;
      
      throttleTimer = window.setTimeout(() => {
        generateHexagons();
        throttleTimer = null;
      }, throttleDelay);
    };
    
    // Update hexagons when map changes
    map.on('zoomend', handleMapChange);
    map.on('moveend', handleMapChange);
    
    // Remove test polygon after a few seconds
    setTimeout(() => {
      try {
        map.removeLayer(testPolygon);
      } catch (e) {
        console.error("Error removing test polygon:", e);
      }
    }, 5000);
    
    // Clean up
    return () => {
      console.log("OptimizedH3Layer unmounting, cleaning up...");
      
      if (throttleTimer) {
        window.clearTimeout(throttleTimer);
      }
      
      map.off('zoomend', handleMapChange);
      map.off('moveend', handleMapChange);
      
      if (hexLayerRef.current) {
        map.removeLayer(hexLayerRef.current);
      }
      
      try {
        map.removeLayer(testPolygon);
      } catch (e) {
        // Ignore if already removed
      }
    };
  }, [map, options]);
  
  return null;
};

export default OptimizedH3Layer;