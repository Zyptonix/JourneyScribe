import fetch from 'node-fetch';
import { getAmadeusAccessToken } from '@/lib/amadeusToken';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const cityCode = searchParams.get('cityCode');

  if (!cityCode) {
    return new Response(JSON.stringify({ error: 'Missing cityCode parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const token = await getAmadeusAccessToken();

    const byCityUrl = new URL('https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city');
    byCityUrl.searchParams.set('cityCode', cityCode);
    byCityUrl.searchParams.set('radius', '5');
    byCityUrl.searchParams.set('radiusUnit', 'KM');
    byCityUrl.searchParams.set('hotelSource', 'ALL');

    const hotelsRes = await fetch(byCityUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    const hotelsJson = await hotelsRes.json();

    if (!hotelsRes.ok) {
      return new Response(JSON.stringify({ error: hotelsJson }), {
        status: hotelsRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Simplify and select important info
    const simplified = (hotelsJson.data || [])
      .slice(0, 10)
      .map(hotel => ({
        name: hotel.name || 'Unknown Hotel',
        hotelId: hotel.hotelId || 'N/A',
        cityCode: hotel.cityCode || 'N/A',
        latitude: hotel.geoCode?.latitude || null,
        longitude: hotel.geoCode?.longitude || null,
        distanceInKm: hotel.distance?.value || null
      }));

    return new Response(JSON.stringify(simplified), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
