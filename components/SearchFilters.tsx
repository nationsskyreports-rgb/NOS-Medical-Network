'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { ProviderFilters, CardType, ProviderTypeKey } from '@/lib/database.types';

interface SearchFiltersProps {
  filters: ProviderFilters;
  onChange: (filters: ProviderFilters) => void;
  locale: Locale;
  showFilters: boolean;
  onToggleFilters: () => void;
}

const CARD_TYPES: CardType[] = ['orange', 'gold', 'silver', 'green'];
const PROVIDER_TYPES: ProviderTypeKey[] = [
  'hospital', 'pharmacy', 'radiology', 'laboratory',
  'physician', 'dentist', 'optics', 'physiotherapy', 'clinic', 'other',
];

const GOVERNORATES_EN = [
  'Al Wadi Al Gadid', 'Alexandria', 'Assuit', 'Aswan',
  'Bani Sweif', 'Beheira', 'Beni Suef', 'Cairo',
  'Dakhlia', 'Damietta', 'Fayoum', 'Gharbia',
  'Giza', 'Ismailia', 'Kafr Al Sheikh', 'Luxor',
  'Marsa Matrouh', 'Menoufia', 'Minya', 'North Sinai',
  'Port Said', 'Qalubiya', 'Qena', 'Red Sea',
  'Sharkeya', 'Sohag', 'South Sinai', 'Suez',
];

export default function SearchFilters({ filters, onChange, locale, showFilters, onToggleFilters }: SearchFiltersProps) {
  const t = translations[locale];
  const isAr = locale === 'ar';

  const hasActiveFilters = filters.cardType || filters.typeKey || filters.governorate;

  const clearFilters = () => {
    onChange({ ...filters, cardType: '', typeKey: '', governorate: '' });
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder={t.search}
            className={`w-full h-10 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm`}
          />
        </div>
        <button
          onClick={onToggleFilters}
          className={`h-10 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm ${
            showFilters || hasActiveFilters
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal size={15} />
          <span className="hidden sm:inline">{t.filters}</span>
          {hasActiveFilters && (
            <span className="bg-white text-blue-600 rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">
              {[filters.cardType, filters.typeKey, filters.governorate].filter(Boolean).length}
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="h-10 px-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors shadow-sm"
            title={t.clearFilters}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <select
            value={filters.cardType || ''}
            onChange={(e) => onChange({ ...filters, cardType: e.target.value as CardType | '' })}
            className="h-9 px-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t.allCards}</option>
            {CARD_TYPES.map((ct) => (
              <option key={ct} value={ct}>{t.card[ct]}</option>
            ))}
          </select>

          <select
            value={filters.typeKey || ''}
            onChange={(e) => onChange({ ...filters, typeKey: e.target.value as ProviderTypeKey | '' })}
            className="h-9 px-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t.allTypes}</option>
            {PROVIDER_TYPES.map((pt) => (
              <option key={pt} value={pt}>{t.providerType[pt]}</option>
            ))}
          </select>

          <select
            value={filters.governorate || ''}
            onChange={(e) => onChange({ ...filters, governorate: e.target.value })}
            className="h-9 px-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t.allGovernorates}</option>
            {GOVERNORATES_EN.map((gov) => (
              <option key={gov} value={gov}>{gov}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
