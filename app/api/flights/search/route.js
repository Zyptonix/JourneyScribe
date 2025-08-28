import { getAmadeusAccessToken } from '@/lib/amadeusToken'; // Adjust path as needed

// --- Helper function to convert currency to BDT ---
async function convertToBDT(amount, fromCurrency) {
  // If the currency is already BDT, no need to convert
  if (fromCurrency === 'BDT') {
    return parseFloat(amount).toFixed(2);
  }

  try {
    // Using the HexaRate API endpoint you provided
    const response = await fetch(`https://hexarate.paikama.co/api/rates/latest/${fromCurrency}?target=BDT`);
    if (!response.ok) {
      console.error(`Currency conversion API failed with status: ${response.status}`);
      return null; // Return null on failure to avoid breaking the main request
    }
    
    const json = await response.json();
    if (!json.data || !json.data.mid) {
      console.error('Rate data missing from currency API response');
      return null;
    }

    const rate = json.data.mid;
    return (parseFloat(amount) * rate).toFixed(2);

  } catch (error) {
    console.error('Error during currency conversion fetch:', error.message);
    return null; // Return null on error
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  // --- Read all parameters from the request ---
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const departureDate = searchParams.get('departureDate');
  const returnDate = searchParams.get('returnDate');
  const adults = searchParams.get('adults') || '1';
  const children = searchParams.get('children');
  const infants = searchParams.get('infants');
  const travelClass = searchParams.get('travelClass');
  const nonstop = searchParams.get('nonstop');

  if (!origin || !destination || !departureDate) {
    return new Response(JSON.stringify({ error: 'Missing required search parameters' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const token = await getAmadeusAccessToken();

    // --- Build Amadeus API URL ---
    const apiUrl = new URL('https://test.api.amadeus.com/v2/shopping/flight-offers');
    apiUrl.searchParams.set('originLocationCode', origin);
    apiUrl.searchParams.set('destinationLocationCode', destination);
    apiUrl.searchParams.set('departureDate', departureDate);
    apiUrl.searchParams.set('adults', adults);
    apiUrl.searchParams.set('max', '10');

    if (returnDate) apiUrl.searchParams.set('returnDate', returnDate);
    if (children) apiUrl.searchParams.set('children', children);
    if (infants) apiUrl.searchParams.set('infants', infants);
    if (travelClass) apiUrl.searchParams.set('travelClass', travelClass);
    if (nonstop === 'true') apiUrl.searchParams.set('nonStop', 'true');

    // --- Call Amadeus API ---
    const flightRes = await fetch(apiUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const flightData = await flightRes.json();

    if (!flightRes.ok) {
      console.error("Amadeus API Error:", flightData);
      return new Response(JSON.stringify({ error: flightData.errors?.[0]?.detail || 'Failed to fetch flights.' }), {
        status: flightRes.status, headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- Process and Convert Currency for each offer ---
    const offersWithBDT = await Promise.all(
      (flightData.data || []).map(async (offer) => {
        const originalTotal = offer.price.total;
        const originalCurrency = offer.price.currency;
        
        // Call the conversion helper
        const totalBDT = await convertToBDT(originalTotal, originalCurrency);

        // Return the original offer with the new BDT price added
        return {
          ...offer,
          price: {
            ...offer.price,
            totalBDT: totalBDT, // Add the new field
          },
        };
      })
    );

    return new Response(JSON.stringify(offersWithBDT), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('API Route Error:', err.message);
    return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
