import { getAmadeusAccessToken } from '@/lib/amadeusToken'; // Adjust path as needed

// Currency converter from original currency to BDT
async function convertToBDT(amount, fromCurrency) {
  const res = await fetch(`http://localhost:9243/api/convert-currency?to=BDT&amount=${amount}&from=${fromCurrency}`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || 'Conversion failed');
  }

  return Math.round(json.convertedAmount);
}
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const departureDate = searchParams.get('departureDate');
  const adults = searchParams.get('adults') || '1';

  if (!origin || !destination || !departureDate) {
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const token = await getAmadeusAccessToken();

    const apiUrl = new URL('https://test.api.amadeus.com/v2/shopping/flight-offers');
    apiUrl.searchParams.set('originLocationCode', origin);
    apiUrl.searchParams.set('destinationLocationCode', destination);
    apiUrl.searchParams.set('departureDate', departureDate);
    apiUrl.searchParams.set('adults', adults);
    apiUrl.searchParams.set('nonStop', 'false');
    apiUrl.searchParams.set('max', '5');

    const flightRes = await fetch(apiUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    const flightData = await flightRes.json();

    if (!flightRes.ok) {
      return new Response(JSON.stringify({ error: flightData }), {
        status: flightRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

const simplified = await Promise.all(
  flightData.data.map(async (offer) => {
    const itinerary = offer.itineraries[0];
    const segments = itinerary.segments;

    const from = segments[0].departure.iataCode;
    const to = segments[segments.length - 1].arrival.iataCode;
    const hasTransits = segments.length > 1;

    const transitLocations = segments
      .slice(0, -1) // all except final segment
      .map(seg => seg.arrival.iataCode); // airports where layovers happen

    const originalPrice = parseFloat(offer.price.total);
    const currency = offer.price.currency;

    const priceBDT = await convertToBDT(originalPrice, currency);

    return {
      from,
      to,
      hasTransits,
      transitLocations,
      originalPrice: `${originalPrice} ${currency}`,
      priceBDT: `${priceBDT} BDT`
    };
  })
);

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
