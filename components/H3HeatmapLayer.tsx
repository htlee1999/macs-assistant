// H3HeatmapLayer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as h3 from 'h3-js';

interface LocationData {
  name?: string;
  location?: string;
  locationX: number;
  locationY: number;
}

interface H3HeatmapLayerProps {
  locations: LocationData[];
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

const H3HeatmapLayer: React.FC<H3HeatmapLayerProps> = ({
  locations,
  options = {
    resolution: 7,
    fillColor: '#3182bd',
    strokeColor: '#1e3a8a',
    strokeWidth: 2,
    opacity: 0.7,
    showCellId: false,
    enableHover: true
  }
}) => {
  const map = useMap();
  const hexLayerRef = useRef<L.LayerGroup | null>(null);
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());
  const [hexagons, setHexagons] = useState<Map<string, L.Polygon>>(new Map());
  
  // Dynamically adjust resolution based on zoom level
  const getResolutionForZoom = (zoom: number): number => {
    if (zoom <= 10) return 6;      // Very zoomed out
    if (zoom <= 12) return 7;      // City level
    if (zoom <= 14) return 8;      // Neighborhood level
    return 9;                      // Street level
  };

  const consistentOpacity = 0.25; // Change this value to your desired translucency
  
  // Function to toggle hexagon visibility based on zoom
  const updateHexagonVisibility = (zoom: number) => {
    // At higher zoom levels, hide hexagons
    const shouldHideHexagons = zoom >= 16;
    
    hexagons.forEach((polygon, hexId) => {
      if (shouldHideHexagons) {
        // Hide hexagons at high zoom levels
        polygon.setStyle({ fillOpacity: 0, opacity: 0 });
        // Hide tooltips as well
        if (polygon.getTooltip()) {
          polygon.closeTooltip();
        }
      } else {
        // MODIFY THIS LINE: Set a consistent translucency regardless of zoom level
        // Use a fixed lower opacity value like 0.25 (or whatever translucency you prefer)
        const consistentOpacity = 0.25; // Change this value to your desired translucency
        polygon.setStyle({ 
          fillOpacity: consistentOpacity, 
          opacity: 1 
        });
        
        // Always keep tooltips closed unless explicitly triggered by hover
        if (polygon.getTooltip()) {
          polygon.closeTooltip();
        }
      }
    });
  };
  
