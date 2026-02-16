
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LocationData } from './LocationCard';

interface LocationMapProps {
  locations: LocationData[];
  className?: string;
}

export const LocationMap: React.FC<LocationMapProps> = ({ locations, className }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return;

    if ((mapContainer.current as any)._leaflet_id) {
        return;
    }

    const instance = L.map(mapContainer.current, {
      center: [21.0285, 105.8542],
      zoom: 13,
      zoomControl: false, 
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(instance);

    L.control.zoom({ position: 'topright' }).addTo(instance);

    map.current = instance;

    resizeObserver.current = new ResizeObserver(() => {
        instance.invalidateSize();
    });
    resizeObserver.current.observe(mapContainer.current);

    setTimeout(() => {
        instance.invalidateSize();
    }, 200);

    return () => {
      if (resizeObserver.current) {
          resizeObserver.current.disconnect();
      }
      instance.remove();
      map.current = null;
    };
  }, []);

  // Update Markers
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    // Clear existing layers
    instance.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        instance.removeLayer(layer);
      }
    });

    const validLocations = locations.filter(l => l.latitude && l.longitude && (l.latitude !== 0 || l.longitude !== 0));
    
    if (validLocations.length === 0) return;

    const bounds = L.latLngBounds([]);

    validLocations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      // Use Bing fallback mostly for map thumbnails for consistency/reliability
      const popupImage = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(loc.name + " " + (loc.address || ""))}&w=240&h=120&c=7&rs=1&p=0`;

      // Custom HTML Icon
      const customIcon = L.divIcon({
        className: 'custom-marker-container',
        html: `
          <div class="marker-visual" style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="width: 14px; height: 14px; background-color: #ef4444; border-radius: 50%; box-shadow: 0 0 15px #ef4444; z-index: 2; border: 2px solid #fff;"></div>
              <div style="position: absolute; width: 40px; height: 40px; background-color: rgba(239, 68, 68, 0.3); border-radius: 50%; animation: pulse-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon }).addTo(instance);

      // We construct HTML with <img> tag to support referrerPolicy
      const popupContent = `
        <div style="font-family: 'Inter', sans-serif; text-align: left; width: 220px;">
            <div style="width: 100%; height: 90px; border-radius: 8px 8px 0 0; overflow: hidden; margin-bottom: 8px; background-color: #1a1a1f; position: relative;">
                <img src="${popupImage}" style="width: 100%; height: 100%; object-fit: cover;" referrerpolicy="no-referrer" onerror="this.src='https://placehold.co/240x120/1f1f23/white?text=No+Image'"/>
            </div>
            <div style="padding: 0 4px;">
                <h3 style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #fff; line-height: 1.2;">${loc.name}</h3>
                ${loc.rating ? `<div style="display: flex; align-items: center; gap: 4px; color: #fbbf24; font-size: 12px; font-weight: bold; margin-bottom: 4px;">
                    <span>★</span> <span>${loc.rating}</span>
                </div>` : ''}
                ${loc.address ? `<div style="color: #9ca3af; font-size: 11px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 8px;">${loc.address}</div>` : ''}
                <a href="https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}" target="_blank" rel="noopener noreferrer" 
                   style="display: block; text-align: center; background-color: #3b82f6; color: white; font-size: 11px; font-weight: 600; text-decoration: none; padding: 8px 0; border-radius: 6px; transition: background 0.2s;">
                    Chỉ đường
                </a>
            </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'custom-leaflet-popup',
        closeButton: false,
        offset: [0, -10],
        autoPan: true,
        autoPanPadding: [20, 20] 
      });

      // Hover Logic
      marker.on('mouseover', function (e) {
        const self = this as any;
        if (self._closeTimeout) {
            clearTimeout(self._closeTimeout);
            self._closeTimeout = null;
        }
        this.openPopup();
        
        // Enhance marker visual
        const iconDiv = this.getElement()?.querySelector('.marker-visual');
        if (iconDiv) iconDiv.classList.add('animate-jump');

        // Attach listeners to popup content once it's in DOM
        requestAnimationFrame(() => {
            const popup = this.getPopup();
            if (popup) {
                const el = popup.getElement();
                if (el && !self._hoverAttached) {
                    el.addEventListener('mouseenter', () => {
                        if (self._closeTimeout) {
                            clearTimeout(self._closeTimeout);
                            self._closeTimeout = null;
                        }
                    });
                    el.addEventListener('mouseleave', () => {
                        self._closeTimeout = setTimeout(() => {
                            this.closePopup();
                        }, 300);
                    });
                    self._hoverAttached = true;
                }
            }
        });
      });
      
      marker.on('mouseout', function (e) {
        const self = this as any;
        const iconDiv = this.getElement()?.querySelector('.marker-visual');
        if (iconDiv) iconDiv.classList.remove('animate-jump');

        self._closeTimeout = setTimeout(() => {
            this.closePopup();
        }, 300);
      });

      bounds.extend([loc.latitude, loc.longitude]);
    });

    if (validLocations.length > 0) {
      instance.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }

  }, [locations]);

  if (locations.filter(l => l.latitude && l.longitude).length === 0) return null;

  return (
    <div className={`w-full h-64 md:h-80 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-[#1f1f23] z-0 ${className}`}>
        <div ref={mapContainer} style={{ width: '100%', height: '100%', zIndex: 0 }} />
        <style>{`
            @keyframes pulse-ring {
                0% { transform: scale(0.5); opacity: 1; }
                100% { transform: scale(2.5); opacity: 0; }
            }
            @keyframes jump {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
            }
            .animate-jump {
                animation: jump 0.4s ease-in-out infinite !important;
            }
            .leaflet-popup-content-wrapper {
                background: rgba(26, 26, 31, 0.98) !important;
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 16px !important;
                color: white !important;
                padding: 0 !important;
                box-shadow: 0 10px 30px rgba(0,0,0,0.6) !important;
            }
            .leaflet-popup-content {
                margin: 12px !important;
                width: auto !important;
            }
            .leaflet-popup-tip {
                background: rgba(26, 26, 31, 0.98) !important;
                border-top: 1px solid rgba(255, 255, 255, 0.15); 
            }
            .custom-marker-container {
                background: transparent;
                border: none;
            }
            .leaflet-control-zoom {
                border: none !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                border-radius: 9999px !important;
                overflow: hidden;
                margin-top: 16px !important;
                margin-right: 16px !important;
                display: flex;
                flex-direction: column;
                background: rgba(30, 30, 35, 0.9) !important;
                backdrop-filter: blur(4px);
                border: 1px solid rgba(255,255,255,0.1) !important;
            }
            .leaflet-control-zoom-in, .leaflet-control-zoom-out {
                background: transparent !important;
                color: #e5e7eb !important;
                border-bottom: 1px solid rgba(255,255,255,0.1) !important;
                width: 36px !important;
                height: 36px !important;
                line-height: 36px !important;
                font-size: 16px !important;
                transition: background 0.2s;
            }
            .leaflet-control-zoom-out {
                border-bottom: none !important;
            }
            .leaflet-control-zoom-in:hover, .leaflet-control-zoom-out:hover {
                background: rgba(255,255,255,0.1) !important;
                color: white !important;
            }
        `}</style>
    </div>
  );
};
