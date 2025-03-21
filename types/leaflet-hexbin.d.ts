// types/leaflet-hexbin.d.ts
import * as L from 'leaflet';

declare module 'leaflet' {
  namespace L {
    function hexbinLayer(options?: {
      radius?: number;
      opacity?: number;
      duration?: number;
      colorRange?: string[];
      radiusRange?: [number, number];
      colorScaleExtent?: [number, number];
      [key: string]: any;
    }): any;
  }
}