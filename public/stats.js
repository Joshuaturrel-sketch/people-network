// stats.js
// Renders KPI cards and all Chart.js charts from normalized people data.

import { countBy } from "./data-utils.js";

const charts = {};

export function clearCharts() {
  for (const [key, chart] of Object.entries(charts)) {
    chart?.destroy();
    delete charts[key];
  }
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = [
  "#01696f","#437a22","#006494","#7a39bb",
  "#da7101","#d19900","#a12c7b","#a13544",
  "#4f98a3","#6daa45","#5591c7","#a86fdf",
  "#fdab43","#e8af34","#d163a7","#dd6974",
];

function colors(n) {
  return Array.from({ length: n }, (_, i) => PALETTE[i % PALETTE.length]);
}

// ─── Chart option builders ────────────────────────────────────────────────────
function doughnutOpts(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "right", labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
      title: { display: !!title, text: title, font: { size: 13, weight: "600" }, padding: { bottom: 10 } },
      tooltip: {
        callbacks: {
          label: ctx => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            return ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed / total * 100)}%)`;
          },
        },
      },
    },
  };
}

function barOpts(title, horizontal = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? "y" : "x",
    plugins: {
      legend: { display: false },
      title: { display: !!title, text: title, font: { size: 13, weight: "600" }, padding: { bottom: 10 } },
    },
    scales: {
      x: { grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 11 } } },
      y: { grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 11 } } },
    },
  };
}

function lineOpts(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: !!title, text: title, font: { size: 13, weight: "600" }, padding: { bottom: 10 } },
    },
    scales: {
      x: { grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 11 }, stepSize: 1 } },
    },
  };
}

// ─── Chart factory ────────────────────────────────────────────────────────────
function makeChart(key, canvasId, type, data, options) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) { console.warn(`[stats] canvas not found: ${canvasId}`); return; }
  charts[key]?.destroy();
  charts[key] = new Chart(canvas, { type, data, options });
}

// ─── KPI cards ────────────────────────────────────────────────────────────────
export function renderKPIs(people) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("kpi-total",     people.length);
  set("kpi-clients",   people.filter(p => p.clientStatus === "Active Client").length);
  set("kpi-prospects", people.filter(p => p.clientStatus === "Prospect").length);
  set("kpi-strong",    people.filter(p => p.relationshipStrength === "Strong").length);
}

// ─── Main render ──────────────────────────────────────────────────────────────
export function renderStats(people) {
  if (!people?.length) { console.warn("[stats] no people to render"); return; }

  clearCharts();
  renderKPIs(people);

  // 1 — Category
  const catCounts = countBy(people, p => p.category || []);
  const catLabels = Object.keys(catCounts);
  makeChart("category", "chart-category", "doughnut", {
    labels: catLabels,
    datasets: [{ data: catLabels.map(k => catCounts[k]), backgroundColor: colors(catLabels.length), borderWidth: 2, borderColor: "#fff" }],
  }, doughnutOpts("Category"));

  // 2 — Layer
  const layerCounts = countBy(people, p => p.layer ? [p.layer] : []);
  const layerLabels = Object.keys(layerCounts);
  makeChart("layer", "chart-layer", "doughnut", {
    labels: layerLabels,
    datasets: [{ data: layerLabels.map(k => layerCounts[k]), backgroundColor: colors(layerLabels.length), borderWidth: 2, borderColor: "#fff" }],
  }, doughnutOpts("Layer"));

  // 3 — Relationship Strength
  const STRENGTH_ORDER = ["Strong", "Medium", "Weak"];
  const sCounts = countBy(people, p => p.relationshipStrength ? [p.relationshipStrength] : []);
  const sLabels = STRENGTH_ORDER.filter(k => sCounts[k]);
  makeChart("strength", "chart-strength", "bar", {
    labels: sLabels,
    datasets: [{ data: sLabels.map(k => sCounts[k]), backgroundColor: colors(sLabels.length), borderRadius: 4 }],
  }, barOpts("Relationship Strength"));

  // 4 — Client Status Pipeline
  const STATUS_ORDER = ["Active Client","Past Client","Prospect","Cold Lead","Not a Client"];
  const stCounts = countBy(people, p => p.clientStatus ? [p.clientStatus] : []);
  const stLabels = STATUS_ORDER.filter(k => stCounts[k]);
  makeChart("status", "chart-status", "bar", {
    labels: stLabels,
    datasets: [{ data: stLabels.map(k => stCounts[k]), backgroundColor: colors(stLabels.length), borderRadius: 4 }],
  }, barOpts("Client Status Pipeline", true));

  // 5 — Client Probability Buckets
  const PROB = [
    { label: "0–25%",   min: 0,  max: 25  },
    { label: "26–50%",  min: 26, max: 50  },
    { label: "51–75%",  min: 51, max: 75  },
    { label: "76–100%", min: 76, max: 100 },
  ];
  makeChart("probability", "chart-probability", "bar", {
    labels: PROB.map(b => b.label),
    datasets: [{
      data: PROB.map(b => people.filter(p => p.clientProbability != null && p.clientProbability >= b.min && p.clientProbability <= b.max).length),
      backgroundColor: colors(PROB.length),
      borderRadius: 4,
    }],
  }, barOpts("Client Probability"));

  // 6 — City Distribution
  const cityCounts = countBy(people, p => p.cityCountry ? [p.cityCountry] : []);
  const cityEntries = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  makeChart("city", "chart-city", "bar", {
    labels: cityEntries.map(([k]) => k),
    datasets: [{ data: cityEntries.map(([, v]) => v), backgroundColor: colors(cityEntries.length), borderRadius: 4 }],
  }, barOpts("City Distribution", true));

  // 7 — Growth Over Time
  const dated = people.filter(p => p.createdTime).map(p => p.createdTime.slice(0, 7)).sort();
  const monthCounts = countBy(dated, m => [m]);
  const monthLabels = Object.keys(monthCounts).sort();
  let cum = 0;
  makeChart("growth", "chart-growth", "line", {
    labels: monthLabels,
    datasets: [{
      label: "Total Contacts",
      data: monthLabels.map(m => { cum += monthCounts[m]; return cum; }),
      borderColor: PALETTE[0],
      backgroundColor: PALETTE[0] + "22",
      fill: true,
      tension: 0.35,
      pointRadius: 3,
    }],
  }, lineOpts("Growth Over Time"));

  // 8 — Jobs / Industry (identical pattern to Category)
  const indCounts = countBy(people, p => p.industry || []);
  const indLabels = Object.keys(indCounts);
  makeChart("industry", "chart-industry", "doughnut", {
    labels: indLabels,
    datasets: [{ data: indLabels.map(k => indCounts[k]), backgroundColor: colors(indLabels.length), borderWidth: 2, borderColor: "#fff" }],
  }, doughnutOpts("Jobs / Industry"));
}
