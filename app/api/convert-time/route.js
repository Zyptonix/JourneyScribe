// This is your full, corrected API file using moment-timezone.
import { NextResponse } from 'next/server';
import moment from 'moment-timezone'; // Import the new library

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const fromZone = searchParams.get('from');
    const toZone = searchParams.get('to');
    const time = searchParams.get('time');
    const apiKey = process.env.TIMEZONEDB_API_KEY;

    if (!fromZone || !toZone || !apiKey) {
        return NextResponse.json({ success: false, error: 'Missing required parameters or API key' }, { status: 400 });
    }

    try {
        const apiUrl = new URL('http://api.timezonedb.com/v2.1/convert-time-zone');
        apiUrl.searchParams.set('key', apiKey);
        apiUrl.searchParams.set('format', 'json');
        apiUrl.searchParams.set('from', fromZone); // ✨ FIX
        apiUrl.searchParams.set('to', toZone);     // ✨ FIX

        let unixTimestamp;
        if (time) {
            const datePart = moment().format('YYYY-MM-DD');
            const fullDateString = `${datePart} ${time}`;
            unixTimestamp = moment.tz(fullDateString, fromZone).unix();
            apiUrl.searchParams.set('time', unixTimestamp);
        }

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status !== 'OK') {
            throw new Error(data.message || 'Time zone conversion failed');
        }
        
        const fromDateObj = new Date(data.fromTimestamp * 1000);
        const toDateObj = new Date(data.toTimestamp * 1000);

        const formatTime = (date, tz) => {
            return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz, hour12: false }).format(date);
        };

        const formatDate = (date, tz) => {
            return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz }).format(date);
        };

        return NextResponse.json({
            success: true,
            fromZone: data.fromZoneName,
            toZone: data.toZoneName,
            fromTime: formatTime(fromDateObj, data.fromZoneName),
            fromDate: formatDate(fromDateObj, data.fromZoneName),
            toTime: formatTime(toDateObj, data.toZoneName),
            toDate: formatDate(toDateObj, data.toZoneName),
        });

    } catch (error) {
        console.error('TimeZoneDB API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}