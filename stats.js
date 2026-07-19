// stats.js
import { countBy } from "./data-utils.js";

const _charts = {};

export function clearCharts() {
  for (const [id, chart] of Object.entries(_charts)) {
    chart.destroy();
    delete _charts[id];
  }
}

const P = {
  teal: "#01696f",
  orange: "#da7101",
  gold: "#d19900",
  blue: "#006494",
  purple: "#7a39bb",
  green: "#437a22",
  red: "#a13544",
  pink: "#a12c7b",
  brown: "#964219",
  slate: "#4f6070",
};

const COLORS = Object.values(P);

const STATUS_COLORS = {
  "Already Client": P.teal,
  Prospect: P.blue,
  Lead: P.gold,
  Partner: P.purple,
  "Does Not Know Me": P.slate,
};

const FONT = { family: "Inter, sans-serif", size: 11 };

function baseOpts(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: { font: FONT, boxWidth: 10, padding: 12, color: "#cdccca" },
      },
      title: {
        display: !!title,
        text: title,
        font: { ...FONT, size: 12, weight: "600" },
        color: "#cdccca",
        padding: { bottom: 10 },
      },
      tooltip: {
        bodyFont: FONT,
        titleFont: { ...FONT, weight: "600" },
      },
    },
  };
}

function donutOpts(title) {
  return { ...baseOpts(title), cutout: "60%" };
}

