'use client';

import { useEffect, useRef, useState } from 'react';
import type { Provider, NearbyProvider } from '@/lib/database.types';
import { CARD_TYPE_COLORS, PROVIDER_TYPE_ICONS } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

interface MapViewProps {
  providers: (Provider | NearbyProvider)[];
  selectedProvider: Provider | NearbyProvider | null;
  userLocation: { lat: number; lng: number } | null;
  locale: Locale;
  onProviderSelect: (provider: Provider | NearbyProvider) => void;
  center?: [number, number];
  zoom?: number;
}

export default function MapView({
  providers,
  selectedProvider,
  userLocation,
  locale,
  onProviderSelect,
  center = [30.0131, 31.2089],
  zoom = 7,
}: MapViewProps) {
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, import('leaflet').Marker>>(new Map());
  const userMarkerRef = useRef<import('leaflet').Marker | null>(null);
  const isAr = locale === 'ar';
  const [locating, setLocating] = useState(false);

  // Init map
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    import('leaflet').then((L) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const map = L.map(containerRef.current!, {
        center,
        zoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      setTimeout(() => { map.invalidateSize(); }, 300);
      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update center when filter changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom, { animate: true });
    setTimeout(() => { mapRef.current?.invalidateSize(); }, 300);
  }, [center, zoom]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;
    import('leaflet').then((L) => {
      const existingIds = new Set(markersRef.current.keys());
      const newIds = new Set(providers.filter(p => p.lat && p.lng).map(p => p.id));

      existingIds.forEach((id) => {
        if (!newIds.has(id)) {
          markersRef.current.get(id)?.remove();
          markersRef.current.delete(id);
        }
      });

      providers.forEach((provider) => {
        if (!provider.lat || !provider.lng) return;
        if (markersRef.current.has(provider.id)) return;

        const color = CARD_TYPE_COLORS[provider.card_type] || '#3b82f6';
        const icon = PROVIDER_TYPE_ICONS[provider.type_key] || '🏢';

        const markerIcon = L.divIcon({
          html: `
            <div style="background:${color};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:32px;height:32px;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
              <span style="transform:rotate(45deg);font-size:14px;line-height:1">${icon}</span>
            </div>
          `,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -36],
        });

        const name = isAr ? provider.name_ar || provider.name_en : provider.name_en || provider.name_ar;
        const type = isAr ? provider.type_ar || provider.type_en : provider.type_en || provider.type_ar;
        const address = isAr ? provider.address_ar || provider.address_en : provider.address_en || provider.address_ar;

        const marker = L.marker([provider.lat!, provider.lng!], { icon: markerIcon })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:160px;direction:${isAr ? 'rtl' : 'ltr'}">
              <strong style="font-size:13px">${name}</strong>
              <div style="color:#666;font-size:11px;margin-top:2px">${type}</div>
              ${address ? `<div style="font-size:11px;margin-top:4px;color:#444">${address}</div>` : ''}
              ${provider.phone1 ? `<div style="font-size:11px;margin-top:4px"><a href="tel:${provider.phone1}" style="color:#2563eb">${provider.phone1}</a></div>` : ''}
            </div>
          `);

        marker.on('click', () => { onProviderSelect(provider); });
        markersRef.current.set(provider.id, marker);
      });
    });
  }, [providers, isAr, onProviderSelect]);

  // Selected provider
  useEffect(() => {
    if (!mapRef.current || !selectedProvider?.lat || !selectedProvider?.lng) return;
    mapRef.current.setView([selectedProvider.lat, selectedProvider.lng], 15, { animate: true });
    const marker = markersRef.current.get(selectedProvider.id);
    marker?.openPopup();
  }, [selectedProvider]);

  // User location marker
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    import('leaflet').then((L) => {
      if (userMarkerRef.current) userMarkerRef.current.remove();
      const userIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(mapRef.current!)
        .bindPopup(isAr ? 'أنت هنا' : 'You are here');
      mapRef.current!.setView([userLocation.lat, userLocation.lng], 13, { animate: true });
    });
  }, [userLocation, isAr]);

  const handleLocateMe = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!mapRef.current) return;
        import('leaflet').then((L) => {
          if (userMarkerRef.current) userMarkerRef.current.remove();
          const userIcon = L.divIcon({
            html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`,
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
            .addTo(mapRef.current!)
            .bindPopup(isAr ? 'أنت هنا' : 'You are here')
            .openPopup();
          mapRef.current!.setView([latitude, longitude], 14, { animate: true });
        });
        setLocating(false);
      },
      () => { setLocating(false); }
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '300px', height: '100%' }}
      />
      <button
        onClick={handleLocateMe}
        disabled={locating}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 12,
          zIndex: 1000,
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: 8,
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
        title={isAr ? 'موقعي' : 'My Location'}
      >
        {locating ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            <circle cx="12" cy="12" r="8" strokeDasharray="4 2"/>
          </svg>
        )}
      </button>
    </div>
  );
}
