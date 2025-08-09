
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  // time param is optional
  const time = searchParams.get('time'); // may be null
  const apiKey = process.env.TIMEZONEDB_API_KEY;
 
  if (!from || !to || !apiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required parameters or API key' }),
      { status: 400 }
    );
  }

  const apiUrl = new URL('http://api.timezonedb.com/v2.1/convert-time-zone');
  apiUrl.searchParams.set('key', apiKey);
  apiUrl.searchParams.set('format', 'json');
  apiUrl.searchParams.set('from', from);
  apiUrl.searchParams.set('to', to);

  // Only add 'time' param if provided; else API uses current time automatically
  if (time) {
    apiUrl.searchParams.set('time', time);
  }

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    const fromDate = new Date(data.fromTimestamp * 1000);
    const toDate = new Date(data.toTimestamp * 1000);

    // Format local date strings
    const fromLocal = new Intl.DateTimeFormat('en-US', {
      timeZone: data.fromZoneName,
      dateStyle: 'full',
      timeStyle: 'long',
    }).format(fromDate);

    const toLocal = new Intl.DateTimeFormat('en-US', {
      timeZone: data.toZoneName,
      dateStyle: 'full',
      timeStyle: 'long',
    }).format(toDate);

    if (data.status !== 'OK') {
      return new Response(
        JSON.stringify({ success: false, error: data.message || 'Time zone conversion failed' }),
        { status: 500 }
      );
    }

    const fromDateISO = new Date(data.fromTimestamp * 1000).toISOString();
    const toDateISO = new Date(data.toTimestamp * 1000).toISOString();

    return new Response(
      JSON.stringify({
        success: true,
        fromZone: data.fromZoneName,
        toZone: data.toZoneName,
        fromAbbreviation: data.fromAbbreviation,
        toAbbreviation: data.toAbbreviation,
        fromTimestamp: data.fromTimestamp,
        toTimestamp: data.toTimestamp,
        fromDateISO,
        toDateISO,
        fromLocal,
        toLocal,
        offset: data.offset,
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error('TimeZoneDB error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    );
  }
}
