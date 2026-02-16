
import React, { useState, useMemo } from 'react';

export interface LocationData {
  name: string;
  description?: string;
  imageUrl?: string;
  images?: string[]; // Support multiple real images
  rating?: string | number;
  address?: string;
  openStatus?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  phoneNumber?: string;
}

interface LocationCardProps {
  data: LocationData;
  theme?: string;
}

const isValidUrl = (url?: string) => {
    if (!url) return false;
    if (!url.startsWith('http')) return false; 
    try {
        const u = new URL(url);
        return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes('.');
    } catch {
        return false;
    }
}

export const LocationCard: React.FC<LocationCardProps> = ({ data, theme }) => {
  const [imgError, setImgError] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // Process images: Strictly use data.images or data.imageUrl. NO FAKES.
  const images = useMemo(() => {
      let imgs: string[] = [];

      // 1. Try to use the array of real images if provided
      if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          imgs = data.images.filter(url => isValidUrl(url));
      }

      // 2. If no array, check for single imageUrl
      if (imgs.length === 0 && data.imageUrl && isValidUrl(data.imageUrl)) {
          imgs = [data.imageUrl];
      }

      // 3. Fallback only if absolutely no valid images found OR if previous load failed
      if (imgs.length === 0 || imgError) {
          const fallback = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(data.name)}&w=800&h=400&c=7&rs=1&p=0`;
          return [fallback];
      }

      return imgs;
  }, [data.name, data.imageUrl, data.images, imgError]);

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // If not already showing fallback, switch to fallback mode
    if (!imgError) {
        setImgError(true);
        setCurrentImgIndex(0);
    } else {
        // Fallback also failed, show generic placeholder to prevent infinite loop or broken icon
        e.currentTarget.src = "https://placehold.co/800x400/1f1f23/white?text=No+Image";
        e.currentTarget.onerror = null; // Stop handling errors
    }
  };

  const nextImage = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (images.length > 1) {
          setCurrentImgIndex((prev) => (prev + 1) % images.length);
      }
  };

  const prevImage = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (images.length > 1) {
          setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
      }
  };

  const hasValidCoords = data.latitude && data.longitude && (data.latitude !== 0 || data.longitude !== 0);
  const destination = hasValidCoords 
    ? `${data.latitude},${data.longitude}`
    : encodeURIComponent(data.address || data.name);
  const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  const showWebsite = isValidUrl(data.website);
  
  // Show navigation only if we have multiple images
  const showNav = images.length > 1;

  return (
    <div className={`mt-4 mb-6 w-full rounded-2xl overflow-hidden shadow-2xl font-sans text-white border border-white/10 bg-[#1f1f23] transition-all hover:shadow-blue-900/20 group/card`}>
      {/* Image Carousel Section */}
      <div className="relative h-56 w-full bg-gray-800 overflow-hidden group/image">
        <img 
            src={images[currentImgIndex]} 
            alt={`${data.name} - view ${currentImgIndex + 1}`} 
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            onError={handleImgError}
            referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1f1f23] via-transparent to-transparent opacity-90 pointer-events-none"></div>
        
        {/* Navigation Buttons (Visible on Hover if >1 image) */}
        {showNav && (
            <>
                <button 
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity backdrop-blur-sm z-10 border border-white/10"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                
                <button 
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity backdrop-blur-sm z-10 border border-white/10"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>

                {/* Image Dots Indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {images.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImgIndex ? 'bg-white' : 'bg-white/40'}`}
                        />
                    ))}
                </div>
            </>
        )}
        
        {data.rating && (
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 border border-white/10 shadow-lg z-10">
                <span className="text-yellow-400 text-sm">★</span>
                <span className="text-xs font-bold">{data.rating}</span>
            </div>
        )}
      </div>

      <div className="p-6 relative -mt-12 bg-gradient-to-b from-transparent to-[#1f1f23]">
        <div className="flex flex-col gap-1 mb-3">
            <h2 className="text-2xl font-bold text-white drop-shadow-md leading-tight">{data.name}</h2>
            {data.openStatus && (
                <div className="flex">
                    <span className={`text-xs px-2 py-0.5 rounded-md border backdrop-blur-sm ${
                        data.openStatus.toLowerCase().includes('open') || data.openStatus.toLowerCase().includes('mở') 
                        ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                        : 'bg-red-500/20 border-red-500/30 text-red-400'
                    }`}>
                        {data.openStatus}
                    </span>
                </div>
            )}
        </div>

        {data.description && (
            <p className="text-sm text-gray-300 mb-5 leading-relaxed">
                {data.description}
            </p>
        )}

        <div className="flex flex-col gap-3">
            {data.address && (
                <div className="flex items-start gap-3 text-sm text-gray-400 bg-white/5 p-3 rounded-xl border border-white/5">
                    <svg className="w-5 h-5 shrink-0 text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="leading-snug">{data.address}</span>
                </div>
            )}

            {data.phoneNumber && (
                <div className="flex items-center gap-3 text-sm text-gray-400 bg-white/5 p-3 rounded-xl border border-white/5">
                    <svg className="w-5 h-5 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${data.phoneNumber}`} className="hover:text-green-400 transition-colors">{data.phoneNumber}</a>
                </div>
            )}

            <div className="flex gap-2 w-full mt-2">
                <a 
                    href={mapUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/30"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Chỉ đường
                </a>
                
                {showWebsite && (
                    <a 
                        href={data.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-