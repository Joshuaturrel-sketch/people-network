import { CONFIG } from "./config.js";
import { normalizePerson, normalizeEdge } from "./data-utils.js";

async function parseResponse(res, label) {
  let data;

  try {
    data = await res.json();
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }

  if (!res.ok) {
    throw new Error(data?.error || `${label} failed with status ${res.status}`);
  }

  return data;
}

export async function fetchPeople() {
  const res = await fetch(CONFIG.API_PEOPLE, { cache: "no-store" });
  const data = await parseResponse(res, "People API");
  return (data.results || []).map(normalizePerson);
}

export async function fetchEdges() {
  const res = await fetch(CONFIG.API_EDGES, { cache: "no-store" });
  const data = await parseResponse(res, "Edges API");
  return (data.results || []).map(normalizeEdge);
}
