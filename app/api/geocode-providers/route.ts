// app/api/geocode-providers/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geocode(address: string, city: string, governorate: string): Promise<{ lat: number; lng: number } | null> {
  const query = [address, city, governorate, 'Egypt'].filter(Boolean).join(', ');
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

// GET - كام provider ناقص إحداثيات
export async function GET() {
  const { count } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true })
    .is('lat', null);

  return NextResponse.json({ remaining: count ?? 0 });
}

// POST - جيوكد batch صغيرة (10 في كل مرة)
export async function POST() {
  const { data: providers, error } = await supabase
    .from('providers')
    .select('id, name_ar, name_en, address_en, address_ar, city_en, city_ar, governorate_en, governorate_ar')
    .is('lat', null)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!providers || providers.length === 0) {
    return NextResponse.json({ processed: 0, remaining: 0, done: true, results: [] });
  }

  let success = 0;
  let failed  = 0;
  const results: { name: string; ok: boolean; coords?: string }[] = [];

  for (const p of providers) {
    // جرب العنوان الإنجليزي الأول، لو مش موجود جرب العربي
    const address    = p.address_en    || p.address_ar    || '';
    const city       = p.city_en       || p.city_ar       || '';
    const governorate = p.governorate_en || p.governorate_ar || '';
    const name       = p.name_en       || p.name_ar       || '';

    const result = await geocode(address, city, governorate);

    if (result) {
      const { error: updateError } = await supabase
        .from('providers')
        .update({ lat: result.lat, lng: result.lng })
        .eq('id', p.id);

      if (!updateError) {
        success++;
        results.push({ name, ok: true, coords: `${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}` });
      } else {
        failed++;
        results.push({ name, ok: false });
      }
    } else {
      failed++;
      results.push({ name, ok: false });
    }

    await sleep(1100); // Nominatim: طلب واحد في الثانية
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
