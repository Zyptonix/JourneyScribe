import { NextResponse } from 'next/server';
import { getAmadeusAccessToken } from '@/lib/amadeusToken';

// Helper function to format data consistently
const formatActivityData = (activity) => ({
    id: activity.id,
    name: activity.name,
    description: activity.description || null,
    category: activity.category || (activity.tags && activity.tags.length > 0 ? activity.tags[0] : 'Activity'),
    cost: parseFloat(activity.price?.amount) || 0,
    pictures: activity.pictures || [],
    geoCode: activity.geoCode,
    type: 'api',
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const cityCode = searchParams.get('cityCode');

    if (!cityCode) {
      return NextResponse.json({ error: 'Missing required parameter: cityCode' }, { status: 400 });
    }

    const accessToken = await getAmadeusAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Could not retrieve Amadeus access token' }, { status: 500 });
    }

    // Step 1: Get city coordinates
    const locationResponse = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&keyword=${cityCode}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const locationData = await locationResponse.json();

    if (!locationResponse.ok || !locationData.data || locationData.data.length === 0) {
      return NextResponse.json({ error: 'City not found or API error' }, { status: 404 });
    }
    const { latitude, longitude } = locationData.data[0].geoCode;

    // Step 2: Always use the Activities by Square API
    const activitiesResponse = await fetch(
      `https://test.api.amadeus.com/v1/shopping/activities/by-square?north=${latitude + 0.1}&west=${longitude - 0.1}&south=${latitude - 0.1}&east=${longitude + 0.1}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!activitiesResponse.ok) {
      const errorData = await activitiesResponse.json();
      console.error('Amadeus Activities API error:', errorData);
      return NextResponse.json({ error: 'Failed to fetch activities from Amadeus' }, { status: activitiesResponse.status });
    }

    const activitiesData = await activitiesResponse.json();
    let processedData = activitiesData.data || [];

    // Step 3: Conditionally filter or limit the results
    if (keyword) {
      // If a keyword exists, filter the results
      processedData = processedData.filter(activity => 
        activity.name.toLowerCase().includes(keyword.toLowerCase())
      );
      processedData = processedData.slice(0, 30);
    } else {
      // If no keyword, limit the results to the first 30
      processedData = processedData.slice(0, 30);
    }
    
    // Step 4: Format the final data and send it back
    const formattedData = processedData.map(formatActivityData);
    
    return NextResponse.json(formattedData);

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
