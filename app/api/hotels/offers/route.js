import fetch from 'node-fetch'; // If using Node.js environment directly
import { getAmadeusAccessToken } from '@/lib/amadeusToken'; // Adjust path as needed

// Currency converter from original currency to BDT
async function convertToBDT(amount, fromCurrency) {
    const maxRetries = 5;
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const res = await fetch(`http://localhost:9243/api/convert-currency?to=BDT&amount=${amount}&from=${fromCurrency}`);
            const json = await res.json();

            if (!res.ok || !json.success) {
                console.warn(`Currency conversion failed (attempt ${retries + 1}):`, json.error || res.statusText);
                throw new Error(json.error || 'Conversion failed');
            }
            return Math.round(json.convertedAmount);
        } catch (error) {
            if (retries < maxRetries - 1) {
                const delay = Math.pow(2, retries) * 1000;
                console.log(`Retrying currency conversion in ${delay / 1000}s...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                throw error;
            }
        }
        retries++;
    }
}


export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId'); // Now explicitly taking hotelId
    const checkInDate = searchParams.get('checkInDate');
    const checkOutDate = searchParams.get('checkOutDate');
    const adults = searchParams.get('adults') || '1'; // Adults per room
    const roomQuantity = searchParams.get('roomQuantity') || '1'; // Number of rooms

    if (!hotelId || !checkInDate || !checkOutDate) {
        return new Response(JSON.stringify({ error: 'Missing required parameters: hotelId, checkInDate, checkOutDate' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const token = await getAmadeusAccessToken();

        // Use the Hotel Offers Search API (v3) specifically for the given hotelId
        const hotelOffersUrl = new URL('https://test.api.amadeus.com/v3/shopping/hotel-offers');
        hotelOffersUrl.searchParams.set('hotelIds', hotelId); // Use hotelIds parameter for a specific hotel
        hotelOffersUrl.searchParams.set('checkInDate', checkInDate);
        hotelOffersUrl.searchParams.set('checkOutDate', checkOutDate);
        hotelOffersUrl.searchParams.set('adults', adults);
        hotelOffersUrl.searchParams.set('roomQuantity', roomQuantity); // Use roomQuantity
        hotelOffersUrl.searchParams.set('view', 'FULL_ALL_PRICES'); // Request comprehensive pricing info
        // Removed page[limit] here to get all offers for the requested hotel
        // as per user's request "show me all the offers"
        // hotelOffersUrl.searchParams.set('page[limit]', '1'); 

        const hotelRes = await fetch(hotelOffersUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` }
        });

        const hotelData = await hotelRes.json();

        if (!hotelRes.ok) {
            // console.error("Amadeus Hotel Offers API (v3) Error:", hotelData);
            return new Response(JSON.stringify({ error: hotelData.errors?.[0]?.detail || 'Failed to fetch hotel offers from Amadeus (v3)' }), {
                status: hotelRes.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // --- Flatten and simplify all offers ---
        let simplifiedAllOffers = [];
        if (hotelData.data && hotelData.data.length > 0) {
            // There should ideally be only one hotel in data array if 'hotelIds' is used,
            // but we iterate to be safe and extract all offers from it.
            for (const offerItem of hotelData.data) {
                const hotel = offerItem.hotel || {};
                const address = hotel.address || {};
                const contact = hotel.contact || {};
                const amenities = hotel.amenities || [];
                const description = hotel.description?.text || 'No description available.';

                for (const singleOffer of offerItem.offers || []) { // Iterate through all offers for this hotel
                    let priceBDT = null;
                    let originalPrice = null;
                    if (singleOffer.price) {
                        originalPrice = `${parseFloat(singleOffer.price.total)} ${singleOffer.price.currency}`;
                        try {
                            priceBDT = await convertToBDT(parseFloat(singleOffer.price.total), singleOffer.price.currency);
                            priceBDT = `${priceBDT} BDT`;
                        } catch (conversionError) {
                            console.error(`Error converting currency for offer ${singleOffer.id} of hotel ${hotel.name}:`, conversionError.message);
                            priceBDT = 'N/A';
                        }
                    }

                    simplifiedAllOffers.push({
                        // Hotel Details (duplicated for each offer, or can be structured differently if preferred)
                        hotelId: hotel.hotelId || 'N/A',
                        name: hotel.name || 'Unknown Hotel',
                        chainCode: hotel.chainCode || 'N/A',
                        cityCode: hotel.cityCode || 'N/A', 
                        latitude: hotel.latitude || null,
                        longitude: hotel.longitude || null,
                        description: singleOffer?.room.description,
                        policies: singleOffer?.policies || {}, // Policies are per offer
                        
                        // Offer Specific Details
                        offerId: singleOffer.id || null, 
                        originalPrice: originalPrice,
                        priceBDT: priceBDT,
                        roomDescription: singleOffer?.room?.description?.text || 'N/A',
                        checkInDate: singleOffer.checkInDate,
                        checkOutDate: singleOffer.checkOutDate,
                        guests: singleOffer.guests?.adults, // Number of adults for this specific offer
                        rateCode: singleOffer.rateCode || 'N/A',
                        refundable: singleOffer.policies?.refundable?.cancellationRefund,
                        cancellationDeadline: singleOffer.policies?.cancellations?.[0]?.deadline || 'N/A',
                        roomdescription: singleOffer?.roomInformation?.description || 'N/A',
                        bedType: singleOffer?.roomInformation?.typeEstimated?.bedType || 'N/A',
                        beds: singleOffer?.roomInformation?.typeEstimated?.beds || 'N/A',
                        category: singleOffer?.roomInformation?.typeEstimated?.category || 'N/A',
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
