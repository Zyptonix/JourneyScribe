// In /app/api/get-timezone/route.js

import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const apiKey = process.env.TIMEZONEDB_API_KEY;

  if (!lat || !lon || !apiKey) {
    return NextResponse.json({ success: false, error: 'Missing required parameters or API key' }, { status: 400 });
  }

  const apiUrl = `http://api.timezonedb.com/v2.1/get-time-zone?key=${apiKey}&format=json&by=position&lat=${lat}&lng=${lon}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      return NextResponse.json({ success: false, error: data.message || 'Failed to get time zone' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      timezone: data.zoneName,
    });

  } catch (error) {
    console.error('TimeZoneDB get-time-zone error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}