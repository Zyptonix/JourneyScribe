
import fetch from 'node-fetch';
import { getAmadeusAccessToken } from '@/lib/amadeusToken';

// Currency converter from original currency to BDT
async function convertToBDT(amount, fromCurrency) {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const res = await fetch(`http://localhost:9243/api/convert-currency?to=BDT&amount=${amount}&from=${fromCurrency}`);
            const json = await res.json();
            if (!res.ok || !json.success) {

                throw new Error(json.error || 'Conversion failed');
            }
            return Math.round(json.convertedAmount);
        } catch (error) {

            if (i === maxRetries - 1) throw error;
            await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
        }
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    const checkInDate = searchParams.get('checkInDate');
    const checkOutDate = searchParams.get('checkOutDate');
    const adults = searchParams.get('adults') || '1';
    const roomQuantity = searchParams.get('roomQuantity') || '1';
    const boardType = searchParams.get('boardType');
    const includeClosed = searchParams.get('includeClosed');

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

        if (boardType) hotelOffersUrl.searchParams.set('boardType', boardType);
        if (includeClosed) hotelOffersUrl.searchParams.set('includeClosed', includeClosed);


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
                        try {
                            priceBDT = await convertToBDT(parseFloat(singleOffer.price.total), singleOffer.price.currency);
                            priceBDT = `${priceBDT} BDT`;
                        } catch (conversionError) {

                            priceBDT = 'N/A';
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
                        // FIX: Corrected the path to the room category
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
