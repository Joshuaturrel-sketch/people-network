// map.js

let _map = null;

const CITY_COORDS = {
  "Dundee": [56.4620, -2.9707],
  "Lyon": [45.7640, 4.8357],
  "Marseille": [43.2965, 5.3698],
  "London": [51.5074, -0.1278],
  "Paris": [48.8566, 2.3522],
  "Madrid": [40.4168, -3.7038],
  "Barcelona": [41.3851, 2.1734],
  "Berlin": [52.5200, 13.4050],
  "Amsterdam": [52.3676, 4.9041],
  "Brussels": [50.8503, 4.3517],
  "Zurich": [47.3769, 8.5417],
  "Geneva": [46.2044, 6.1432],
  "Rome": [41.9028, 12.4964],
  "Milan": [45.4642, 9.1900],
  "Vienna": [48.2082, 16.3738],
  "Lisbon": [38.7169, -9.1395],
  "Dublin": [53.3498, -6.2603],
  "Stockholm": [59.3293, 18.0686],
  "Oslo": [59.9139, 10.7522],
  "Copenhagen": [55.6761, 12.5683],
  "Helsinki": [60.1699, 24.9384],
  "Warsaw": [52.2297, 21.0122],
  "Prague": [50.0755, 14.4378],
  "Budapest": [47.4979, 19.0402],
  "Bucharest": [44.4268, 26.1025],
  "Athens": [37.9838, 23.7275],
  "Istanbul": [41.0082, 28.9784],
  "Dubai": [25.2048, 55.2708],
  "Singapore": [1.3521, 103.8198],
  "Tokyo": [35.6762, 139.6503],
  "Hong Kong": [22.3193, 114.1694],
  "Shanghai": [31.2304, 121.4737],
  "Sydney": [-33.8688, 151.2093],
  "Melbourne": [-37.8136, 144.9631],
  "New York": [40.7128, -74.0060],
  "Los Angeles": [34.0522, -118.2437],
  "Chicago": [41.8781, -87.6298],
  "Toronto": [43.6532, -79.3832],
  "Montreal": [45.5017, -73.5673],
  "São Paulo": [-23.5505, -46.6333],
  "Buenos Aires": [-34.6037, -58.3816],
  "Mexico City": [19.4326, -99.1332],
  "Johannesburg": [-26.2041, 28.0473],
  "Cairo": [30.0444, 31.2357],
  "Lagos": [6.5244, 3.3792],
  "Nairobi": [-1.2921, 36.8219],
  "Mumbai": [19.0760, 72.8777],
  "Delhi": [28.6139, 77.2090],
  "Bangalore": [12.9716, 77.5946],
  "Seoul": [37.5665, 126.9780],
  "Taipei": [25.0330, 121.5654],
  "Bangkok": [13.7563, 100.5018],
  "Jakarta": [-6.2088, 106.8456],
  "Kuala Lumpur": [3.1390, 101.6869],
  "Manila": [14.5995, 120.9842],
  "Tel Aviv": [32.0853, 34.7818],
  "Riyadh": [24.7136, 46.6753]
};

const CATEGORY_COLOR = {
  Personal: "#01696f",
  Acquaintance: "#006494",
  Family: "#a12c7b",
  Professional: "#da7101",
  Trading: "#d19900",
  Friend: "#437a22",
};

const DEFAULT_COLOR = "#4f6070";

function getCategoryColor(person) {
  const category = Array.isArray(person.category) ? person.category[0] : person.category;
  return CATEGORY_COLOR[category] || DEFAULT_COLOR;
}

function circleSize(count) {
  return Math.max(4, Math.min(16, 4 + count * 2));
}

function resolveCityKey(cityCountry) {
  if (!cityCountry) return null;

  const keys = Object.keys(CITY_COORDS);
  const exact = keys.find(k => k.toLowerCase() === cityCountry.toLowerCase());
  if (exact) return exact;

  const partial = keys.find(k =>
    cityCountry.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(cityCountry.toLowerCase())
  );
  return partial || null;
}

export function renderMap(people) {
  const el = document.getElementById("map");
  if (!el) return;

  if (_map) {
    _map.remove();
    _map = null;
  }

  _map = L.map("map", {
    center: [28, 8],
    zoom: 2,
    minZoom: 2,
    maxZoom: 7,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 20,
    attribution: '&copy; <a href="https://carto.com/" target="_blank" rel="noopener noreferrer">CARTO</a>',
  }).addTo(_map);

  const cityGroups = {};

  for (const person of people) {
    const cityKey = resolveCityKey(person.cityCountry);
    if (!cityKey) continue;
    if (!cityGroups[cityKey]) cityGroups[cityKey] = [];
    cityGroups[cityKey].push(person);
  }

  for (const [cityName, persons] of Object.entries(cityGroups)) {
    const [lat, lng] = CITY_COORDS[cityName];
    const radius = circleSize(persons.length);

    const catCounts = {};
    for (const person of persons) {
      const category = Array.isArray(person.category) ? person.category[0] : person.category;
      if (category) catCounts[category] = (catCounts[category] || 0) + 1;
    }

    const dominantCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const color = CATEGORY_COLOR[dominantCategory] || DEFAULT_COLOR;

    const names = persons
      .map(p => `<div><span style="color:${getCategoryColor(p)}">●</span> ${p.name || "Unknown"}</div>`)
      .join("");

    const popupHtml = `
      <div style="font-family:Inter,sans-serif;font-size:12px;line-height:1.5;min-width:140px">
        <strong style="display:block;margin-bottom:4px">${cityName}</strong>
        <div style="color:#999;margin-bottom:6px">${persons.length} contact${persons.length !== 1 ? "s" : ""}</div>
        ${names}
      </div>
    `;

    L.circleMarker([lat, lng], {
      radius,
      fillColor: color,
      color: "#ffffff",
      weight: 0.8,
      opacity: 0.95,
      fillOpacity: 0.78,
    })
      .bindPopup(popupHtml, { maxWidth: 240 })
      .addTo(_map);

    if (["Dundee", "Lyon", "Marseille"].includes(cityName)) {
      L.tooltip({
        permanent: true,
        direction: "top",
        offset: [0, -radius - 4],
        className: "city-label",
      })
        .setContent(cityName)
        .setLatLng([lat, lng])
        .addTo(_map);
    }
  }
}
