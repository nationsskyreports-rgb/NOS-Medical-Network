// app/api/geocode-providers/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// حدود مصر الجغرافية للتأكد من صحة النتيجة
const EGYPT_BOUNDS = {
  minLat: 22.0,
  maxLat: 31.7,
  minLng: 24.7,
  maxLng: 37.0,
};

// إحداثيات المحافظات لتأكيد المسافة من النتيجة (validation فقط، مش fallback)
const GOVERNORATE_CENTERS: Record<string, [number, number]> = {
  alexandria: [31.2001, 29.9187],
  aswan:      [24.0889, 32.8998],
  assuit:     [27.1810, 31.1837],
  asyut:      [27.1810, 31.1837],
  beheira:    [30.8480, 30.3436],
  dakahlia:   [31.0364, 31.3807],
  giza:       [30.0131, 31.2089],
  ismailia:   [30.5965, 32.2715],
  luxor:      [25.6872, 32.6396],
  'red sea':  [27.2579, 33.8116],
  cairo:      [30.0444, 31.2357],
  'port said':[31.2565, 32.2841],
  suez:       [29.9668, 32.5498],
  damietta:   [31.4165, 31.8133],
  sohag:      [26.5591, 31.6957],
  qena:       [26.1551, 32.7160],
  minya:      [28.0871, 30.7618],
  fayoum:     [29.3084, 30.8428],
  sharqia:    [30.7367, 31.7199],
  sharkeya:   [30.7367, 31.7199],
  gharbia:    [30.8754, 31.0313],
  menoufia:   [30.5973, 30.9876],
  'kafr el sheikh': [31.1107, 30.9388],
  matrouh:    [31.3543, 27.2373],
  sinai:      [30.2754, 33.8116],
  'beni suef':[28.5473, 31.5020],
};

function isInEgypt(lat: number, lng: number): boolean {
  return (
    lat >= EGYPT_BOUNDS.minLat && lat <= EGYPT_BOUNDS.maxLat &&
    lng >= EGYPT_BOUNDS.minLng && lng <= EGYPT_BOUNDS.maxLng
  );
}

// حساب المسافة بالكيلومتر بين نقطتين (Haversine)
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// تأكيد أن النتيجة قريبة من المحافظة المتوقعة (max 150km)
function isPlausible(
  lat: number, lng: number,
  governorate_en: string
): boolean {
  if (!isInEgypt(lat, lng)) return false;

  const govLower = governorate_en.toLowerCase();
  const key = Object.keys(GOVERNORATE_CENTERS).find(k =>
    govLower.includes(k) || k.includes(govLower)
  );
  if (!key) return true; // لو مش عارف المحافظة، قبّل النتيجة لو في مصر

  const [cLat, cLng] = GOVERNORATE_CENTERS[key];
  const dist = distanceKm(lat, lng, cLat, cLng);
  return dist <= 150; // 150km max من مركز المحافظة
}

async function nominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=eg`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MedicalNetworkFinder/1.0',
        'Accept-Language': 'ar,en',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* ignore */ }
  return null;
}

async function geocode(p: {
  address_en: string; address_ar: string;
  city_en: string; city_ar: string;
  governorate_en: string; governorate_ar: string;
}): Promise<{ lat: number; lng: number; method: string } | null> {

  const address    = p.address_en    || p.address_ar    || '';
  const city       = p.city_en       || p.city_ar       || '';
  const governorate = p.governorate_en || p.governorate_ar || '';
  const govEn      = p.governorate_en || '';

  // محاولة 1: عنوان كامل
  if (address && city) {
    await sleep(1100);
    const r = await nominatim([address, city, governorate, 'Egypt'].filter(Boolean).join(', '));
    if (r && isPlausible(r.lat, r.lng, govEn)) {
      return { ...r, method: 'full address' };
    }
  }

  // محاولة 2: اسم المحل + المدينة فقط (بدون العنوان التفصيلي)
  if (address && city && address !== city) {
    await sleep(1100);
    // جرب بدون العنوان التفصيلي - أحياناً الاسم + المدينة أدق
    const shortQuery = [city, governorate, 'Egypt'].filter(Boolean).join(', ');
    const r = await nominatim(shortQuery);
    if (r && isPlausible(r.lat, r.lng, govEn)) {
      return { ...r, method: 'city only' };
    }
  } else if (!address && (city || governorate)) {
    // لو معندوش عنوان خالص، جرب المدينة والمحافظة
    await sleep(1100);
    const r = await nominatim([city, governorate, 'Egypt'].filter(Boolean).join(', '));
    if (r && isPlausible(r.lat, r.lng, govEn)) {
      return { ...r, method: 'city/gov' };
    }
  }

  // ❌ مفيش governorate fallback — الـ provider يفضل null أحسن من إحداثيات غلط
  return null;
}

// GET - كام provider ناقص
export async function GET() {
  const { count } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true })
    .is('lat', null);

  return NextResponse.json({ remaining: count ?? 0 });
}

// POST - جيوكد batch
export async function POST() {
  const { data: providers, error } = await supabase
    .from('providers')
    .select('id, name_en, name_ar, address_en, address_ar, city_en, city_ar, governorate_en, governorate_ar')
    .is('lat', null)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!providers || providers.length === 0) {
    return NextResponse.json({ processed: 0, remaining: 0, done: true, results: [] });
  }

  let success = 0;
  let failed  = 0;
  const results: { name: string; ok: boolean; coords?: string; method?: string }[] = [];

  for (const p of providers) {
    const name   = p.name_en || p.name_ar || '';
    const result = await geocode(p);

    if (result) {
      const { error: updateError } = await supabase
        .from('providers')
        .update({ lat: result.lat, lng: result.lng })
        .eq('id', p.id);

      if (!updateError) {
        success++;
        results.push({
          name,
          ok: true,
          coords: `${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`,
          method: result.method,
        });
      } else {
        failed++;
        results.push({ name, ok: false });
      }
    } else {
      // خلّي lat/lng null — متحطش إحداثيات وهمية
      failed++;
      results.push({ name, ok: false });
    }
  }

  const { count: remaining } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true })
    .is('lat', null);

  return NextResponse.json({
    processed: providers.length,
    success,
    failed,
    remaining: remaining ?? 0,
    done: (remaining ?? 0) === 0,
    results,
  });
}
