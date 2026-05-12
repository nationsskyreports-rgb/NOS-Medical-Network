// app/api/geocode-providers/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// إحداثيات المحافظات كـ fallback أخير
const GOVERNORATE_COORDS: Record<string, [number, number]> = {
  Alexandria:  [31.2001, 29.9187],
  Aswan:       [24.0889, 32.8998],
  Assuit:      [27.1810, 31.1837],
  Beheira:     [30.8480, 30.3436],
  Dakahlia:    [31.0364, 31.3807],
  Giza:        [30.0131, 31.2089],
  Ismailia:    [30.5965, 32.2715],
  Luxor:       [25.6872, 32.6396],
  'Red Sea':   [27.2579, 33.8116],
  Cairo:       [30.0444, 31.2357],
  'Port Said': [31.2565, 32.2841],
  Suez:        [29.9668, 32.5498],
  Damietta:    [31.4165, 31.8133],
  Sohag:       [26.5591, 31.6957],
  Qena:        [26.1551, 32.7160],
  Minya:       [28.0871, 30.7618],
  Fayoum:      [29.3084, 30.8428],
  Sharqia:     [30.7367, 31.7199],
  Gharbia:     [30.8754, 31.0313],
  Menoufia:    [30.5973, 30.9876],
  Kafr:        [31.1107, 30.9388],
  Matrouh:     [31.3543, 27.2373],
  Sinai:       [30.2754, 33.8116],
  Beni:        [28.5473, 31.5020],
};

async function nominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=eg`;
  try {
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'MedicalNetworkFinder/1.0', 'Accept-Language': 'ar,en' },
    });
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* ignore */ }
  return null;
}

async function geocode(p: {
  address_en: string; address_ar: string;
  city_en: string;    city_ar: string;
  governorate_en: string; governorate_ar: string;
}): Promise<{ lat: number; lng: number; method: string } | null> {

  const address    = p.address_en    || p.address_ar    || '';
  const city       = p.city_en       || p.city_ar       || '';
  const governorate = p.governorate_en || p.governorate_ar || '';

  // محاولة 1: عنوان كامل
  if (address) {
    await sleep(1100);
    const r = await nominatim([address, city, governorate, 'Egypt'].filter(Boolean).join(', '));
    if (r) return { ...r, method: 'full address' };
  }

  // محاولة 2: مدينة + محافظة بس
  if (city || governorate) {
    await sleep(1100);
    const r = await nominatim([city, governorate, 'Egypt'].filter(Boolean).join(', '));
    if (r) return { ...r, method: 'city/gov' };
  }

  // محاولة 3: إحداثيات المحافظة من الـ hardcoded list
  if (p.governorate_en) {
    const key = Object.keys(GOVERNORATE_COORDS).find(k =>
      p.governorate_en.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(p.governorate_en.toLowerCase())
    );
    if (key) {
      const [lat, lng] = GOVERNORATE_COORDS[key];
      return { lat, lng, method: 'governorate fallback' };
    }
  }

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
        results.push({ name, ok: true, coords: `${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`, method: result.method });
      } else {
        failed++;
        results.push({ name, ok: false });
      }
    } else {
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
