'use client';

import { Phone, MapPin, Stethoscope, Navigation, Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { Provider, NearbyProvider } from '@/lib/database.types';
import type { Locale } from '@/lib/i18n';
import { translations, CARD_TYPE_COLORS, PROVIDER_TYPE_ICONS } from '@/lib/i18n';

interface ProviderCardProps {
  provider: Provider | NearbyProvider;
  locale: Locale;
  onViewOnMap?: (provider: Provider | NearbyProvider) => void;
}

function isNearby(p: Provider | NearbyProvider): p is NearbyProvider {
  return 'distance_meters' in p;
}

function formatDistance(meters: number, locale: Locale): string {
  const t = translations[locale];
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} ${t.km}`;
  }
  return `${Math.round(meters)} ${t.m}`;
}

const CARD_BG: Record<string, string> = {
  orange: 'bg-orange-50 border-orange-200',
  gold: 'bg-yellow-50 border-yellow-200',
  silver: 'bg-slate-50 border-slate-200',
  green: 'bg-green-50 border-green-200',
};

const CARD_BADGE: Record<string, string> = {
  orange: 'bg-orange-100 text-orange-800',
  gold: 'bg-yellow-100 text-yellow-800',
  silver: 'bg-slate-100 text-slate-700',
  green: 'bg-green-100 text-green-800',
};

export default function ProviderCard({ provider, locale, onViewOnMap }: ProviderCardProps) {
  const t = translations[locale];
  const isAr = locale === 'ar';
  const [copied, setCopied] = useState(false);

  const name = isAr ? provider.name_ar || provider.name_en : provider.name_en || provider.name_ar;
  const type = isAr ? provider.type_ar || provider.type_en : provider.type_en || provider.type_ar;
  const speciality = isAr ? provider.speciality_ar || provider.speciality_en : provider.speciality_en || provider.speciality_ar;
  const address = isAr ? provider.address_ar || provider.address_en : provider.address_en || provider.address_ar;
  const addressEn = provider.address_en || '';
  const city = isAr ? provider.city_ar || provider.city_en : provider.city_en || provider.city_ar;
  const cityEn = provider.city_en || '';
  const governorate = isAr ? provider.governorate_ar || provider.governorate_en : provider.governorate_en || provider.governorate_ar;
  const governorateEn = provider.governorate_en || '';
  const cardLabel = t.card[provider.card_type];
  const typeIcon = PROVIDER_TYPE_ICONS[provider.type_key] || '🏢';
  const distanceText = isNearby(provider) ? formatDistance(provider.distance_meters, locale) : null;

  // Full address for copy and maps
  const fullAddress = [address, city, governorate].filter(Boolean).join(', ');
  const fullAddressEn = [addressEn, cityEn, governorateEn, 'Egypt'].filter(Boolean).join(', ');
  const nameEn = provider.name_en || '';

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = fullAddress;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenInMaps = () => {
    if (provider.lat && provider.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${provider.lat},${provider.lng}`, '_blank');
    } else {
      const query = encodeURIComponent(`${nameEn} ${fullAddressEn}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`border rounded-xl p-4 transition-all hover:shadow-md ${CARD_BG[provider.card_type]} group`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="text-2xl flex-shrink-0 mt-0.5">{typeIcon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{type}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CARD_BADGE[provider.card_type]}`}>
            {cardLabel}
          </span>
          {distanceText && (
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
              <Navigation size={10} />
              {distanceText}
            </span>
          )}
        </div>
      </div>

      {speciality && (
        <div className="flex items-start gap-1.5 mt-2.5">
          <Stethoscope size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{speciality}</p>
        </div>
      )}

      {address && (
        <div className="flex items-start gap-1.5 mt-1.5">
          <MapPin size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600 line-clamp-1">{address}{city ? `, ${city}` : ''}</p>
        </div>
      )}

      {!address && city && (
        <div className="flex items-start gap-1.5 mt-1.5">
          <MapPin size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600">{city}, {governorate}</p>
        </div>
      )}

      {(provider.phone1 || provider.phone2) && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Phone size={13} className="text-gray-400 flex-shrink-0" />
          <div className="flex gap-2">
            {provider.phone1 && (
              <a href={`tel:${provider.phone1}`} className="text-xs text-blue-600 hover:underline">
                {provider.phone1}
              </a>
            )}
            {provider.phone2 && (
              <a href={`tel:${provider.phone2}`} className="text-xs text-blue-600 hover:underline">
                {provider.phone2}
              </a>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-3 pt-2 border-t border-gray-200">
        <button
          onClick={handleOpenInMaps}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg py-1.5 transition-colors"
        >
          <ExternalLink size={12} />
          {isAr ? 'فتح في الخريطة' : 'Open in Maps'}
        </button>

        {(address || city) && (
          <button
            onClick={handleCopyAddress}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg py-1.5 transition-colors"
          >
            {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
            {copied
              ? (isAr ? 'تم النسخ!' : 'Copied!')
              : (isAr ? 'نسخ العنوان' : 'Copy Address')}
          </button>
        )}

        {onViewOnMap && provider.lat && provider.lng && (
          <button
            onClick={() => onViewOnMap(provider)}
            className="flex-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg py-1.5 transition-colors"
          >
            {t.viewOnMap}
          </button>
        )}
      </div>
    </div>
  );
}
