import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const type = searchParams.get('type') || 'restaurant'; // default: restaurants

    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Call Google Places Nearby Search API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=${type}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();

    if (data.status !== 'OK') {
      return NextResponse.json({ success: false, error: data.error_message || data.status }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      results: data.results,
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
