import { NextResponse } from 'next/server';
import { getAmadeusAccessToken } from '@/lib/amadeusToken';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const cityCode = searchParams.get('cityCode');

    if (!cityCode || !keyword) {
      return NextResponse.json({ error: 'Missing required parameters: cityCode and keyword' }, { status: 400 });
    }

    const accessToken = await getAmadeusAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Could not retrieve Amadeus access token' }, { status: 500 });
    }

    // Step 1: Get city coordinates from the City Search API
    const locationResponse = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&keyword=${cityCode}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const locationData = await locationResponse.json();
    if (!locationResponse.ok || !locationData.data || locationData.data.length === 0) {
      return NextResponse.json({ error: 'City not found or API error' }, { status: 404 });
    }

    const { latitude, longitude } = locationData.data[0].geoCode;
    
    // Step 2: Use the new, more specific Activities by Square API
    const activitiesResponse = await fetch(
      `https://test.api.amadeus.com/v1/shopping/activities/by-square?north=${latitude + 0.1}&west=${longitude - 0.1}&south=${latitude - 0.1}&east=${longitude + 0.1}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!activitiesResponse.ok) {
      const errorData = await activitiesResponse.json();
      console.error('Amadeus Activities API error:', errorData);
      return NextResponse.json({ error: 'Failed to fetch activities from Amadeus' }, { status: activitiesResponse.status });
    }

    const activitiesData = await activitiesResponse.json();
    
    // The 'by-square' API doesn't accept a keyword, so we filter on the server
    const formattedData = activitiesData.data
      .filter(activity => activity.name.toLowerCase().includes(keyword.toLowerCase()))
      .map(activity => ({
        id: activity.id,
        name: activity.name,
        category: activity.description?.split(',')[0].trim() || 'Activity',
        // This is the key change: we ensure cost is a number or 0
        cost: parseFloat(activity.price?.amount) || 0,
        type: 'api',
        subType: activity.subType,
        latitude: activity.geoCode?.latitude,
        longitude: activity.geoCode?.longitude,
        pictures: activity.pictures,
      }));
    
    return NextResponse.json(formattedData);

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}