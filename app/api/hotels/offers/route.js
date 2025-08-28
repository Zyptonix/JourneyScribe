import fetch from 'node-fetch';
import { getAmadeusAccessToken } from '@/lib/amadeusToken';

// --- Helper function to convert currency to BDT using a live API ---
async function convertToBDT(amount, fromCurrency) {
    // If the currency is already BDT, no need to convert
    if (fromCurrency === 'BDT') {
        return parseFloat(amount).toFixed(2);
    }

    try {
        // Using the HexaRate API endpoint
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


export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    const checkInDate = searchParams.get('checkInDate');
    const checkOutDate = searchParams.get('checkOutDate');
    const adults = searchParams.get('adults') || '1';
    const roomQuantity = searchParams.get('roomQuantity') || '1';

    if (!hotelId || !checkInDate || !checkOutDate) {
        return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const token = await getAmadeusAccessToken();

        const hotelOffersUrl = new URL('https://test.api.amadeus.com/v3/shopping/hotel-offers');
        hotelOffersUrl.searchParams.set('hotelIds', hotelId);
        hotelOffersUrl.searchParams.set('checkInDate', checkInDate);
        hotelOffersUrl.searchParams.set('checkOutDate', checkOutDate);
        hotelOffersUrl.searchParams.set('adults', adults);
        hotelOffersUrl.searchParams.set('roomQuantity', roomQuantity);
        hotelOffersUrl.searchParams.set('view', 'FULL_ALL_PRICES');

        const hotelRes = await fetch(hotelOffersUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` }
        });

        const hotelData = await hotelRes.json();

        if (!hotelRes.ok) {
            return new Response(JSON.stringify({ error: hotelData.errors?.[0]?.detail || 'Failed to fetch hotel offers' }), {
                status: hotelRes.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let simplifiedAllOffers = [];
        if (hotelData.data && hotelData.data.length > 0) {
            for (const offerItem of hotelData.data) {
                const hotel = offerItem.hotel || {};
                for (const singleOffer of offerItem.offers || []) {
                    let priceBDT = null;
                    let originalPrice = null;
                    
                    if (singleOffer.price) {
                        originalPrice = `${parseFloat(singleOffer.price.total)} ${singleOffer.price.currency}`;
                        
                        // Call the new async helper function
                        const convertedAmount = await convertToBDT(singleOffer.price.total, singleOffer.price.currency);
                        
                        // Check if the conversion was successful (not null)
                        if (convertedAmount !== null) {
                            priceBDT = `${convertedAmount} BDT`;
                        } else {
                            priceBDT = 'N/A'; // Fallback value if conversion fails
                        }
                    }
                    
                    const cancellationText = singleOffer.policies?.cancellation?.description?.text || 'No cancellation details provided.';
                    const isRefundable = !cancellationText.toUpperCase().includes('NON-REFUNDABLE');

                    simplifiedAllOffers.push({
                        hotelId: hotel.hotelId || 'N/A',
                        name: hotel.name || 'Unknown Hotel',
                        offerId: singleOffer.id || null,
                        originalPrice: originalPrice,
                        priceBDT: priceBDT,
                        guests: singleOffer.guests?.adults,
                        category: singleOffer.room?.typeEstimated?.category || 'N/A',
                        roomDescription: singleOffer.room?.description?.text || 'No description available.',
                        bedType: singleOffer.room?.typeEstimated?.bedType || 'N/A',
                        beds: singleOffer.room?.typeEstimated?.beds || 'N/A',
                        paymentType: singleOffer.policies?.paymentType || 'N/A',
                        cancellationPolicy: cancellationText,
                        isRefundable: isRefundable,
                    });
                }
            }
        }

        return new Response(JSON.stringify(simplifiedAllOffers), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('API Route Error (Hotel Offers):', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}