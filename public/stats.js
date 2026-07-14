import {
  countBy,
  bucketStrength,
  bucketProbability,
  monthKey,
  topEntries
} from "./data-utils.js";

const charts = {};

const PALETTE = [
  "#4f98a3",
  "#6daa45",
  "#5591c7",
  "#a86fdf",
  "#fdab43",
  "#e8af34",
  "#d163a7",
  "#dd6974",
  "#227f8b",
  "#4d8f25",
  "#3b78ab",
  "#9250d0"
];

function getColors(n) {
  return Array.from({ length: n }, (_, i) => PALETTE[i % PALETTE.length]);
}

export function clearCharts() {
  Object.values(charts).forEach(chart => chart?.destroy());
  Object.keys(charts).forEach(key => delete charts[key]);
}

function kpi(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

export function renderKPIs(people) {
  kpi("kpi-total", people.length);
  kpi("kpi-clients", people.filter(p => p.clientStatus === "Already Client").length);
  kpi("kpi-potential", people.filter(p => p.clientStatus === "Potential Client").length);
  kpi("kpi-avg-strength", average(people.map(p => p.relationshipStrength)).toFixed(1));
}

function average(values) {
  const clean = values.filter(v => typeof v === "number");
  if (!clean.length) return 0;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function chartTitle(title) {
  return {
    display: true,
    text: title,
    color: "#cdccca",
    font: {
      size: 14,
      weight: "600"
    },
    padding: {
      bottom: 10
    }
  };
}

function basePlugins(title, showLegend = true) {
  return {
    legend: {
      display: showLegend,
      position: "bottom",
      labels: {
        color: "#cdccca",
        boxWidth: 12,
        padding: 12
      }
    },
    title: chartTitle(title),
    tooltip: {
      callbacks: {
        label: ctx => ` ${ctx.label}: ${ctx.parsed}`
      }
    }
  };
}

function doughnutOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: basePlugins(title, true)
  };
}

function barOptions(title, horizontal = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? "y" : "x",
    plugins: basePlugins(title, false),
    scales: {
      x: {
        ticks: { color: "#bab9b4" },
        grid: { color: "rgba(255,255,255,0.08)" }
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#bab9b4" },
        grid: { color: "rgba(255,255,255,0.08)" }
      }
    }
  };
}

function lineOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: basePlugins(title, false),
    scales: {
      x: {
        ticks: { color: "#bab9b4" },
        grid: { color: "rgba(255,255,255,0.08)" }
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#bab9b4" },
        grid: { color: "rgba(255,255,255,0.08)" }
      }
    }
  };
}

function makeChart(key, canvasId, type, data, options) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  charts[key]?.destroy();
  charts[key] = new Chart(canvas, { type, data, options });
}

export function renderStats(people) {
  clearCharts();
  renderKPIs(people);

  const categoryCounts = countBy(people, p => p.category || []);
  const categoryLabels = Object.keys(categoryCounts);

  makeChart("category", "chart-category", "doughnut", {
    labels: categoryLabels,
    datasets: [{
      data: categoryLabels.map(k => categoryCounts[k]),
      backgroundColor: getColors(categoryLabels.length),
      borderColor: "#1c1b19",
      borderWidth: 2
    }]
  }, doughnutOptions("Category"));

  const statusCounts = countBy(people, p => p.clientStatus ? [p.clientStatus] : []);
  const statusLabels = Object.keys(statusCounts);

  makeChart("status", "chart-status", "bar", {
    labels: statusLabels,
    datasets: [{
      data: statusLabels.map(k => statusCounts[k]),
      backgroundColor: getColors(statusLabels.length),
      borderRadius: 6
    }]
  }, barOptions("Client Status"));

  const strengthCounts = countBy(people, p => [bucketStrength(p.relationshipStrength)]);
  const strengthOrder = ["1–2", "3–4", "5–6", "7–8", "9–10", "Unknown"];
  const strengthLabels = strengthOrder.filter(label => strengthCounts[label]);

  makeChart("strength", "chart-strength", "bar", {
    labels: strengthLabels,
    datasets: [{
      data: strengthLabels.map(k => strengthCounts[k]),
      backgroundColor: getColors(strengthLabels.length),
      borderRadius: 6
    }]
  }, barOptions("Relationship Strength"));

  const probabilityCounts = countBy(people, p => [bucketProbability(p.clientProbability)]);
  const probabilityOrder = ["0–25%", "26–50%", "51–75%", "76–100%", "Unknown"];
  const probabilityLabels = probabilityOrder.filter(label => probabilityCounts[label]);

  makeChart("probability", "chart-probability", "bar", {
    labels: probabilityLabels,
    datasets: [{
      data: probabilityLabels.map(k => probabilityCounts[k]),
      backgroundColor: getColors(probabilityLabels.length),
      borderRadius: 6
    }]
  }, barOptions("Client Probability"));

  const industryCounts = countBy(people, p => p.industry || []);
  const industryEntries = topEntries(industryCounts, 10);
  const industryLabels = industryEntries.map(([label]) => label);

  makeChart("industry", "chart-industry", "doughnut", {
    labels: industryLabels,
    datasets: [{
      data: industryEntries.map(([, value]) => value),
      backgroundColor: getColors(industryLabels.length),
      borderColor: "#1c1b19",
      borderWidth: 2
    }]
  }, doughnutOptions("Jobs / Industry"));

  const cityCounts = countBy(people, p => p.cityCountry ? [p.cityCountry] : []);
  const cityEntries = topEntries(cityCounts, 12);
  const cityLabels = cityEntries.map(([label]) => label);

  makeChart("city", "chart-city", "bar", {
    labels: cityLabels,
    datasets: [{
      data: cityEntries.map(([, value]) => value),
      backgroundColor: getColors(cityLabels.length),
      borderRadius: 6
    }]
  }, barOptions("City Distribution", true));

  const layerCounts = countBy(people, p => p.layer ? [p.layer] : []);
  const layerLabels = Object.keys(layerCounts);

  makeChart("layer", "chart-layer", "doughnut", {
    labels: layerLabels,
    datasets: [{
      data: layerLabels.map(k => layerCounts[k]),
      backgroundColor: getColors(layerLabels.length),
      borderColor: "#1c1b19",
      borderWidth: 2
    }]
  }, doughnutOptions("Layer"));

  const monthCounts = countBy(
    people.filter(p => monthKey(p.createdTime)),
    p => [monthKey(p.createdTime)]
  );

  const monthLabels = Object.keys(monthCounts).sort();
  let cumulative = 0;
  const cumulativeData = monthLabels.map(month => {
    cumulative += monthCounts[month];
    return cumulative;
  });

  makeChart("growth", "chart-growth", "line", {
    labels: monthLabels,
    datasets: [{
      label: "Contacts",
      data: cumulativeData,
      borderColor: "#4f98a3",
      backgroundColor: "rgba(79, 152, 163, 0.15)",
      tension: 0.35,
      fill: true,
      pointRadius: 3
    }]
  }, lineOptions("Growth Over Time"));
}
