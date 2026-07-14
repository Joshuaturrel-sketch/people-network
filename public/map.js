// map.js
// Renders a Leaflet map with contact pins.

import { CONFIG } from "./config.js";

let mapInstance = null;

const CITY_COORDS = {
  "Madrid, Spain":       [40.4168, -3.7038],
  "Barcelona, Spain":    [41.3851, 2.1734],
  "London, UK":          [51.5074, -0.1278],
  "Paris, France":       [48.8566, 2.3522],
  "New York, USA":       [40.7128, -74.0060],
  "Berlin, Germany":     [52.5200, 13.4050],
  "Amsterdam, Netherlands": [52.3676, 4.9041],
  "Lisbon, Portugal":    [38.7169, -9.1399],
  "Mexico City, Mexico": [19.4326, -99.1332],
  "Buenos Aires, Argentina": [-34.6037, -58.3816],
};

export function renderMap(people, containerId = "map-container") {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (mapInstance) { mapInstance.remove(); mapInstance = null; }

  mapInstance = L.map(containerId).setView([20, 0], 2);

  L.tileLayer(CONFIG.MAP_TILE, { attribution: CONFIG.MAP_ATTRIBUTION }).addTo(mapInstance);

  const byCityCountry = {};
  for (const p of people) {
    if (!p.cityCountry) continue;
    if (!byCityCountry[p.cityCountry]) byCityCountry[p.cityCountry] = [];
    byCityCountry[p.cityCountry].push(p);
  }

  for (const [city, group] of Object.entries(byCityCountry)) {
    const coords = CITY_COORDS[city];
    if (!coords) continue;

    const marker = L.circleMarker(coords, {
      radius:      Math.max(6, Math.min(20, group.length * 3)),
      fillColor:   "#01696f",
      color:       "#fff",
      weight:      2,
      opacity:     1,
      fillOpacity: 0.8,
    }).addTo(mapInstance);

    const names = group.map(p => `<li>${p.name || "Unknown"}</li>`).join("");
    marker.bindPopup(`<strong>${city}</strong> (${group.length})<ul style="padding-left:1rem;margin:.5rem 0">${names}</ul>`);
  }
}
