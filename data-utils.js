// data-utils.js

export function countBy(items, fn) {
  const counts = {};

  for (const item of items) {
    const keys = fn(item);
    const arr = Array.isArray(keys) ? keys : [keys];

    for (const key of arr) {
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
  }

  return counts;
}

export function getProp(props, name, type) {
  const prop = props?.[name];
  if (!prop) return type === "multi_select" ? [] : null;

  switch (type) {
    case "title":
      return prop.title?.map(t => t.plain_text).join("").trim() || null;

    case "rich_text":
      return prop.rich_text?.map(t => t.plain_text).join("").trim() || null;

    case "select":
      return prop.select?.name || null;

    case "multi_select":
      return prop.multi_select?.map(o => o.name).filter(Boolean) || [];

    case "status":
      return prop.status?.name || null;

    case "number":
      return prop.number ?? null;

    case "url":
      return prop.url || null;

    case "email":
      return prop.email || null;

    case "phone_number":
      return prop.phone_number || null;

    case "date":
      return prop.date?.start || null;

    case "relation":
      return prop.relation?.map(r => r.id) || [];

    default:
      return null;
  }
}

function getFirstMatchingProp(props, names) {
  for (const name of names) {
    if (props?.[name]) return props[name];
  }
  return null;
}

export function getTagValuesFlexible(props, names) {
  const prop = getFirstMatchingProp(props, names);
  if (!prop) return [];

  if (prop.multi_select) {
    return prop.multi_select.map(o => o.name).filter(Boolean);
  }

  if (prop.select?.name) {
    return [prop.select.name];
  }

  if (prop.status?.name) {
    return [prop.status.name];
  }

  if (prop.rich_text?.length) {
    const text = prop.rich_text.map(t => t.plain_text).join("").trim();
    return text ? [text] : [];
  }

  if (prop.title?.length) {
    const text = prop.title.map(t => t.plain_text).join("").trim();
    return text ? [text] : [];
  }

  return [];
}

export function normalizePerson(page) {
  const props = page.properties;

  if (!window.__loggedIndustryDebug) {
    console.log("ALL PROPERTY KEYS:", Object.keys(props));
    console.log("FULL PROPERTIES OBJECT:", props);
    console.log("RAW Jobs / Industry:", props["Jobs / Industry"]);
    console.log("RAW Industry:", props["Industry"]);
    console.log("RAW Job / Industry:", props["Job / Industry"]);
    window.__loggedIndustryDebug = true;
  }

  return {
    id: page.id,
    name: getProp(props, "Name", "title"),
    category: getProp(props, "Category", "multi_select"),
    relationshipStrength: getProp(props, "Relationship Strength", "number"),
    layer: getProp(props, "Layer", "select"),
    clientStatus: getProp(props, "Client Status", "select"),
    clientProbability: getProp(props, "Client Probability", "number"),
    industry: getTagValuesFlexible(props, [
      "Jobs / Industry",
      "Job / Industry",
      "Jobs/Industry",
      "Industry",
      "Job Industry"
    ]),
    cityCountry: getProp(props, "City/Country", "select"),
    phone: getProp(props, "Phone", "phone_number"),
    email: getProp(props, "Email", "email"),
    connectedFrom: getProp(props, "Connected From", "relation"),
    connectedTo: getProp(props, "Connected To", "relation"),
    metVia: getProp(props, "Met Via", "select"),
    notes: getProp(props, "Notes", "rich_text"),
    socialMedia: getProp(props, "Social Media", "url"),
    referredBy: getProp(props, "Referred By", "rich_text"),
    createdTime: page.created_time || null,
  };
}

export function normalizeEdge(page) {
  const props = page.properties;

  return {
    id: page.id,
    edgeLabel:
      getProp(props, "Edge Label", "title") ||
      getProp(props, "Edge Label", "rich_text") ||
      null,
    personA: getProp(props, "Person A", "relation")?.[0] || null,
    personB: getProp(props, "Person B", "relation")?.[0] || null,
    strength: getProp(props, "Strength", "number"),
    notes: getProp(props, "Notes", "rich_text"),
    createdTime: page.created_time || null,
  };
}

export function buildMergedEdges(people, edges) {
  const peopleById = Object.fromEntries(people.map(p => [p.id, p]));

  return edges
    .map(edge => ({
      ...edge,
      personAName: peopleById[edge.personA]?.name || "Unknown",
      personBName: peopleById[edge.personB]?.name || "Unknown",
      personAData: peopleById[edge.personA] || null,
      personBData: peopleById[edge.personB] || null,
    }))
    .filter(edge => edge.personA && edge.personB);
}

export function dominantCategory(categories) {
  return Array.isArray(categories) && categories.length > 0 ? categories[0] : null;
}
