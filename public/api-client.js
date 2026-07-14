// api-client.js
import { CONFIG } from "./config.js";
import { normalizePerson, normalizeEdge } from "./data-utils.js";

async function parseJson(res, label) {
  let data = null;

  try {
    data = await res.json();
  } catch {
    throw new Error(`${label} returned non-JSON response (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data?.error || `${label} failed with status ${res.status}`);
  }

  return data;
}

export async function fetchPeople() {
  const res = await fetch(CONFIG.API_PEOPLE, { cache: "no-store" });
  const data = await parseJson(res, "People API");
  return (data.results || []).map(normalizePerson);
}

export async function fetchEdges() {
  const res = await fetch(CONFIG.API_EDGES, { cache: "no-store" });
  const data = await parseJson(res, "Edges API");
  return (data.results || []).map(normalizeEdge);
}
