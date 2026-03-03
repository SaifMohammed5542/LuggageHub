// app/api/geocode/autocomplete/route.js
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q      = searchParams.get("q");
  const lat    = searchParams.get("lat");
  const lon    = searchParams.get("lon");
  const coords = searchParams.get("coords"); // "lat,lon|lat,lon|..."
  const cities = searchParams.get("cities"); // "Melbourne,Sydney"

  if (!q || q.trim().length < 2) {
    return Response.json({ suggestions: [] });
  }

  const stationCoords = coords
    ? coords.split("|").map(pair => {
        const [slat, slon] = pair.split(",").map(Number);
        return isNaN(slat) || isNaN(slon) ? null : { lat: slat, lon: slon };
      }).filter(Boolean)
    : [];

  const stationCities = cities
    ? cities.split(",").map(c => c.trim()).filter(Boolean)
    : [];

  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const minDistToStation = (sLat, sLon) => {
    if (stationCoords.length === 0) return 0;
    return Math.min(...stationCoords.map(sc => haversine(sLat, sLon, sc.lat, sc.lon)));
  };

  const fetchQuery = async (query, userLat, userLon) => {
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=3&countrycodes=au&addressdetails=1`;
    if (userLat && userLon) {
      const delta = 2;
      url += `&viewbox=${userLon-delta},${userLat+delta},${userLon+delta},${userLat-delta}&bounded=0`;
    }
    const res = await fetch(url, { headers: { "User-Agent": "LuggageTerminal/1.0" } });
    return res.json();
  };

  const parseItem = (item) => {
    const addr = item.address || {};
    const parts = [
      addr.road || addr.pedestrian || addr.footway,
      addr.suburb || addr.neighbourhood || addr.quarter,
      addr.city || addr.town || addr.village || addr.county,
      addr.state,
    ].filter(Boolean);
    const label = parts.join(", ") || item.display_name.split(",").slice(0, 3).join(",").trim();
    const sLat = parseFloat(item.lat);
    const sLon = parseFloat(item.lon);
    return { label, lat: sLat, lon: sLon, dist: minDistToStation(sLat, sLon) };
  };

  try {
    const userLat = lat ? parseFloat(lat) : null;
    const userLon = lon ? parseFloat(lon) : null;

    let allItems = [];

    if (stationCities.length > 0) {
      // Fire one query per city in parallel — guarantees results from EACH city
      const results = await Promise.all(
        stationCities.map(city => fetchQuery(`${q}, ${city}`, userLat, userLon))
      );
      for (const cityResults of results) {
        allItems.push(...cityResults.map(parseItem));
      }
    } else {
      // No city data — plain query, sort by proximity to stations
      const results = await fetchQuery(q, userLat, userLon);
      allItems = results.map(parseItem);
    }

    // Sort by distance to nearest station — closest results first
    allItems.sort((a, b) => a.dist - b.dist);

    // Filter to within 100km of any station
    const nearby = stationCoords.length > 0
      ? allItems.filter(s => s.dist <= 100)
      : allItems;

    const toUse = nearby.length > 0 ? nearby : allItems;

    // Deduplicate by label, return top 5
    const seen = new Set();
    const unique = toUse
      .filter(s => {
        if (seen.has(s.label)) return false;
        seen.add(s.label);
        return true;
      })
      .slice(0, 5)
      .map(({ label, lat, lon }) => ({ label, lat, lon }));

    return Response.json({ suggestions: unique });
  } catch {
    return Response.json({ suggestions: [] }, { status: 500 });
  }
}