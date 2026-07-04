export async function fetchPeople() {
  const res = await fetch("/api/people");
  if (!res.ok) throw new Error("Failed to fetch people");
  return res.json();
}

export async function fetchEdges() {
  const res = await fetch("/api/edges");
  if (!res.ok) throw new Error("Failed to fetch edges");
  return res.json();
}