function barOpts(title, horizontal = false) {
  const base = baseOpts(title);
  return {
    ...base,
    indexAxis: horizontal ? "y" : "x",
    plugins: { ...base.plugins, legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { font: FONT, color: "#797876" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
      y: {
        ticks: { font: FONT, color: "#797876" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
  };
}

function lineOpts(title) {
  const base = baseOpts(title);
  return {
    ...base,
    plugins: { ...base.plugins, legend: { display: false } },
    scales: {
      x: {
        ticks: { font: FONT, color: "#797876", maxTicksLimit: 12 },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
      y: {
        beginAtZero: true,
        ticks: { font: FONT, color: "#797876" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
  };
}

function make(id, type, data, opts) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  if (_charts[id]) _charts[id].destroy();
  _charts[id] = new Chart(canvas.getContext("2d"), {
    type,
    data,
    options: opts,
  });
}

export function renderKPIs(people, mergedEdges = []) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set("kpi-total", people.length);
  set("kpi-clients", people.filter(p => p.clientStatus === "Already Client").length);
  set("kpi-prospects", people.filter(p => p.clientStatus === "Prospect").length);
  set("kpi-strong", people.filter(p => (p.relationshipStrength || 0) >= 7).length);
  set("kpi-cities", new Set(people.map(p => p.cityCountry).filter(Boolean)).size);
  set("kpi-edges", mergedEdges.length);
}

function chartCategory(people) {
  const counts = countBy(people, p => p.category);
  const labels = Object.keys(counts);

  make("chart-category", "doughnut", {
    labels,
    datasets: [{
      data: labels.map(l => counts[l]),
      backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
      borderWidth: 1,
      borderColor: "#1c1b19",
    }],
  }, donutOpts("By Category"));
}

function chartLayer(people) {
  const counts = countBy(people, p => p.layer);
  const labels = Object.keys(counts);

  make("chart-layer", "doughnut", {
    labels,
    datasets: [{
      data: labels.map(l => counts[l]),
      backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
      borderWidth: 1,
      borderColor: "#1c1b19",
    }],
  }, donutOpts("By Layer"));
}

function chartStrength(people) {
  const buckets = { "1–3": 0, "4–6": 0, "7–8": 0, "9–10": 0 };

  for (const p of people) {
    const v = p.relationshipStrength;
    if (v == null) continue;
    if (v <= 3) buckets["1–3"]++;
    else if (v <= 6) buckets["4–6"]++;
    else if (v <= 8) buckets["7–8"]++;
    else buckets["9–10"]++;
  }

  const labels = Object.keys(buckets);

  make("chart-strength", "bar", {
    labels,
    datasets: [{
      data: labels.map(l => buckets[l]),
      backgroundColor: [P.red, P.orange, P.gold, P.teal],
      borderRadius: 4,
    }],
  }, barOpts("Relationship Strength"));
}

function chartClientStatus(people) {
  const counts = countBy(people, p => p.clientStatus);
  const labels = Object.keys(counts);

  make("chart-status", "bar", {
    labels,
    datasets: [{
      data: labels.map(l => counts[l]),
      backgroundColor: labels.map(l => STATUS_COLORS[l] || P.slate),
      borderRadius: 4,
    }],
  }, barOpts("Client Status", true));
}

function chartProbability(people) {
  const buckets = { "0–25%": 0, "26–50%": 0, "51–75%": 0, "76–100%": 0 };

  for (const p of people) {
    const v = p.clientProbability;
    if (v == null) continue;
    if (v <= 25) buckets["0–25%"]++;
    else if (v <= 50) buckets["26–50%"]++;
    else if (v <= 75) buckets["51–75%"]++;
    else buckets["76–100%"]++;
  }

  const labels = Object.keys(buckets);

  make("chart-probability", "bar", {
    labels,
    datasets: [{
      data: labels.map(l => buckets[l]),
      backgroundColor: [P.red, P.orange, P.gold, P.teal],
      borderRadius: 4,
    }],
  }, barOpts("Client Probability"));
}

function chartCity(people) {
  const counts = countBy(people, p => p.cityCountry);
  const sorted = Object.entries(counts)
    .filter(([label, value]) => label && value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  make("chart-city", "bar", {
    labels: sorted.map(([label]) => label),
    datasets: [{
      data: sorted.map(([, value]) => value),
      backgroundColor: P.blue,
      borderRadius: 4,
    }],
  }, barOpts("Top Cities", true));
}

function chartIndustry(people) {
  const counts = countBy(people, p => {
    const values = Array.isArray(p.industry) ? p.industry : [];
    const clean = values.map(v => String(v).trim()).filter(Boolean);
    return clean.length ? clean : ["Unknown"];
  });

  const sorted = Object.entries(counts)
    .filter(([label, value]) => label && value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  console.log("industry counts", sorted);

  if (!sorted.length) return;

  const labels = sorted.map(([label]) => label);
  const data = sorted.map(([, value]) => value);

  make("chart-industry", "bar", {
    labels,
    datasets: [{
      data,
      backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
      borderRadius: 4,
    }],
  }, barOpts("Jobs / Industry", true));
}

function chartGrowth(people) {
  const monthly = {};

  for (const p of people) {
    const raw = p.createdTime;
    if (!raw) continue;
    const month = raw.slice(0, 7);
    monthly[month] = (monthly[month] || 0) + 1;
  }

  const sorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
  let running = 0;
  const data = sorted.map(([, value]) => {
    running += value;
    return running;
  });

  make("chart-growth", "line", {
    labels: sorted.map(([month]) => month),
    datasets: [{
      data,
      borderColor: P.teal,
      backgroundColor: "rgba(1,105,111,0.10)",
      borderWidth: 2,
      tension: 0.35,
      fill: true,
      pointRadius: 2,
    }],
  }, lineOpts("Network Growth"));
}

function chartEdgeStrength(mergedEdges) {
  const buckets = { "1–3": 0, "4–6": 0, "7–8": 0, "9–10": 0 };

  for (const edge of mergedEdges) {
    const v = edge.strength;
    if (v == null) continue;
    if (v <= 3) buckets["1–3"]++;
    else if (v <= 6) buckets["4–6"]++;
    else if (v <= 8) buckets["7–8"]++;
    else buckets["9–10"]++;
  }

  const labels = Object.keys(buckets);

  make("chart-edge-strength", "bar", {
    labels,
    datasets: [{
      data: labels.map(l => buckets[l]),
      backgroundColor: [P.red, P.orange, P.gold, P.purple],
      borderRadius: 4,
    }],
  }, barOpts("Edge Strength"));
}

export function renderStats(people, mergedEdges = []) {
  if (!people?.length) return;

  clearCharts();
  renderKPIs(people, mergedEdges);

  chartCategory(people);
  chartLayer(people);
  chartStrength(people);
  chartClientStatus(people);
  chartProbability(people);
  chartCity(people);
  chartIndustry(people);
  chartGrowth(people);
  chartEdgeStrength(mergedEdges);
}
