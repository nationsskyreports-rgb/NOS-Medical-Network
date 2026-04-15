export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeAddress(
  address: string,
  city: string,
  governorate: string,
  countryCode = 'eg'
): Promise<GeocodeResult | null> {
  const query = [address, city, governorate, 'Egypt']
    .filter(Boolean)
    .join(', ');

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=${countryCode}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MedicalNetworkFinder/1.0',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}
