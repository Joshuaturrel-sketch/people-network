// api/notion.js — Vercel serverless function
// Place at: /api/notion.js in your Vercel project root
// Required env vars: NOTION_TOKEN, NOTION_DATABASE_ID

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!token || !databaseId) {
    return res.status(500).json({ error: 'Missing NOTION_TOKEN or NOTION_DATABASE_ID env vars' });
  }

  try {
    const people = [];
    let cursor = undefined;

    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;

      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
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
        return res.status(response.status).json({ error: err.message || 'Notion API error' });
      }

      const data = await response.json();

      for (const page of data.results) {
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

        people.push({
          id:                   page.id,
          name:                 text(p['Name']),
          category:             multi(p['Category']),
          layer:                sel(p['Layer']),
          relationshipStrength: num(p['Relationship Strength']),
          connectedTo:          rel(p['Connected To']),
          connectedFrom:        rel(p['Connected From']),
          clientStatus:         sel(p['Client Status']),
          // clientProbability: Notion stores as float 0–1 (0.75 = 75%)
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
        });
      }

      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    return res.status(200).json({ people });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
