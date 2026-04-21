'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useRef } from 'react';
import { LocateFixed, Map as MapIcon, List, Languages, Settings, Loader as Loader2, CircleAlert as AlertCircle, ShieldCheck, LogOut } from 'lucide-react';
import SplashScreen from '@/components/SplashScreen';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Provider, NearbyProvider, ProviderFilters } from '@/lib/database.types';
import { useLocale } from '@/hooks/useLocale';
import { translations, GOVERNORATE_COORDS } from '@/lib/i18n';
import SearchFilters from '@/components/SearchFilters';
import ProviderCard from '@/components/ProviderCard';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-lg">
      <Loader2 className="animate-spin text-blue-500" size={28} />
    </div>
  ),
});

type ViewMode = 'split' | 'map' | 'list';

function hasActiveFilter(filters: ProviderFilters): boolean {
  return !!(filters.cardType || filters.typeKey || filters.governorate || filters.city || filters.search);
}

export default function HomePage() {
  const router = useRouter();
  const { locale, setLocale, isRTL } = useLocale();
  const t = translations[locale];

  const [authChecked, setAuthChecked] = useState(false);
  const [providers, setProviders] = useState<(Provider | NearbyProvider)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProviderFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | NearbyProvider | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [locating, setLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([30.0131, 31.2089]);
  const [mapZoom, setMapZoom] = useState(7);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        setAuthChecked(true);
      }
    });
  }, [router]);

  // ✅ Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  const fetchProviders = useCallback(async (currentFilters: ProviderFilters) => {
    if (!hasActiveFilter(currentFilters)) {
      setProviders([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('providers')
        .select('*')
        .eq('is_active', true)
        .order('name_en');

      if (currentFilters.cardType) {
        query = query.eq('card_type', currentFilters.cardType);
      }
      if (currentFilters.typeKey) {
        query = query.eq('type_key', currentFilters.typeKey);
      }
      if (currentFilters.governorate) {
        query = query.eq('governorate_en', currentFilters.governorate);
      }
      if (currentFilters.city) {
        query = query.eq('city_en', currentFilters.city);
      }
      if (currentFilters.search) {
        query = query.or(
          `name_en.ilike.%${currentFilters.search}%,name_ar.ilike.%${currentFilters.search}%,city_en.ilike.%${currentFilters.search}%,speciality_en.ilike.%${currentFilters.search}%`
        );
      }

      const { data, error: dbError } = await query;
      if (dbError) throw dbError;
      setProviders(data || []);

      if (currentFilters.governorate && GOVERNORATE_COORDS[currentFilters.governorate]) {
        const [lat, lng] = GOVERNORATE_COORDS[currentFilters.governorate];
        setMapCenter([lat, lng]);
        setMapZoom(11);
      }
    } catch (err) {
      setError(t.error);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  const fetchNearbyProviders = useCallback(async (lat: number, lng: number, currentFilters: ProviderFilters) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase.rpc('get_nearby_providers', {
        user_lat: lat,
        user_lng: lng,
        radius_meters: 10000,
        filter_card_type: currentFilters.cardType || null,
        filter_type_key: currentFilters.typeKey || null,
        filter_governorate: currentFilters.governorate || null,
        result_limit: 500,
      });
      if (dbError) throw dbError;
      setProviders(data || []);
    } catch (err) {
      setError(t.error);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => {
    if (!authChecked) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (nearbyMode && userLocation) {
        fetchNearbyProviders(userLocation.lat, userLocation.lng, filters);
      } else if (!nearbyMode) {
        fetchProviders(filters);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, nearbyMode, userLocation, fetchProviders, fetchNearbyProviders, authChecked]);

  const handleNearby = () => {
    if (nearbyMode) {
      setNearbyMode(false);
      setUserLocation(null);
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setNearbyMode(true);
        setLocating(false);
        setMapCenter([loc.lat, loc.lng]);
        setMapZoom(13);
      },
      () => {
        setLocating(false);
        setError(t.locationDenied);
      }
    );
  };

  const handleProviderSelect = (provider: Provider | NearbyProvider) => {
    setSelectedProvider(provider);
    if (viewMode === 'list') setViewMode('split');
  };

  const handleFiltersChange = (newFilters: ProviderFilters) => {
    setFilters(newFilters);
    if (nearbyMode) setNearbyMode(false);
  };

  const noFilterActive = !hasActiveFilter(filters) && !nearbyMode;
  const [showSplash, setShowSplash] = useState(true);

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm z-10 flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 leading-tight truncate">
                {t.appName}
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">{t.appTagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
              className="h-8 px-3 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <Languages size={14} />
              {locale === 'en' ? 'عربي' : 'English'}
            </button>

            {/* ✅ Logout Button */}
            <button
              onClick={handleLogout}
              title="Sign out"
              className="h-8 px-3 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <div className="px-4 pb-3 space-y-2">
          <SearchFilters
            filters={filters}
            onChange={handleFiltersChange}
            locale={locale}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleNearby}
              disabled={locating}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-all ${
                nearbyMode
                  ? 'bg-blue-700 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              {locating ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />}
              {locating ? t.locating : t.nearbyBtn}
            </button>

            <div className="flex items-center gap-1 ms-auto">
              {(['list', 'map'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`h-8 px-2.5 rounded-lg text-xs flex items-center gap-1 transition-colors capitalize ${
                    viewMode === mode
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {mode === 'list' && <List size={13} />}
                  {mode === 'map' && <MapIcon size={13} />}
                  <span className="hidden sm:inline">{mode}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
              <AlertCircle size={13} className="flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex">
        {viewMode !== 'map' && (
          <div
            className={`flex flex-col border-e border-gray-200 bg-white overflow-hidden ${
              viewMode === 'list' ? 'w-full' : 'w-full md:w-80 lg:w-96 flex-shrink-0'
            }`}
          >
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">
                {loading
                  ? t.loading
                  : noFilterActive
                  ? ''
                  : `${providers.length} ${isRTL ? 'مقدم خدمة' : 'providers found'}`}
              </span>
              {nearbyMode && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {isRTL ? 'بالقرب منك' : 'Near you'}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-blue-500" size={28} />
                </div>
              ) : noFilterActive ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-sm font-semibold text-gray-700">
                    {isRTL ? 'ابدأ بالبحث أو اختر فلتر' : 'Search or select a filter to get started'}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {isRTL
                      ? 'اختر محافظة، نوع الخدمة، أو نوع الكارت'
                      : 'Filter by governorate, provider type, or card type'}
                  </p>
                  <button
                    onClick={handleNearby}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <LocateFixed size={13} />
                    {isRTL ? 'أو ابحث بالقرب منك' : 'Or find providers near you'}
                  </button>
                </div>
              ) : providers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-sm font-medium text-gray-700">{t.noResults}</p>
                  <p className="text-xs text-gray-500 mt-1 px-4">{t.noResultsHint}</p>
                </div>
              ) : (
                providers.map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    locale={locale}
                    onViewOnMap={handleProviderSelect}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {viewMode !== 'list' && (
          <div className="flex-1 p-2 overflow-hidden">
            <MapView
              providers={providers}
              selectedProvider={selectedProvider}
              userLocation={userLocation}
              locale={locale}
              onProviderSelect={handleProviderSelect}
              center={mapCenter}
              zoom={mapZoom}
            />
          </div>
        )}
      </main>
    </div>
  );
}
