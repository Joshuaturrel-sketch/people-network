// data-utils.js

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

    case "number":
      return prop.number ?? null;

    case "relation":
      return prop.relation?.map(r => r.id) || [];

    case "date":
      return prop.date?.start || null;

    default:
      return null;
  }
}

export function normalizePerson(page) {
  const props = page.properties;

  return {
    id: page.id,
    name: getProp(props, "Name", "title"),
    category: getProp(props, "Category", "multi_select"),
    relationshipStrength: getProp(props, "Relationship Strength", "number"),
    layer: getProp(props, "Layer", "select"),
    clientStatus: getProp(props, "Client Status", "select"),
    clientProbability: getProp(props, "Client Probability", "number"),
    industry: getProp(props, "Jobs / Industry", "multi_select"),
    cityCountry: getProp(props, "City/Country", "select"),
    connectedFrom: getProp(props, "Connected From", "relation"),
    connectedTo: getProp(props, "Connected To", "relation"),
    createdTime: page.created_time || null
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
    createdTime: page.created_time || null
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
      personBData: peopleById[edge.personB] || null
    }))
    .filter(edge => edge.personA && edge.personB);
}
