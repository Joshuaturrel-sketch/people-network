// data-utils.js
// Normalized people network data helpers

// ─── countBy ─────────────────────────────────────────────────────────────────
// Aggregates items using a callback that returns an iterable of keys.
// Increments counts for every truthy key in that iterable.
export function countBy(items, fn) {
  const counts = {};
  for (const item of items) {
    const keys = fn(item);
    for (const key of keys) {
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

// ─── getProp ─────────────────────────────────────────────────────────────────
// Safely extracts a Notion property value by name and type.
export function getProp(props, name, type) {
  const prop = props?.[name];
  if (!prop) return null;

  switch (type) {
    case "title":
      return prop.title?.map(t => t.plain_text).join("") || null;
    case "rich_text":
      return prop.rich_text?.map(t => t.plain_text).join("") || null;
    case "select":
      return prop.select?.name || null;
    case "multi_select":
      return prop.multi_select?.map(s => s.name) || [];
    case "number":
      return prop.number ?? null;
    case "checkbox":
      return prop.checkbox ?? false;
    case "date":
      return prop.date?.start || null;
    case "email":
      return prop.email || null;
    case "phone_number":
      return prop.phone_number || null;
    case "url":
      return prop.url || null;
    case "people":
      return prop.people?.map(p => p.name || p.id) || [];
    default:
      return null;
  }
}

// ─── normalizePerson ─────────────────────────────────────────────────────────
// Maps a raw Notion page into a flat, typed person record.
export function normalizePerson(page) {
  const props = page.properties || {};
  return {
    id:                   page.id,
    name:                 getProp(props, "Name",                  "title"),
    category:             getProp(props, "Category",              "multi_select"),   // string[]
    relationshipStrength: getProp(props, "Relationship Strength", "select"),
    layer:                getProp(props, "Layer",                 "select"),
    clientStatus:         getProp(props, "Client Status",         "select"),
    clientProbability:    getProp(props, "Client Probability",    "number"),
    cityCountry:          getProp(props, "City / Country",        "select"),
    phone:                getProp(props, "Phone",                 "phone_number"),
    email:                getProp(props, "Email",                 "email"),
    industry:             getProp(props, "Jobs / Industry",       "multi_select"),   // string[]
    connectedFrom:        getProp(props, "Connected From",        "date"),
    connectedTo:          getProp(props, "Connected To",          "date"),
    metVia:               getProp(props, "Met Via",               "select"),
    notes:                getProp(props, "Notes",                 "rich_text"),
    socialMedia:          getProp(props, "Social Media",          "url"),
    referredBy:           getProp(props, "Referred By",           "rich_text"),
    createdTime:          page.created_time || null,
  };
}

// ─── normalizeEdge ───────────────────────────────────────────────────────────
export function normalizeEdge(page) {
  const props = page.properties || {};
  return {
    id:     page.id,
    source: getProp(props, "From", "title"),
    target: getProp(props, "To",   "rich_text"),
    type:   getProp(props, "Type", "select"),
  };
}

// ─── buildMergedEdges ────────────────────────────────────────────────────────
// Merges explicit edges with implicit co-category edges.
export function buildMergedEdges(people, edges) {
  return edges; // extend as needed
}

// ─── geocode ─────────────────────────────────────────────────────────────────
// Placeholder — replace with real geocoding if needed.
export function geocode(cityCountry) {
  return null;
}

// ─── dominantCategory ────────────────────────────────────────────────────────
// Returns the most frequent category across all people.
export function dominantCategory(categories) {
  if (!categories?.length) return null;
  const counts = countBy(categories, c => [c]);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}
