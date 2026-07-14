// stats.js
// Renders KPI cards and Chart.js visualizations from normalized people data.

import { countBy } from "./data-utils.js";

// ─── Chart registry ───────────────────────────────────────────────────────────
// Keep references so we can destroy before re-rendering.
const charts = {};

export function clearCharts() {
  for (const [key, chart] of Object.entries(charts)) {
    chart?.destroy();
    delete charts[key];
  }
}

// ─── Color palettes ───────────────────────────────────────────────────────────
const PALETTE = [
  "#01696f", "#437a22", "#006494", "#7a39bb",
  "#da7101", "#d19900", "#a12c7b", "#a13544",
  "#4f98a3", "#6daa45", "#5591c7", "#a86fdf",
  "#fdab43", "#e8af34", "#d163a7", "#dd6974",
];

function paletteColors(n) {
  return Array.from({ length: n }, (_, i) => PALETTE[i % PALETTE.length]);
}

// ─── Chart.js base options ────────────────────────────────────────────────────
function doughnutOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: { boxWidth: 12, padding: 14, font: { size: 12 } },
      },
      title: {
        display: !!title,
        text: title,
        font: { size: 14, weight: "600" },
        padding: { bottom: 12 },
      },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed / ctx.dataset.data.reduce((a, b) => a + b, 0) * 100)}%)`,
        },
      },
    },
  };
}

function barOptions(title, { horizontal = false } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? "y" : "x",
    plugins: {
      legend: { display: false },
      title: {
        display: !!title,
        text: title,
        font: { size: 14, weight: "600" },
        padding: { bottom: 12 },
      },
    },
    scales: {
      x: { grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 11 } } },
      y: { grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 11 } } },
    },
  };
}

function lineOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: !!title,
        text: title,
        font: { size: 14, weight: "600" },
        padding: { bottom: 12 },
      },
    },
    scales: {
      x: { grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 11 } } },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { font: { size: 11 }, stepSize: 1 },
      },
    },
  };
}

// ─── Chart factory ────────────────────────────────────────────────────────────
function makeChart(key, canvasId, type, data, options) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn(`[stats] Canvas not found: ${canvasId}`);
    return;
  }
  charts[key]?.destroy();
  charts[key] = new Chart(canvas, { type, data, options });
}

// ─── KPI cards ────────────────────────────────────────────────────────────────
export function renderKPIs(people) {
  const total     = people.length;
  const clients   = people.filter(p => p.clientStatus === "Active Client").length;
  const prospects = people.filter(p => p.clientStatus === "Prospect").length;
  const strong    = people.filter(p => p.relationshipStrength === "Strong").length;

  setKPI("kpi-total",     total);
  setKPI("kpi-clients",   clients);
  setKPI("kpi-prospects", prospects);
  setKPI("kpi-strong",    strong);
}

function setKPI(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ─── Main render entry ────────────────────────────────────────────────────────
export function renderStats(people) {
  if (!people?.length) {
    console.warn("[stats] renderStats called with empty people array");
    return;
  }

  clearCharts();
  renderKPIs(people);

  // 1. Category (doughnut) ─────────────────────────────────────────────────
  const categoryCounts = countBy(people, p => p.category || []);
  const categoryLabels = Object.keys(categoryCounts);
  const categoryData   = categoryLabels.map(k => categoryCounts[k]);

  makeChart("category", "chart-category", "doughnut", {
    labels:   categoryLabels,
    datasets: [{
      data:            categoryData,
      backgroundColor: paletteColors(categoryLabels.length),
      borderWidth:     2,
      borderColor:     "#ffffff",
    }],
  }, doughnutOptions("Category"));

  // 2. Layer (doughnut) ─────────────────────────────────────────────────────
  const layerCounts = countBy(people, p => p.layer ? [p.layer] : []);
  const layerLabels = Object.keys(layerCounts);
  const layerData   = layerLabels.map(k => layerCounts[k]);

  makeChart("layer", "chart-layer", "doughnut", {
    labels:   layerLabels,
    datasets: [{
      data:            layerData,
      backgroundColor: paletteColors(layerLabels.length),
      borderWidth:     2,
      borderColor:     "#ffffff",
    }],
  }, doughnutOptions("Layer"));

  // 3. Relationship strength (bar) ──────────────────────────────────────────
  const STRENGTH_ORDER = ["Strong", "Medium", "Weak", "Unknown"];
  const strengthCounts = countBy(people, p => p.relationshipStrength ? [p.relationshipStrength] : []);
  const strengthLabels = STRENGTH_ORDER.filter(k => strengthCounts[k]);
  const strengthData   = strengthLabels.map(k => strengthCounts[k]);

  makeChart("strength", "chart-strength", "bar", {
    labels:   strengthLabels,
    datasets: [{
      label:           "People",
      data:            strengthData,
      backgroundColor: paletteColors(strengthLabels.length),
      borderRadius:    4,
    }],
  }, barOptions("Relationship Strength"));

  // 4. Client status pipeline (bar) ─────────────────────────────────────────
  const STATUS_ORDER = ["Active Client", "Past Client", "Prospect", "Cold Lead", "Not a Client"];
  const statusCounts  = countBy(people, p => p.clientStatus ? [p.clientStatus] : []);
  const statusLabels  = STATUS_ORDER.filter(k => statusCounts[k]);
  const statusData    = statusLabels.map(k => statusCounts[k]);

  makeChart("status", "chart-status", "bar", {
    labels:   statusLabels,
    datasets: [{
      label:           "People",
      data:            statusData,
      backgroundColor: paletteColors(statusLabels.length),
      borderRadius:    4,
    }],
  }, barOptions("Client Status Pipeline", { horizontal: true }));

  // 5. Client probability buckets (bar) ─────────────────────────────────────
  const PROB_BUCKETS = [
    { label: "0–25%",   min: 0,  max: 25  },
    { label: "26–50%",  min: 26, max: 50  },
    { label: "51–75%",  min: 51, max: 75  },
    { label: "76–100%", min: 76, max: 100 },
  ];
  const probLabels = PROB_BUCKETS.map(b => b.label);
  const probData   = PROB_BUCKETS.map(b =>
    people.filter(p =>
      p.clientProbability != null &&
      p.clientProbability >= b.min &&
      p.clientProbability <= b.max
    ).length
  );

  makeChart("probability", "chart-probability", "bar", {
    labels:   probLabels,
    datasets: [{
      label:           "People",
      data:            probData,
      backgroundColor: paletteColors(probLabels.length),
      borderRadius:    4,
    }],
  }, barOptions("Client Probability"));

  // 6. City distribution (bar, horizontal) ──────────────────────────────────
  const cityCounts  = countBy(people, p => p.cityCountry ? [p.cityCountry] : []);
  const cityEntries = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const cityLabels  = cityEntries.map(([k]) => k);
  const cityData    = cityEntries.map(([, v]) => v);

  makeChart("city", "chart-city", "bar", {
    labels:   cityLabels,
    datasets: [{
      label:           "People",
      data:            cityData,
      backgroundColor: paletteColors(cityLabels.length),
      borderRadius:    4,
    }],
  }, barOptions("City Distribution", { horizontal: true }));

  // 7. Growth over time (line) ──────────────────────────────────────────────
  const dated = people
    .filter(p => p.createdTime)
    .map(p => p.createdTime.slice(0, 7))   // "YYYY-MM"
    .sort();

  const monthCounts = countBy(dated, m => [m]);
  const monthLabels = Object.keys(monthCounts).sort();
  let   cumulative  = 0;
  const growthData  = monthLabels.map(m => {
    cumulative += monthCounts[m];
    return cumulative;
  });

  makeChart("growth", "chart-growth", "line", {
    labels:   monthLabels,
    datasets: [{
      label:           "Total Contacts",
      data:            growthData,
      borderColor:     PALETTE[0],
      backgroundColor: PALETTE[0] + "22",
      fill:            true,
      tension:         0.35,
      pointRadius:     3,
    }],
  }, lineOptions("Growth Over Time"));

  // 8. Jobs / Industry (doughnut) ───────────────────────────────────────────
  // industry is already string[] from normalizePerson — treat exactly like category.
  const industryCounts = countBy(people, p => p.industry || []);
  const industryLabels = Object.keys(industryCounts);
  const industryData   = industryLabels.map(k => industryCounts[k]);

  makeChart("industry", "chart-industry", "doughnut", {
    labels:   industryLabels,
    datasets: [{
      data:            industryData,
      backgroundColor: paletteColors(industryLabels.length),
      borderWidth:     2,
      borderColor:     "#ffffff",
    }],
  }, doughnutOptions("Jobs / Industry"));
}
