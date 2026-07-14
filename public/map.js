let map = null;
let markersLayer = null;

const FALLBACK_COORDS = {
  "Dundee": [56.4620, -2.9707],
  "Madrid": [40.4168, -3.7038],
  "London": [51.5072, -0.1276],
  "Barcelona": [41.3874, 2.1686],
  "Paris": [48.8566, 2.3522],
  "New York": [40.7128, -74.0060],
  "Berlin": [52.5200, 13.4050]
};

export function renderMap(people) {
  const containerId = "world-map";
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!map) {
    map = L.map(containerId, {
      zoomControl: true
    }).setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
  }

  markersLayer.clearLayers();

  const grouped = new Map();

  for (const person of people) {
    const key = (person.cityCountry || "").trim();
    if (!key) continue;

    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(person);
  }

  for (const [place, members] of grouped.entries()) {
    const coords = resolveCoordinates(place);
    if (!coords) continue;

    const marker = L.circleMarker(coords, {
      radius: Math.max(6, Math.min(20, members.length * 2.2)),
      fillColor: "#4f98a3",
      color: "#171614",
      weight: 2,
      fillOpacity: 0.85
    });

    marker.bindPopup(`
      <div style="min-width:220px">
        <strong>${escapeHtml(place)}</strong><br>
        Contacts: ${members.length}
        <ul style="margin:8px 0 0 16px;padding:0;">
          ${members.map(p => `<li>${escapeHtml(p.name || "Unknown")}</li>`).join("")}
        </ul>
      </div>
    `);

    marker.addTo(markersLayer);
  }

  setTimeout(() => map.invalidateSize(), 100);
}

function resolveCoordinates(place) {
  const normalized = place.split(",")[0].trim();
  return FALLBACK_COORDS[place] || FALLBACK_COORDS[normalized] || null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
