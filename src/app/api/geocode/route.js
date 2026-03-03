// app/api/geocode/route.js
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return Response.json({ results: [] });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "LuggageTerminal/1.0" },
    });
    const data = await res.json();
    if (!data.length) return Response.json({ results: [] });
    return Response.json({
      results: [{ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }],
    });
  } catch {
    return Response.json({ results: [] }, { status: 500 });
  }
}