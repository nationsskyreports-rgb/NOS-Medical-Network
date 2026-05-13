// app/api/geocode-providers/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// إحداثيات المحافظات — إنجليزي وعربي
const GOVERNORATE_COORDS: { keys: string[]; lat: number; lng: number }[] = [
  { keys: ['cairo', 'القاهرة'],               lat: 30.0444, lng: 31.2357 },
  { keys: ['giza', 'الجيزة', 'الجيزه'],       lat: 30.0131, lng: 31.2089 },
  { keys: ['alexandria', 'الإسكندرية', 'اسكندرية', 'الاسكندرية'], lat: 31.2001, lng: 29.9187 },
  { keys: ['aswan', 'أسوان', 'اسوان'],         lat: 24.0889, lng: 32.8998 },
  { keys: ['assuit', 'assiut', 'أسيوط', 'اسيوط'], lat: 27.1810, lng: 31.1837 },
  { keys: ['beheira', 'البحيرة'],              lat: 30.8480, lng: 30.3436 },
  { keys: ['dakahlia', 'الدقهلية'],            lat: 31.0364, lng: 31.3807 },
  { keys: ['ismailia', 'الإسماعيلية'],         lat: 30.5965, lng: 32.2715 },
  { keys: ['luxor', 'الأقصر', 'الاقصر'],       lat: 25.6872, lng: 32.6396 },
  { keys: ['red sea', 'البحر الأحمر'],         lat: 27.2579, lng: 33.8116 },
  { keys: ['port said', 'بورسعيد'],            lat: 31.2565, lng: 32.2841 },
  { keys: ['suez', 'السويس'],                  lat: 29.9668, lng: 32.5498 },
  { keys: ['damietta', 'دمياط'],               lat: 31.4165, lng: 31.8133 },
  { keys: ['sohag', 'سوهاج'],                  lat: 26.5591, lng: 31.6957 },
  { keys: ['qena', 'قنا'],                     lat: 26.1551, lng: 32.7160 },
  { keys: ['minya', 'المنيا'],                 lat: 28.0871, lng: 30.7618 },
  { keys: ['fayoum', 'الفيوم'],                lat: 29.3084, lng: 30.8428 },
  { keys: ['sharqia', 'الشرقية'],              lat: 30.7367, lng: 31.7199 },
  { keys: ['gharbia', 'الغربية'],              lat: 30.8754, lng: 31.0313 },
  { keys: ['menoufia', 'المنوفية'],            lat: 30.5973, lng: 30.9876 },
  { keys: ['kafr', 'كفر الشيخ'],              lat: 31.1107, lng: 30.9388 },
  { keys: ['matrouh', 'مطروح'],               lat: 31.3543, lng: 27.2373 },
  { keys: ['sinai', 'سيناء'],                  lat: 30.2754, lng: 33.8116 },
  { keys: ['beni', 'بني سويف'],               lat: 28.5473, lng: 31.5020 },
  { keys: ['north sinai', 'شمال سيناء'],       lat: 30.9408, lng: 33.5974 },
  { keys: ['south sinai', 'جنوب سيناء'],       lat: 28.2100, lng: 34.1500 },
  { keys: ['heliopolis', 'مصر الجديدة'],       lat: 30.0878, lng: 31.3267 },
  { keys: ['nasr city', 'مدينة نصر'],         lat: 30.0626, lng: 31.3417 },
  { keys: ['new cairo', 'القاهرة الجديدة'],    lat: 30.0286, lng: 31.4842 },
  { keys: ['6th', 'السادس من أكتوبر', 'اكتوبر'], lat: 29.9097, lng: 30.9501 },
  { keys: ['sheikh zayed', 'الشيخ زايد'],      lat: 30.0439, lng: 30.9425 },
];

function normalizeAr(text: string): string {
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ً-ٟ]/g, '')
    .toLowerCase()
    .trim();
}

function getGovernorateCoords(govEn: string, govAr: string): { lat: number; lng: number } | null {
  const searchEn = (govEn || '').toLowerCase().trim();
  const searchAr = normalizeAr(govAr || '');
  if (!searchEn && !searchAr) return null;

  for (const g of GOVERNORATE_COORDS) {
    for (const key of g.keys) {
      const normalizedKey = normalizeAr(key);
      if (searchEn && (searchEn.includes(key.toLowerCase()) || key.toLowerCase().includes(searchEn))) {
        return { lat: g.lat, lng: g.lng };
      }
      if (searchAr && (searchAr.includes(normalizedKey) || normalizedKey.includes(searchAr))) {
        return { lat: g.lat, lng: g.lng };
      }
    }
  }
  return null;
}

async function nominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=eg`;
  try {
    const res  = await fetch(url, { headers: { 'User-Agent': 'MedicalNetworkFinder/1.0', 'Accept-Language': 'ar,en' } });
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* ignore */ }
  return null;
}

async function geocode(p: {
  address_en: string; address_ar: string;
  city_en: string;    city_ar: string;
  governorate_en: string; governorate_ar: string;
}): Promise<{ lat: number; lng: number; method: string } | null> {

  const address     = p.address_en     || p.address_ar     || '';
  const city        = p.city_en        || p.city_ar        || '';

  // لو فيه عنوان تفصيلي → جرب Nominatim
  if (address) {
    await sleep(1100);
    const governorate = p.governorate_en || p.governorate_ar || '';
    const r = await nominatim([address, city, governorate, 'Egypt'].filter(Boolean).join(', '));
    if (r) return { ...r, method: 'full address' };
  }

  // لو فيه مدينة بس من غير عنوان → جرب Nominatim بالمدينة
  if (city && !address) {
    await sleep(1100);
    const governorate = p.governorate_en || p.governorate_ar || '';
    const r = await nominatim([city, governorate, 'Egypt'].filter(Boolean).join(', '));
    if (r) return { ...r, method: 'city/gov' };
  }

  // مفيش عنوان ولا مدينة → روح للـ fallback مباشرة (بدون Nominatim)
  const coords = getGovernorateCoords(p.governorate_en, p.governorate_ar);
  if (coords) return { ...coords, method: 'governorate fallback' };

  return null;
}

export async function GET() {
  const { count } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true })
    .is('lat', null);
  return NextResponse.json({ remaining: count ?? 0 });
}

export async function POST() {
  const { data: providers, error } = await supabase
    .from('providers')
    .select('id, name_en, name_ar, address_en, address_ar, city_en, city_ar, governorate_en, governorate_ar')
    .is('lat', null)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!providers || providers.length === 0)
    return NextResponse.json({ processed: 0, remaining: 0, done: true, results: [] });

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
