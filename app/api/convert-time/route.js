import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const fromZone = searchParams.get('from');
    const toZone = searchParams.get('to');
    const time = searchParams.get('time'); // "HH:MM" format, optional
    const apiKey = process.env.TIMEZONEDB_API_KEY;

    if (!fromZone || !toZone || !apiKey) {
        return NextResponse.json({ success: false, error: 'Missing required parameters or API key' }, { status: 400 });
    }

    try {
        const apiUrl = new URL('http://api.timezonedb.com/v2.1/convert-time-zone');
        apiUrl.searchParams.set('key', apiKey);
        apiUrl.searchParams.set('format', 'json');
        apiUrl.searchParams.set('from', fromZone);
        apiUrl.searchParams.set('to', toZone);

        // --- NEW LOGIC TO HANDLE TIME INPUT ---
        // If a time is provided, we need to convert it to a Unix timestamp for today's date.
        if (time) {
            const [hours, minutes] = time.split(':');
            const date = new Date(); // Gets today's date
            // Set the time on the date object. Note: This uses the server's date.
            date.setHours(parseInt(hours, 10));
            date.setMinutes(parseInt(minutes, 10));
            date.setSeconds(0);
            
            const unixTimestamp = Math.floor(date.getTime() / 1000);
            apiUrl.searchParams.set('time', unixTimestamp);
        }
        // If no time is provided, the API will automatically use the current time.
        // --- END OF NEW LOGIC ---

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status !== 'OK') {
            throw new Error(data.message || 'Time zone conversion failed');
        }

        // --- MODIFIED RESPONSE TO MATCH FRONTEND ---
        // The TimeConverter component expects specific fields. We format them here.
        const fromDateObj = new Date(data.fromTimestamp * 1000);
        const toDateObj = new Date(data.toTimestamp * 1000);

        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit' };

        return NextResponse.json({
            success: true,
            fromZone: data.fromZoneName,
            toZone: data.toZoneName,
            fromTime: fromDateObj.toLocaleTimeString('en-US', { ...timeOptions, timeZone: data.fromZoneName }),
            fromDate: fromDateObj.toLocaleDateString('en-US', { ...options, timeZone: data.fromZoneName }),
            toTime: toDateObj.toLocaleTimeString('en-US', { ...timeOptions, timeZone: data.toZoneName }),
            toDate: toDateObj.toLocaleDateString('en-US', { ...options, timeZone: data.toZoneName }),
            fromTimestamp: data.fromTimestamp,
            toTimestamp: data.toTimestamp,
        });

    } catch (error) {
        console.error('TimeZoneDB API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}