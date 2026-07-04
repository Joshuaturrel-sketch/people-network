import { CITY_COORDS } from "./config.js";

export function normalizePerson(page) {
  const p = page.properties;

  return {
    id: page.id,
    name: p["Name"]?.title?.[0]?.plain_text ?? "Unnamed",
    category: p["Category"]?.multi_select?.map(o => o.name) ?? [],
    layer: p["Layer"]?.select?.name ?? null,
    relationshipStrength: p["Relationship Strength"]?.number ?? 0,
    clientStatus: p["Client Status"]?.select?.name ?? null,
    clientProbability: p["Client Probability"]?.number ?? null,
    cityCountry: p["City/Country"]?.rich_text?.[0]?.plain_text ?? "",
    industry: p["Jobs / Industry "]?.multi_select?.map(o => o.name) ?? [],
    socialMedia: p["Social Media"]?.url ?? null,
    referredBy: p["Referred By"]?.relation?.map(r => r.id) ?? [],
    connectedTo: p["Connected To"]?.relation?.map(r => r.id) ?? [],
    connectedFrom: p["Connected From"]?.relation?.map(r => r.id) ?? [],
    email: p["Email"]?.email ?? null,
    phone: p["Phone"]?.phone_number ?? null,
    metVia: p["Met Via"]?.rich_text?.[0]?.plain_text ?? "",
    notes: p["Notes"]?.rich_text?.[0]?.plain_text ?? "",
    createdTime: page.created_time
  };
}

export function normalizeEdge(page) {
  const p = page.properties;

  return {
    id: page.id,
    label: p["Edge Label"]?.title?.[0]?.plain_text ?? "",
    personA: p["Person A"]?.relation?.[0]?.id ?? null,
    personB: p["Person B"]?.relation?.[0]?.id ?? null,
    strength: p["Strength"]?.number ?? 1,
    notes: p["Notes"]?.rich_text?.[0]?.plain_text ?? ""
  };
}

export function geocode(cityCountryStr) {
  if (!cityCountryStr) return null;
  const key = cityCountryStr.trim().toLowerCase().split(",")[0].trim();
  return CITY_COORDS[key] ?? null;
}

export function buildMergedEdges(people, edges) {
  const seen = new Set();
  const out = [];

  function add(source, target, strength = 1, label = "") {
    if (!source || !target || source === target) return;
    const key = [source, target].sort().join("||");
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ source, target, strength, label });
  }

  for (const edge of edges) {
    add(edge.personA, edge.personB, edge.strength, edge.label);
  }

  for (const person of people) {
    for (const targetId of person.connectedTo) {
      add(person.id, targetId, 1, "");
    }
  }

  return out;
}

export function dominantCategory(categoryArrays) {
  const counts = {};
  categoryArrays.flat().forEach(c => {
    counts[c] = (counts[c] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function countBy(items, accessor) {
  const counts = {};
  for (const item of items) {
    const keys = accessor(item);
    for (const key of keys) {
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}
