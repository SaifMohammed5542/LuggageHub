"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Map, { Marker, Source, Layer, NavigationControl } from "react-map-gl/mapbox";
import styles from "./BookingDrawer.module.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
// Under 800 m → show walking route. 800 m or more → show walking route + transit button
const WALK_THRESHOLD_KM = 0.8;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCoords(station) {
  const c = station.coordinates?.coordinates || station.coordinates;
  if (!c) return null;
  if (Array.isArray(c) && c.length >= 2)
    return { lat: Number(c[1]), lon: Number(c[0]) };
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function StationMapMapbox({
  stations,
  allStations,
  selected,
  onSelect,
  onBook,
  userCoords,
  mapSearchResult,
  onClearMapSearch,
}) {
  const mapRef = useRef(null);

  const [viewState, setViewState] = useState({
    longitude: 144.9631,
    latitude: -37.8136,
    zoom: 13.5,
  });

  const [routeGeoJSON, setRouteGeoJSON]   = useState(null);
  const [routeInfo,    setRouteInfo]      = useState(null);
  const [routeLoading, setRouteLoading]   = useState(false);
  const [toast,        setToast]          = useState(null);

  // ── Inject mapbox-gl CSS once (avoids Next.js global CSS import restrictions) ─
  useEffect(() => {
    const id = "mapbox-gl-css";
    if (document.getElementById(id)) return;
    const link   = document.createElement("link");
    link.id      = id;
    link.rel     = "stylesheet";
    link.href    = "https://api.mapbox.com/mapbox-gl-js/v3.10.0/mapbox-gl.css";
    document.head.appendChild(link);
  }, []);

  // Derive the "origin" point: user GPS first, else search result
  const origin = userCoords
    ? {
        lat: userCoords.latitude  ?? userCoords.lat,
        lon: userCoords.longitude ?? userCoords.lon,
      }
    : mapSearchResult
    ? { lat: mapSearchResult.lat, lon: mapSearchResult.lon }
    : null;

  // ── Fit / center on first load ─────────────────────────────────────────────
  const handleMapLoad = useCallback(() => {
    if (!mapRef.current) return;

    // Case 1: user location known AND close to stations → zoom to ~5 km around them
    if (userCoords) {
      const lat  = userCoords.latitude  ?? userCoords.lat;
      const lon  = userCoords.longitude ?? userCoords.lon;
      const pool = allStations?.length ? allStations : stations || [];
      const nearestDist = pool.reduce((best, s) => {
        const c = getCoords(s);
        return c ? Math.min(best, haversine(lat, lon, c.lat, c.lon)) : best;
      }, Infinity);
      if (nearestDist <= 50) {
        mapRef.current.flyTo({ center: [lon, lat], zoom: 13, duration: 0 });
        return;
      }
      // else: user is far — fall through to dense-cluster view below
    }

    // Case 2: no user location → fit to the densest cluster of stations
    // (outliers like a Sydney test station are excluded)
    const pool = allStations?.length ? allStations : stations || [];
    const pts  = pool.map(getCoords).filter(Boolean);
    if (!pts.length) return;
    if (pts.length === 1) {
      mapRef.current.flyTo({ center: [pts[0].lon, pts[0].lat], zoom: 14, duration: 0 });
      return;
    }

    // Find centroid, then discard points beyond 3× median distance from it
    const cLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const cLon = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
    const sorted = [...pts].sort(
      (a, b) => haversine(cLat, cLon, a.lat, a.lon) - haversine(cLat, cLon, b.lat, b.lon)
    );
    const medDist = haversine(
      cLat, cLon,
      sorted[Math.floor(sorted.length / 2)].lat,
      sorted[Math.floor(sorted.length / 2)].lon
    );
    const threshold = Math.max(medDist * 3, 2); // at least 2 km radius
    const keep = sorted.filter(
      (p) => haversine(cLat, cLon, p.lat, p.lon) <= threshold
    );

    const lngs = keep.map((p) => p.lon);
    const lats  = keep.map((p) => p.lat);
    mapRef.current.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 80, maxZoom: 15, duration: 0 }
    );
  }, [userCoords]); // eslint-disable-line

  // ── Fetch walking route when station selected + origin known ───────────────
  useEffect(() => {
    if (!selected || !origin) {
      setRouteGeoJSON(null);
      setRouteInfo(null);
      return;
    }
    const dest = getCoords(selected);
    if (!dest) return;

    const distKm   = haversine(origin.lat, origin.lon, dest.lat, dest.lon);
    const isTransit = distKm >= WALK_THRESHOLD_KM;

    // Don't attempt routing across cities / countries — Mapbox walking won't work
    if (distKm > 50) return;

    setRouteLoading(true);
    setRouteGeoJSON(null);
    setRouteInfo(null);

    fetch(
      `https://api.mapbox.com/directions/v5/mapbox/walking/` +
        `${origin.lon},${origin.lat};${dest.lon},${dest.lat}` +
        `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!data.routes?.[0]) return;
        const route      = data.routes[0];
        const durationMin = Math.round(route.duration / 60);
        const distM       = Math.round(route.distance);
        setRouteGeoJSON(route.geometry);
        setRouteInfo({
          durationMin,
          distM,
          isTransit,
          transitUrl: isTransit
            ? `https://www.google.com/maps/dir/?api=1` +
              `&origin=${origin.lat},${origin.lon}` +
              `&destination=${dest.lat},${dest.lon}` +
              `&travelmode=transit`
            : null,
        });
      })
      .catch(() => {})
      .finally(() => setRouteLoading(false));
  }, [selected?._id, origin?.lat, origin?.lon]); // eslint-disable-line

  // ── Fly to search result, check for nearby stations ───────────────────────
  useEffect(() => {
    if (!mapSearchResult) return;
    mapRef.current?.flyTo({
      center:   [mapSearchResult.lon, mapSearchResult.lat],
      zoom:     13,
      duration: 1200,
    });

    const pool   = allStations?.length ? allStations : stations || [];
    const nearby = pool.filter((s) => {
      const c = getCoords(s);
      return c && haversine(mapSearchResult.lat, mapSearchResult.lon, c.lat, c.lon) <= 5;
    });

    if (!nearby.length) {
      let best = null, bestD = Infinity;
      for (const s of pool) {
        const c = getCoords(s);
        if (!c) continue;
        const d = haversine(mapSearchResult.lat, mapSearchResult.lon, c.lat, c.lon);
        if (d < bestD) { bestD = d; best = s; }
      }
      setToast({
        label:   mapSearchResult.label,
        nearest: best ? { station: best, dist: bestD } : null,
      });
    } else {
      setToast(null);
    }
  }, [mapSearchResult]); // eslint-disable-line

  // ── Fly to user GPS location (or show "no stations near you" if far away) ──
  useEffect(() => {
    if (!userCoords) return;
    const lat  = userCoords.latitude  ?? userCoords.lat;
    const lon  = userCoords.longitude ?? userCoords.lon;
    const pool = allStations?.length ? allStations : stations || [];

    // Find nearest station and its distance
    let nearest = null, nearestDist = Infinity;
    for (const s of pool) {
      const c = getCoords(s);
      if (!c) continue;
      const d = haversine(lat, lon, c.lat, c.lon);
      if (d < nearestDist) { nearestDist = d; nearest = s; }
    }

    if (nearest && nearestDist > 50) {
      // User is far away (another city / country) — show friendly notice,
      // keep map on Melbourne CBD, don't fly to user
      setToast({ isLocationToast: true, nearest: { station: nearest, dist: nearestDist } });
      return;
    }

    // User is nearby — fly to them
    mapRef.current?.flyTo({ center: [lon, lat], zoom: 13, duration: 1200 });
  }, [userCoords]); // eslint-disable-line

  // ── Ease to selected station ───────────────────────────────────────────────
  useEffect(() => {
    if (!selected) return;
    const c = getCoords(selected);
    if (c) mapRef.current?.easeTo({ center: [c.lon, c.lat], duration: 600 });
  }, [selected]); // eslint-disable-line

  // ── Clear route when station deselected ───────────────────────────────────
  useEffect(() => {
    if (!selected) {
      setRouteGeoJSON(null);
      setRouteInfo(null);
    }
  }, [selected]);

  const handleShowNearest = () => {
    if (!toast?.nearest) return;
    const c = getCoords(toast.nearest.station);
    if (c) mapRef.current?.flyTo({ center: [c.lon, c.lat], zoom: 15, duration: 1000 });
    onSelect(toast.nearest.station);
    setToast(null);
    onClearMapSearch?.();
  };

  const pinPool = allStations?.length ? allStations : stations || [];

  // ─── Format distance string ───────────────────────────────────────────────
  const fmtDist = (m) =>
    m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;

  return (
    <div className={styles.stationMapWrap}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        style={{ width: "100%", flex: 1, minHeight: 360 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
        onLoad={handleMapLoad}
      >
        {/* ── Zoom controls ── */}
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* ── Walking route line (white casing + blue fill) ── */}
        {routeGeoJSON && (
          <Source
            id="route"
            type="geojson"
            data={{ type: "Feature", geometry: routeGeoJSON }}
          >
            <Layer
              id="route-casing"
              type="line"
              paint={{ "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.7 }}
              layout={{ "line-join": "round", "line-cap": "round" }}
            />
            <Layer
              id="route-fill"
              type="line"
              paint={{ "line-color": "#0284c7", "line-width": 4, "line-opacity": 0.95 }}
              layout={{ "line-join": "round", "line-cap": "round" }}
            />
          </Source>
        )}

        {/* ── Origin dot (user GPS or search result) ── */}
        {origin && (
          <Marker longitude={origin.lon} latitude={origin.lat} anchor="center">
            <div className={styles.userDot}>
              <div className={styles.userDotPulse} />
              <div className={styles.userDotInner} />
            </div>
          </Marker>
        )}

        {/* ── Station pins ── */}
        {pinPool.map((s) => {
          const c      = getCoords(s);
          if (!c) return null;
          const isFull = s.capacity > 0 && s.currentCapacity >= s.capacity;
          const isSel  = selected?._id === s._id;
          return (
            <Marker
              key={s._id}
              longitude={c.lon}
              latitude={c.lat}
              anchor="bottom"
              onClick={() => { if (!isFull) onSelect(s); }}
            >
              <div
                className={[
                  styles.stationPin,
                  isSel  ? styles.stationPinSel  : "",
                  isFull ? styles.stationPinFull : "",
                ].join(" ")}
              >
                <span className={styles.stationPinIcon}>
                  {isFull ? "🔒" : "🧳"}
                </span>
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* ── No-nearby stations toast ── */}
      {toast && (
        <div className={styles.noNearbyToast}>
          <div className={styles.noNearbyMsg}>
            <span>📍</span>
            <div>
              <div className={styles.noNearbyTitle}>
                {toast.isLocationToast
                  ? "No stations near your location"
                  : <>No stations near &ldquo;{toast.label}&rdquo;</>}
              </div>
              {toast.nearest && (
                <div className={styles.noNearbySub}>
                  Nearest: {toast.nearest.station.name} ·{" "}
                  {toast.nearest.dist >= 1
                    ? `${Math.round(toast.nearest.dist).toLocaleString()} km away`
                    : `${Math.round(toast.nearest.dist * 1000)} m away`}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {toast.nearest && (
              <button
                type="button"
                onClick={handleShowNearest}
                className={styles.noNearbyBtn}
              >
                Show →
              </button>
            )}
            <button
              type="button"
              onClick={() => { setToast(null); onClearMapSearch?.(); }}
              className={styles.noNearbyDismiss}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Selected station popup with route info ── */}
      {selected && (
        <div className={styles.stationMapPopup}>
          <div className={styles.stationMapPopupInner}>
            <div className={styles.stationMapPopupIcon}>🏪</div>
            <div className={styles.stationMapPopupInfo}>
              <div className={styles.stationMapPopupName}>{selected.name}</div>
              <div className={styles.stationMapPopupSub}>
                {selected.location}
                {routeLoading && <span> · ⏳</span>}
                {!routeLoading && routeInfo && !routeInfo.isTransit && (
                  <span> · 🚶 {routeInfo.durationMin} min · {fmtDist(routeInfo.distM)}</span>
                )}
                {!routeLoading && routeInfo && routeInfo.isTransit && (
                  <>
                    <span> · {fmtDist(routeInfo.distM)} · 🚶 {routeInfo.durationMin} min · </span>
                    <a
                      href={routeInfo.transitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.transitLink}
                      onClick={(e) => e.stopPropagation()}
                    >
                      🚌 Transit →
                    </a>
                  </>
                )}
                {!routeLoading && !routeInfo && selected.distance && (
                  <span> · {selected.distance.toFixed(1)} km</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onBook(selected)}
              className={styles.stationMapPopupBtn}
            >
              Book →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
