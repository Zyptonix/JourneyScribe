export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to');
  const amount = searchParams.get('amount');
  const from = searchParams.get('from') || 'USD'; // Default to USD if not provided

  if (!from || !to || !amount) {
    return new Response(JSON.stringify({ success: false, error: 'Missing "from", "to" or "amount" query parameters' }), { status: 400 });
  }

  try {
    const response = await fetch(`https://hexarate.paikama.co/api/rates/latest/${from}?target=${to}`);
    const json = await response.json();

    if (!json.data || !json.data.mid) {
      return new Response(JSON.stringify({ success: false, error: 'Rate data missing from API response' }), { status: 500 });
    }

    const rate = json.data.mid;
    const convertedAmount = (parseFloat(amount) * rate).toFixed(2);

    return new Response(JSON.stringify({
      success: true,
      from,
      to,
      rate,
      amount: parseFloat(amount),
      convertedAmount,
      timestamp: json.data.timestamp,
    }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message || 'Fetch failed' }), { status: 500 });
  }
}
