// data-utils.js
// Normalization helpers for Notion API responses.

// ─── countBy ──────────────────────────────────────────────────────────────────
// Aggregates items using a callback that returns an iterable of keys.
export function countBy(items, fn) {
  const counts = {};
  for (const item of items) {
    for (const key of fn(item)) {
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

// ─── getProp ──────────────────────────────────────────────────────────────────
export function getProp(props, name, type) {
  const prop = props?.[name];
  if (!prop) return type === "multi_select" ? [] : null;

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
    default:
      return null;
  }
}

// ─── normalizePerson ──────────────────────────────────────────────────────────
export function normalizePerson(page) {
  const p = page.properties || {};
  return {
    id:                   page.id,
    name:                 getProp(p, "Name",                  "title"),
    category:             getProp(p, "Category",              "multi_select"),
    relationshipStrength: getProp(p, "Relationship Strength", "select"),
    layer:                getProp(p, "Layer",                 "select"),
    clientStatus:         getProp(p, "Client Status",         "select"),
    clientProbability:    getProp(p, "Client Probability",    "number"),
    cityCountry:          getProp(p, "City / Country",        "select"),
    phone:                getProp(p, "Phone",                 "phone_number"),
    email:                getProp(p, "Email",                 "email"),
    industry:             getProp(p, "Jobs / Industry",       "multi_select"),
    connectedFrom:        getProp(p, "Connected From",        "date"),
    connectedTo:          getProp(p, "Connected To",          "date"),
    metVia:               getProp(p, "Met Via",               "select"),
    notes:                getProp(p, "Notes",                 "rich_text"),
    socialMedia:          getProp(p, "Social Media",          "url"),
    referredBy:           getProp(p, "Referred By",           "rich_text"),
    createdTime:          page.created_time || null,
  };
}

// ─── normalizeEdge ────────────────────────────────────────────────────────────
export function normalizeEdge(page) {
  const p = page.properties || {};
  return {
    id:     page.id,
    source: getProp(p, "From", "title"),
    target: getProp(p, "To",   "rich_text"),
    type:   getProp(p, "Type", "select"),
  };
}

// ─── dominantCategory ────────────────────────────────────────────────────────
export function dominantCategory(people) {
  const counts = countBy(people, p => p.category || []);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}
