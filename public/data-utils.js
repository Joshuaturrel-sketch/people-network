export function countBy(items, fn) {
  const counts = {};
  for (const item of items) {
    const keys = fn(item) || [];
    for (const key of keys) {
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

export function sumBy(items, fn) {
  return items.reduce((sum, item) => sum + (fn(item) || 0), 0);
}

export function getProp(props, name, type) {
  const prop = props?.[name];
  if (!prop) {
    if (type === "multi_select" || type === "relation" || type === "people") return [];
    return null;
  }

  switch (type) {
    case "title":
      return prop.title?.map(t => t.plain_text).join("") || null;

    case "rich_text":
      return prop.rich_text?.map(t => t.plain_text).join("") || null;

    case "select":
      return prop.select?.name || null;

    case "multi_select":
      return prop.multi_select?.map(s => s.name).filter(Boolean) || [];

    case "number":
      return prop.number ?? null;

    case "email":
      return prop.email || null;

    case "phone_number":
      return prop.phone_number || null;

    case "url":
      return prop.url || null;

    case "date":
      return prop.date?.start || null;

    case "relation":
      return prop.relation?.map(r => r.id).filter(Boolean) || [];

    case "people":
      return prop.people?.map(p => p.name || p.id).filter(Boolean) || [];

    default:
      return null;
  }
}

export function normalizePerson(page) {
  const props = page.properties || {};

  return {
    id: page.id,
    name: getProp(props, "Name", "title"),
    category: getProp(props, "Category", "multi_select"),
    relationshipStrength: getProp(props, "Relationship Strength", "number"),
    layer: getProp(props, "Layer", "select"),
    clientStatus: getProp(props, "Client Status", "select"),
    clientProbability: getProp(props, "Client Probability", "number"),
    cityCountry: getProp(props, "City/Country", "select") || getProp(props, "City / Country", "select"),
    phone: getProp(props, "Phone", "phone_number"),
    email: getProp(props, "Email", "email"),
    industry: getProp(props, "Jobs / Industry", "multi_select"),
    connectedFrom: getProp(props, "Connected From", "relation"),
    connectedTo: getProp(props, "Connected To", "relation"),
    metVia: getProp(props, "Met Via", "select"),
    notes: getProp(props, "Notes", "rich_text"),
    socialMedia: getProp(props, "Social Media", "url"),
    referredBy: getProp(props, "Referred By", "rich_text"),
    createdTime: page.created_time || null
  };
}

export function normalizeEdge(page) {
  const props = page.properties || {};

  return {
    id: page.id,
    label: getProp(props, "Edge Label", "title"),
    personA: getProp(props, "Person A", "relation"),
    personB: getProp(props, "Person B", "relation"),
    strength: getProp(props, "Strength", "number"),
    notes: getProp(props, "Notes", "rich_text")
  };
}

export function buildImplicitEdgesFromPeople(people) {
  const edges = [];

  for (const person of people) {
    const targets = [...new Set([...(person.connectedFrom || []), ...(person.connectedTo || [])])];
    for (const targetId of targets) {
      if (!targetId || targetId === person.id) continue;

      const ordered = [person.id, targetId].sort();
      const key = `${ordered[0]}__${ordered[1]}`;

      edges.push({
        id: `implicit:${key}`,
        source: ordered[0],
        target: ordered[1],
        strength: person.relationshipStrength || 1,
        label: "Related Contact",
        notes: ""
      });
    }
  }

  return dedupeEdges(edges);
}

export function buildEdgesFromDatabase(edgesDb) {
  const edges = [];

  for (const edge of edgesDb) {
    const a = edge.personA?.[0];
    const b = edge.personB?.[0];

    if (!a || !b || a === b) continue;

    const ordered = [a, b].sort();
    const key = `${ordered[0]}__${ordered[1]}__${edge.id}`;

    edges.push({
      id: edge.id || `edge:${key}`,
      source: ordered[0],
      target: ordered[1],
      strength: edge.strength ?? 1,
      label: edge.label || "Connection",
      notes: edge.notes || ""
    });
  }

  return edges;
}

export function dedupeEdges(edges) {
  const seen = new Map();

  for (const edge of edges) {
    const ordered = [edge.source, edge.target].sort();
    const key = `${ordered[0]}__${ordered[1]}`;

    if (!seen.has(key)) {
      seen.set(key, {
        ...edge,
        source: ordered[0],
        target: ordered[1]
      });
    } else {
      const existing = seen.get(key);
      existing.strength = Math.max(existing.strength || 1, edge.strength || 1);
      if (!existing.label && edge.label) existing.label = edge.label;
      if (!existing.notes && edge.notes) existing.notes = edge.notes;
    }
  }

  return Array.from(seen.values());
}

export function buildMergedEdges(people, edgesDb) {
  const explicitEdges = buildEdgesFromDatabase(edgesDb);
  const implicitEdges = buildImplicitEdgesFromPeople(people);
  return dedupeEdges([...explicitEdges, ...implicitEdges]);
}

export function bucketStrength(value) {
  if (value == null) return "Unknown";
  if (value <= 2) return "1–2";
  if (value <= 4) return "3–4";
  if (value <= 6) return "5–6";
  if (value <= 8) return "7–8";
  return "9–10";
}

export function bucketProbability(value) {
  if (value == null) return "Unknown";
  if (value <= 25) return "0–25%";
  if (value <= 50) return "26–50%";
  if (value <= 75) return "51–75%";
  return "76–100%";
}

export function monthKey(dateString) {
  if (!dateString) return null;
  return dateString.slice(0, 7);
}

export function topEntries(obj, limit = 10) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}