  useEffect(() => {
    console.log("H3HeatmapLayer mounted, initializing...");
    
    // Add custom CSS for tooltips
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `
        .h3-tooltip {
          background-color: rgba(0, 0, 0, 0.75);
          border: none;
          border-radius: 5px;
          color: white;
          font-weight: bold;
          padding: 5px 10px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
        }
        .h3-tooltip::before {
          border-color: rgba(0, 0, 0, 0.75) transparent transparent transparent;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Create our layer if it doesn't exist
    if (!hexLayerRef.current) {
      hexLayerRef.current = L.layerGroup().addTo(map);
      console.log("Created new H3 heatmap layer and added to map");
    }
    
    const generateHexagons = () => {
      if (!hexLayerRef.current) return;
      
      // Clear existing hexagons
      hexLayerRef.current.clearLayers();
      setHexagons(new Map());
      console.log("Cleared existing hexagons");
      
      // Skip if no locations
      if (!locations || locations.length === 0) {
        console.log("No locations provided, using grid mode instead");
        
        // Fallback to grid mode if no locations
        const center = map.getCenter();
        const centerHex = h3.latLngToCell(center.lat, center.lng, options.resolution || 7);
        const ringSize = 4;
        const hexagons = h3.gridDisk(centerHex, ringSize);
        
        console.log(`Generated ${hexagons.length} hexagons in grid mode`);
        
        hexagons.forEach(hexId => {
          try {
            // Get boundary vertices (false for [lat, lng] format)
            const hexBoundary = h3.cellToBoundary(hexId, false);
            
            // Create and style the polygon
            const polygon = L.polygon(hexBoundary, {
              fillColor: options.fillColor,
              color: options.strokeColor,
              weight: options.strokeWidth,
              fillOpacity: consistentOpacity, // Use consistent opacity
              interactive: true,
            });
            
            // Add to layer
            hexLayerRef.current?.addLayer(polygon);
          } catch (error) {
            console.error(`Error rendering grid hexagon ${hexId}:`, error);
          }
        });
        
        return;
      }
      
      // Get current zoom and update state
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
      
      // Get appropriate resolution for current zoom
      const useResolution = options.resolution || getResolutionForZoom(zoom);
      
      console.log(`Generating heatmap at zoom ${zoom} using resolution ${useResolution}`);
      
      try {
        // Step 1: Map each location to its H3 cell
        const locationCells = new Map<string, number>();
        const cellsToLocations = new Map<string, LocationData[]>();
        
        // IMPORTANT: Keep track of added cells to prevent duplicates
        const addedCells = new Set<string>();
        
        locations.forEach(loc => {
          try {
            // IMPORTANT: Explicitly handle coordinates
            // H3.js expects coordinates as [lat, lng]
            const lat = loc.locationX;
            const lng = loc.locationY;
            
            // IMPORTANT: Validate coordinates are in Singapore range 
            // Singapore is roughly 1.14-1.5 latitude, 103.5-104.5 longitude
            const isValidLat = lat >= 1.14 && lat <= 1.5;
            const isValidLng = lng >= 103.5 && lng <= 104.5;
            
            // Check for swapped coordinates
            const isSwappedLat = lng >= 1.14 && lng <= 1.5;
            const isSwappedLng = lat >= 103.5 && lat <= 104.5;
            
            let cellId;
            
            if (isValidLat && isValidLng) {
              // Normal coordinates
              cellId = h3.latLngToCell(lat, lng, useResolution);
            } else if (isSwappedLat && isSwappedLng) {
              // Swapped coordinates
              console.log(`Swapped coordinates detected: ${lat},${lng} -> ${lng},${lat}`);
              cellId = h3.latLngToCell(lng, lat, useResolution);
            } else {
              // Skip invalid coordinates
              console.warn(`Invalid coordinates: ${lat},${lng}`);
              return;
            }
            
            // Count outlets per cell
            if (locationCells.has(cellId)) {
              locationCells.set(cellId, locationCells.get(cellId)! + 1);
            } else {
              locationCells.set(cellId, 1);
            }
            
            // Store locations for each cell
            if (!cellsToLocations.has(cellId)) {
              cellsToLocations.set(cellId, []);
            }
            cellsToLocations.get(cellId)!.push(loc);
            
            addedCells.add(cellId);
          } catch (error) {
            console.error("Error mapping location to H3 cell:", error, loc);
          }
        });
        
        console.log(`Mapped ${locationCells.size} unique cells from ${locations.length} locations`);
        
        // Step 2: Calculate min/max counts for coloring
        const counts = Array.from(locationCells.values());
        const minCount = Math.min(...counts);
        const maxCount = Math.max(...counts);
        
        console.log(`Outlet counts range: ${minCount} to ${maxCount}`);
        
        // Step 3: Render hexagons for each cell with outlets
        const newHexagons = new Map<string, L.Polygon>();
        
        Array.from(addedCells).forEach(hexId => {
          try {
            // Get outlet count for this cell
            const count = locationCells.get(hexId) || 0;
            const locationsInCell = cellsToLocations.get(hexId) || [];
            
            // Get boundary vertices (false for [lat, lng] format)
            const hexBoundary = h3.cellToBoundary(hexId, false);
            
            // Skip if boundaries can't be calculated
            if (!hexBoundary || hexBoundary.length === 0) {
              console.warn(`No boundaries found for hexId: ${hexId}`);
              return;
            }
            
            // Calculate color based on count (more outlets = darker blue)
            const normalizedValue = maxCount > minCount ? 
              (count - minCount) / (maxCount - minCount) : 0.5;
            
            // Create blue color scale from light to dark (darker = more outlets)
            const intensity = Math.floor(255 * (1 - normalizedValue));
            // Keep blue channel high, reduce red and green for darker blue
            const r = Math.floor(intensity * 0.5);
            const g = Math.floor(intensity * 0.7);
            const b = Math.floor(100 + (155 * (1 - normalizedValue))); // 100-255 range for blue
            
            const fillColor = `rgb(${r}, ${g}, ${b})`;
            
            // Create and style the polygon with high z-index
            const polygon = L.polygon(hexBoundary, {
              fillColor: fillColor, // Dynamic color based on count
              color: options.strokeColor,
              weight: options.strokeWidth,
              fillOpacity: currentZoom >= 16 ? 0 : consistentOpacity, // Hide at high zoom levels
              opacity: currentZoom >= 16 ? 0 : 1, // Hide at high zoom levels
              interactive: true,
              bubblingMouseEvents: true,
            });
            
            // Add hover effects and dynamic tooltip display if enabled
            if (options.enableHover) {
              polygon.on('mouseover', (e) => {
                if (currentZoom < 16) { // Only show effects if not at high zoom
                  // Increase opacity on hover but don't exceed 1
                  const hoverOpacity = Math.min(1, consistentOpacity * 1.5);
                  e.target.setStyle({ 
                    fillOpacity: hoverOpacity, 
                    weight: (options.strokeWidth || 2) * 1.5
                  });
                  // Show tooltip only on explicit hover
                  if (e.target.getTooltip()) {
                    e.target.openTooltip();
                  }
                }
              });
              
              polygon.on('mouseout', (e) => {
                if (currentZoom < 16) { // Only reset if not at high zoom
                  // Use consistent opacity when not hovering
                  e.target.setStyle({ 
                    fillOpacity: consistentOpacity, 
                    weight: options.strokeWidth
                  });
                  // Always hide tooltip when not hovering
                  if (e.target.getTooltip()) {
                    e.target.closeTooltip();
                  }
                }
              });
            }
            
            // Add cell info on click with zoom functionality
            polygon.on('click', (e) => {
              const cellCenter = h3.cellToLatLng(hexId);
              
              // Create popup content with list of outlets
              let locationsList = '';
              if (locationsInCell.length > 0) {
                locationsList = '<div style="max-height: 100px; overflow-y: auto;"><ul style="padding-left: 20px; margin: 5px 0;">';
                locationsInCell.forEach(loc => {
                  locationsList += `<li>${loc.name} - ${loc.location}</li>`;
                });
                locationsList += '</ul></div>';
              }
              
              L.popup()
                .setLatLng([cellCenter[0], cellCenter[1]])
                .setContent(`
                  <div>
                    <strong>H3 Cell Info</strong><br>
                    Outlets in this area: <strong>${count}</strong><br>
                    ${options.showCellId ? `Cell ID: ${hexId}<br>` : ''}
                    Resolution: ${useResolution}<br>
                    ${locationsList}
                    <button id="zoom-to-cell" style="background-color: #3182bd; color: white; border: none; padding: 5px 10px; border-radius: 3px; margin-top: 5px; cursor: pointer;">Zoom to this area</button>
                  </div>
                `)
                .openOn(map);
              
              // Add click handler for the zoom button
              setTimeout(() => {
                const zoomButton = document.getElementById('zoom-to-cell');
                if (zoomButton) {
                  zoomButton.addEventListener('click', () => {
                    map.setView([cellCenter[0], cellCenter[1]], 16);
                  });
                }
              }, 100);
            });
            
            // Add tooltip with outlet count, but only show at certain zoom levels or interactions
            polygon.bindTooltip(`${count} outlet${count !== 1 ? 's' : ''}`, {
              permanent: false,
              direction: 'center',
              opacity: 0.9,
              className: 'h3-tooltip'
            });
            
            // Always keep tooltips closed by default
            polygon.closeTooltip();
            
            // Store the polygon for future reference
            newHexagons.set(hexId, polygon);
            
            // Add to map
            polygon.addTo(map);
            
            // Also add to our layer
            if (hexLayerRef.current) {
              hexLayerRef.current.addLayer(polygon);
            }
            
          } catch (error) {
            console.error(`Error rendering hexagon ${hexId}:`, error);
          }
        });
        
        // Update hexagons state
        setHexagons(newHexagons);
        
        console.log(`Successfully rendered ${addedCells.size} H3 heatmap hexagons`);
        
      } catch (error) {
        console.error("Error generating heatmap hexagons:", error);
      }
    };
    
    // Generate hexagons immediately AND with a delay for safety
    generateHexagons();
    
    const delayedGeneration = setTimeout(() => {
      generateHexagons();
    }, 1000);
    
    // Function to handle zoom changes
    const handleZoomChange = () => {
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);
      updateHexagonVisibility(newZoom);
    };
    
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
    map.on('zoomend', handleZoomChange);
    map.on('moveend', handleMapChange);
    
    // Clean up
    return () => {
      console.log("H3HeatmapLayer unmounting, cleaning up...");
      
      if (throttleTimer) {
        window.clearTimeout(throttleTimer);
      }
      
      clearTimeout(delayedGeneration);
      
      map.off('zoomend', handleZoomChange);
      map.off('moveend', handleMapChange);
      
      if (hexLayerRef.current) {
        map.removeLayer(hexLayerRef.current);
      }
    };
  }, [map, options, locations, currentZoom]);
  
  return null;
};

export default H3HeatmapLayer;