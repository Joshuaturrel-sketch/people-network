// api/notion.js — Vercel serverless function
// Required env vars: NOTION_TOKEN, NOTION_DATABASE_ID, NOTION_EDGES_DATABASE_ID

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token          = process.env.NOTION_TOKEN;
  const databaseId     = process.env.NOTION_DATABASE_ID;
  const edgesDatabaseId = process.env.NOTION_EDGES_DATABASE_ID;

  if (!token || !databaseId || !edgesDatabaseId) {
    return res.status(500).json({ error: 'Missing env vars: NOTION_TOKEN, NOTION_DATABASE_ID, NOTION_EDGES_DATABASE_ID' });
  }

  async function queryAll(dbId) {
    const results = [];
    let cursor = undefined;
    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;
      const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || `Notion API error on db ${dbId}`);
      }
      const data = await response.json();
      results.push(...data.results);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);
    return results;
  }

  try {
    // ── Fetch people ──
    const peoplePages = await queryAll(databaseId);
    const people = peoplePages.map(page => {
      const p = page.properties;

      const text  = (prop) => prop?.rich_text?.[0]?.plain_text ?? prop?.title?.[0]?.plain_text ?? '';
      const sel   = (prop) => prop?.select?.name ?? null;
      const multi = (prop) => prop?.multi_select?.map(o => o.name) ?? [];
      const num   = (prop) => prop?.number ?? null;
      const eml   = (prop) => prop?.email ?? null;
      const ph    = (prop) => prop?.phone_number ?? null;
      const lnk   = (prop) => prop?.url ?? null;
      const dt    = (prop) => prop?.date?.start ?? null;
      const rel   = (prop) => prop?.relation?.map(r => r.id) ?? [];

      return {
        id:                   page.id,
        name:                 text(p['Name']),
        category:             multi(p['Category']),
        layer:                sel(p['Layer']),
        relationshipStrength: num(p['Relationship Strength']),
        connectedTo:          rel(p['Connected To']),
        connectedFrom:        rel(p['Connected From']),
        clientStatus:         sel(p['Client Status']),
        clientProbability:    num(p['Client Probability']),
        metVia:               text(p['Met Via']),
        email:                eml(p['Email']),
        phone:                ph(p['Phone']),
        notes:                text(p['Notes']),
        industrySector:       multi(p['Industry / Sector']),
        lastContacted:        dt(p['Last Contacted']),
        city:                 text(p['City']),
        country:              text(p['Country']),
        dateMet:              dt(p['Date Met']),
        tags:                 multi(p['Tags']),
        linkedin:             lnk(p['LinkedIn']),
        referredBy:           rel(p['Referred By']),
      };
    });

    // ── Fetch edges ──
    const edgePages = await queryAll(edgesDatabaseId);
    const edges = edgePages.map(page => {
      const p = page.properties;
      const rel = (prop) => prop?.relation?.map(r => r.id) ?? [];
      const num  = (prop) => prop?.number ?? null;
      const text = (prop) => prop?.rich_text?.[0]?.plain_text ?? prop?.title?.[0]?.plain_text ?? '';

      const personA = rel(p['Person A']);
      const personB = rel(p['Person B']);

      return {
        id:       page.id,
        label:    text(p['Edge Label']),
        personA:  personA[0] ?? null,
        personB:  personB[0] ?? null,
        strength: num(p['Strength']),
        notes:    text(p['Notes']),
      };
    }).filter(e => e.personA && e.personB); // drop incomplete edges

    return res.status(200).json({ people, edges });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
