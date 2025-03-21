'use client'; // Important: Use client directive

import React from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import with ssr: false to avoid server-side rendering issues with Leaflet
const OneMap = dynamic(() => import('@/components/onemap'), {
  ssr: false,
  loading: () => <div style={{ height: '800px', background: '#f0f0f0' }}>Loading map...</div>
});

export default function MapPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">OneMap Singapore</h1>
      <OneMap 
        // Optional props with defaults:
        // center={[1.2868108, 103.8545349]} 
        // zoom={16}
        // height="800px"
      />
    </div>
  );
}