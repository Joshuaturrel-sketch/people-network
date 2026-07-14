let map = null;
let markersLayer = null;
let geocodeCache = new Map();

const FALLBACK_COORDS = {
  "Dundee": [56.4620, -2.9707],
  "Madrid": [40.4168, -3.7038],
  "Madrid, Spain": [40.4168, -3.7038],
  "Paracuellos de Jarama": [40.5036, -3.5272],
  "Paracuellos de Jarama, Spain": [40.5036, -3.5272],
  "London": [51.5072, -0.1276],
  "London, UK": [51.5072, -0.1276],
  "Barcelona": [41.3874, 2.1686],
  "Barcelona, Spain": [41.3874, 2.1686],
  "Paris": [48.8566, 2.3522],
  "Paris, France": [48.8566, 2.3522],
  "New York": [40.7128, -74.0060],
  "New York, USA": [40.7128, -74.0060],
  "Berlin": [52.5200, 13.4050],
  "Berlin, Germany": [52.5200, 13.4050]
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePlace(place) {
  return String(place || "").trim();
}

function loadCache() {
  try {
    const raw = localStorage.getItem("people-network-geocode-cache");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    geocodeCache = new Map(Object.entries(parsed));
  } catch (err) {
    console.warn("[map] failed to load cache", err);
  }
}

function saveCache() {
  try {
    const obj = Object.fromEntries(geocodeCache.entries());
    localStorage.setItem("people-network-geocode-cache", JSON.stringify(obj));
  } catch (err) {
    console.warn("[map] failed to save cache", err);
  }
}

function getCachedCoords(place) {
  const normalized = normalizePlace(place);
  const cached = geocodeCache.get(normalized);
  if (!cached) return null;
  return Array.isArray(cached) ? cached : null;
}

function setCachedCoords(place, coords) {
  const normalized = normalizePlace(place);
  geocodeCache.set(normalized, coords);
  saveCache();
}

function resolveFallback(place) {
  const normalized = normalizePlace(place);
  const firstPart = normalized.split(",")[0]?.trim();
  return FALLBACK_COORDS[normalized] || FALLBACK_COORDS[firstPart] || null;
}

async function geocodePlace(place) {
  const normalized = normalizePlace(place);
  if (!normalized) return null;

  const cached = getCachedCoords(normalized);
  if (cached) return cached;

  const fallback = resolveFallback(normalized);
  if (fallback) {
    setCachedCoords(normalized, fallback);
    return fallback;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", normalized);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "Accept-Language": "en"
      }
    });

    if (!response.ok) {
      console.warn(`[map] geocoding failed for "${normalized}" with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || !data.length) {
      console.warn(`[map] no geocoding result for "${normalized}"`);
      return null;
    }

    const lat = Number(data[0].lat);
    const lon = Number(data[0].lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const coords = [lat, lon];
    setCachedCoords(normalized, coords);
    return coords;
  } catch (err) {
    console.warn(`[map] geocoding error for "${normalized}"`, err);
    return null;
  }
}

function groupPeopleByPlace(people) {
  const grouped = new Map();

  for (const person of people) {
    const place = normalizePlace(person.cityCountry);
    if (!place) continue;

    if (!grouped.has(place)) grouped.set(place, []);
    grouped.get(place).push(person);
  }

  return grouped;
}

function ensureMap(containerId = "world-map") {
  if (map) return;

  map = L.map(containerId, {
    zoomControl: true
  }).setView([20, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function clearMarkers() {
  if (markersLayer) markersLayer.clearLayers();
}

function addMarker(place, peopleAtPlace, coords) {
  const marker = L.circleMarker(coords, {
    radius: Math.max(6, Math.min(22, 5 + peopleAtPlace.length * 2.3)),
    fillColor: "#4f98a3",
    color: "#171614",
    weight: 2,
    fillOpacity: 0.85
  });

  marker.bindPopup(`
    <div style="min-width:220px">
      <strong>${escapeHtml(place)}</strong><br>
      Contacts: ${peopleAtPlace.length}
      <ul style="margin:8px 0 0 16px;padding:0;">
        ${peopleAtPlace.map(p => `<li>${escapeHtml(p.name || "Unknown")}</li>`).join("")}
      </ul>
    </div>
  `);

  marker.addTo(markersLayer);
}

function updateMapStatus(message) {
  const el = document.getElementById("map-status");
  if (el) el.textContent = message;
}

export async function renderMap(people, { forceRefresh = false } = {}) {
  loadCache();
  ensureMap("world-map");
  clearMarkers();

  const grouped = groupPeopleByPlace(people);
  const entries = Array.from(grouped.entries());

  if (!entries.length) {
    updateMapStatus("No city/country values found.");
    return;
  }

  if (forceRefresh) {
    for (const [place] of entries) {
      geocodeCache.delete(place);
    }
    saveCache();
  }

  updateMapStatus(`Resolving ${entries.length} location${entries.length === 1 ? "" : "s"}...`);

  const bounds = [];

  for (let i = 0; i < entries.length; i += 1) {
    const [place, members] = entries[i];

    updateMapStatus(`Resolving ${i + 1}/${entries.length}: ${place}`);

    const coords = await geocodePlace(place);
    if (!coords) continue;

    addMarker(place, members, coords);
    bounds.push(coords);

    if (i < entries.length - 1) {
      await sleep(1100);
    }
  }

  if (bounds.length === 1) {
    map.setView(bounds[0], 5);
  } else if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [30, 30] });
  } else {
    map.setView([20, 0], 2);
  }

  updateMapStatus(`Mapped ${bounds.length} of ${entries.length} locations.`);
  setTimeout(() => map.invalidateSize(), 100);
}

export function clearMapGeocodeCache() {
  geocodeCache.clear();
  saveCache();
}
