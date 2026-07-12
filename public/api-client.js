export async function fetchPeople() {
  const r = await fetch("/api/people");
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Failed to load people");
  return data;
}

export async function fetchEdges() {
  const r = await fetch("/api/edges");
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Failed to load edges");
  return data;
}
