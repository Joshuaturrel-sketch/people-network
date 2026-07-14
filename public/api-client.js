// api-client.js
// Fetches and normalizes data from the backend API.

import { CONFIG } from "./config.js";
import { normalizePerson, normalizeEdge } from "./data-utils.js";

export async function fetchPeople() {
  const res = await fetch(CONFIG.API_PEOPLE);
  if (!res.ok) throw new Error(`[api-client] people fetch failed: ${res.status}`);
  const { results } = await res.json();
  return results.map(normalizePerson);
}

export async function fetchEdges() {
  const res = await fetch(CONFIG.API_EDGES);
  if (!res.ok) throw new Error(`[api-client] edges fetch failed: ${res.status}`);
  const { results } = await res.json();
  return results.map(normalizeEdge);
}
