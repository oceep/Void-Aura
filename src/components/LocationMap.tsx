
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { LocationData } from './LocationCard';

interface LocationMapProps {
  locations: LocationData[];
  className?: string;
}

// User Provided API Key
const DEFAULT_GEOAPIFY_KEY = 'ccf0da226a834808ae8755fc44b1fa21'; 

export const LocationMap: React.FC<LocationMapProps> = ({ locations, className }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [apiKey, setApiKey] = useState(DEFAULT_GEOAPIFY_KEY);

  useEffect(() => {
    // Attempt to load from env if available, otherwise keep default
    const envKey = (import.meta as any).env?.VITE_GEOAPIFY_KEY;
    if (envKey && envKey.length > 10) {
        setApiKey(envKey);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (locations.length === 0) return;

    // Filter valid locations
    const validLocations = locations.filter(l => l.latitude && l.longitude && (l.latitude !== 0 || l.longitude !== 0));
    if (validLocations.length === 0) return;

    // Center map on the first location initially
    const centerLng = validLocations[0].longitude!;
    const centerLat = validLocations[0].latitude!;

    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        // Geoapify Dark Matter Style - Sleek and Modern
        style: `https://maps.geoapify.com/v1/styles/dark-matter-dark-grey/style.json?apiKey=${apiKey}`,
        center: [centerLng, centerLat],
        zoom: 13,
        attributionControl: false, 
      });

      map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      
      map.current.addControl(new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'Geoapify | OSM'
      }));
    }

    // Clean up existing markers before adding new ones
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add Markers
    const bounds = new maplibregl.LngLatBounds();

    validLocations.forEach((loc) => {
        if (!loc.latitude || !loc.longitude) return;

        // --- Custom Red Mark Marker ---
        const el = document.createElement('div');
        el.className = 'custom-marker';
        // Red dot with pulsing effect (Red Mark)
        el.innerHTML = `
            <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                <div style="width: 12px; height: 12px; background-color: #ef4444; border-radius: 50%; box-shadow: 0 0 10px #ef4444; z-index: 2; border: 2px solid #fff;"></div>
                <div style="position: absolute; width: 30px; height: 30px; background-color: rgba(239, 68, 68, 0.4); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            </div>
        `;
        el.style.cursor = 'pointer';

        // --- Hover Info Box ---
        const popupContent = `
            <div style="font-family: 'Inter', sans-serif; text-align: left; min-width: 180px;">
                <h3 style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #fff; line-height: 1.2;">${loc.name}</h3>
                ${loc.rating ? `<div style="display: flex; align-items: center; gap: 4px; color: #fbbf24; font-size: 12px; font-weight: bold; margin-bottom: 4px;">
                    <span>★</span> <span>${loc.rating}</span>
                </div>` : ''}
                ${loc.address ? `<div style="color: #9ca3af; font-size: 11px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${loc.address}</div>` : ''}
            </div>
        `;

        const popup = new maplibregl.Popup({ 
            offset: 15, 
            closeButton: false, 
            closeOnClick: false,
            className: 'custom-map-popup'
        }).setHTML(popupContent);

        const marker = new maplibregl.Marker({ element: el })
            .setLngLat([loc.longitude, loc.latitude])
            .setPopup(popup)
            .addTo(map.current!);
        
        // Track the marker
        markersRef.current.push(marker);

        // Show popup on hover
        el.addEventListener('mouseenter', () => marker.togglePopup());
        el.addEventListener('mouseleave', () => marker.togglePopup());
        
        // Click to open Google Maps Directions
        el.addEventListener('click', () => {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`, '_blank');
        });

        bounds.extend([loc.longitude, loc.latitude]);
    });

    // Fit bounds
    if (validLocations.length > 0) {
        map.current.fitBounds(bounds, { padding: 70, maxZoom: 15 });
    }

  }, [locations, apiKey]);

  // Cleanup map instance on unmount to prevent leaks
  useEffect(() => {
      return () => {
          markersRef.current.forEach(m => m.remove());
          if (map.current) {
              map.current.remove();
              map.current = null;
          }
      };
  }, []);

  return (
    <div className={`w-full h-64 md:h-80 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-[#1f1f23] ${className}`}>
        <div ref={mapContainer} className="w-full h-full" />
        <style>{`
            @keyframes ping {
                75%, 100% {
                    transform: scale(2);
                    opacity: 0;
                }
            }
            .maplibregl-popup-content {
                background: rgba(26, 26, 31, 0.95) !important;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px !important;
                padding: 12px !important;
                color: white !important;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
            }
            .maplibregl-popup-tip {
                border-top-color: rgba(26, 26, 31, 0.95) !important;
            }
        `}</style>
    </div>
  );
};
