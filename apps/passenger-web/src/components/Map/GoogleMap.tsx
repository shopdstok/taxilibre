import React, { useEffect, useRef, useState } from 'react';

interface GoogleMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    position: { lat: number; lng: number };
    label?: string;
    color?: string;
    onClick?: () => void;
  }>;
  polylines?: Array<{
    path: Array<{ lat: number; lng: number }>;
    options?: {
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    };
  }>;
  onBoundsChanged?: (bounds: any) => void;
  onClick?: (latLng: { lat: number; lng: number }) => void;
  style?: React.CSSProperties;
}

const GoogleMap: React.FC<GoogleMapProps> = ({
  center,
  zoom = 13,
  markers = [],
  polylines = [],
  onBoundsChanged,
  onClick,
  style = { width: '100%', height: '100%' }
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load Google Maps script dynamically
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
    };

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // Initialize map if not already done
    if (!(mapRef.current instanceof google.maps.Map)) {
      mapRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom: zoom,
        mapTypeId: 'roadmap',
        gestureHandling: 'greedy'
      });

      // Add click listener if provided
      if (onClick) {
        mapRef.current.addListener('click', (event) => {
          onClick({ lat: event.latLng.lat(), lng: event.latLng.lng() });
        });
      }

      // Add bounds changed listener
      if (onBoundsChanged) {
        mapRef.current.addListener('bounds_changed', () => {
          onBoundsChanged(mapRef.current.getBounds());
        });
      }
    }

    // Update map center if changed
    mapRef.current.setCenter({ lat: center.lat, lng: center.lng });
    mapRef.current.setZoom(zoom);

    // Update markers
    // In a real implementation, we would manage marker instances properly
    // For simplicity, we'll rely on re-rendering with new marker data
  }, [isLoaded, center.lat, center.lng, zoom, onClick, onBoundsChanged]);

  return (
    <div ref={mapRef} style={style} />
  );
};

export default GoogleMap;
