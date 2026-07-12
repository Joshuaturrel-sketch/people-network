export function countBy(items, fn) {
  return items.reduce((acc, item) => {
    for (const key of fn(item)) {
      if (!key) continue;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {});
}

function getProp(props, name, type) {
  const p = props?.[name];
  if (!p) return type === "multi_select" ? [] : null;
  if (type === "title") return p.title?.map(x => x.plain_text).join("") || "";
  if (type === "rich_text") return p.rich_text?.map(x => x.plain_text).join("") || "";
  if (type === "select") return p.select?.name || null;
  if (type === "multi_select") return p.multi_select?.map(x => x.name).filter(Boolean) || [];
  if (type === "number") return typeof p.number === "number" ? p.number : null;
  if (type === "email") return p.email || null;
  if (type === "phone_number") return p.phone_number || null;
  if (type === "relation") return p.relation?.map(x => x.id).filter(Boolean) || [];
  if (type === "url") return p.url || null;
  if (type === "created_time") return p.created_time || null;
  return null;
}

export function normalizePerson(page) {
  const props = page.properties || {};
  return {
    id: page.id,
    name: getProp(props, "Name", "title") || "Untitled",
    category: getProp(props, "Category", "multi_select"),
    relationshipStrength: getProp(props, "Relationship Strength", "number") || 0,
    layer: getProp(props, "Layer", "select") || "",
    clientStatus: getProp(props, "Client Status", "select") || "",
    clientProbability: (() => {
      const raw = getProp(props, "Client Probability", "number");
      return raw == null ? null : raw > 1 ? raw / 100 : raw;
    })(),
    cityCountry: getProp(props, "City/Country", "rich_text") || "",
    phone: getProp(props, "Phone", "phone_number") || "",
    email: getProp(props, "Email", "email") || "",
    industry: getProp(props, "Jobs / Industry", "multi_select"),
    connectedFrom: getProp(props, "Connected From", "relation"),
    connectedTo: getProp(props, "Connected To", "relation"),
    metVia: getProp(props, "Met Via", "multi_select"),
    notes: getProp(props, "Notes", "rich_text") || "",
    socialMedia: getProp(props, "Social Media", "url") || getProp(props, "Social Media", "rich_text") || "",
    referredBy: getProp(props, "Referred By", "relation"),
    createdTime: page.created_time || getProp(props, "Created", "created_time")
  };
}

export function normalizeEdge(page) {
  const props = page.properties || {};
  return {
    id: page.id,
    label: getProp(props, "Edge Label", "title") || "Edge",
    source: getProp(props, "Person A", "relation")[0] || null,
    target: getProp(props, "Person B", "relation")[0] || null,
    strength: getProp(props, "Strength", "number") || 1,
    notes: getProp(props, "Notes", "rich_text") || ""
  };
}

export function buildMergedEdges(people, edges) {
  const map = new Map(people.map(p => [p.id, p]));
  return edges
    .filter(e => e.source && e.target && map.has(e.source) && map.has(e.target))
    .map(e => ({ ...e, sourcePerson: map.get(e.source), targetPerson: map.get(e.target) }));
}

export function geocode(cityCountry) {
  if (!cityCountry) return null;

  const city = cityCountry.trim().toLowerCase().split(",")[0].trim();

  const lookup = {
    lyon: [45.7640, 4.8357],
    marseille: [43.2965, 5.3698],
    paris: [48.8566, 2.3522],
    london: [51.50853, -0.12574],
    edinburgh: [55.953251, -3.188267],
    dundee: [56.4620, -2.9707],
    cannes: [43.5513, 7.0128],
    italy: [41.8719, 12.5674],
    lithuania: [55.169438, 23.881275],
    estonia: [59.0, 26.0],
    denmark: [56.26392, 9.501785],
    danemark: [56.26392, 9.501785],
    us: [44.9670, -103.7670],
    uk: [54.5, -3.0]
  };

  return lookup[city] || null;
}

export function dominantCategory(categories) {
  const counts = {};
  categories.flat().forEach(cat => {
    if (cat) counts[cat] = (counts[cat] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Other";
}
