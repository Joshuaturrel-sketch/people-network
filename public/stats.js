import { CATEGORY_COLORS, INDUSTRY_OPTIONS } from "./config.js";
import { countBy } from "./data-utils.js";

let charts = [];

function clearCharts() {
  charts.forEach(chart => chart.destroy());
  charts = [];
}

export function renderStats(people) {
  clearCharts();
  renderKPIs(people);

  const categoryCounts = countBy(people, p => p.category);
  const industryCounts = countBy(people, p => p.industry);
  const layerCounts = countBy(people, p => [p.layer]);
  const clientStatusCounts = countBy(people, p => [p.clientStatus]);
  const cityCounts = countBy(
    people.filter(p => p.cityCountry?.trim()),
    p => [p.cityCountry.split(",")[0].trim()]
  );

  const strengthBuckets = { "1–2": 0, "3–4": 0, "5–6": 0, "7–8": 0, "9–10": 0 };
  people.forEach(p => {
    const v = p.relationshipStrength;
    if (v >= 1 && v <= 2) strengthBuckets["1–2"]++;
    else if (v >= 3 && v <= 4) strengthBuckets["3–4"]++;
    else if (v >= 5 && v <= 6) strengthBuckets["5–6"]++;
    else if (v >= 7 && v <= 8) strengthBuckets["7–8"]++;
    else if (v >= 9 && v <= 10) strengthBuckets["9–10"]++;
  });

  const probabilityBuckets = { "0–25%": 0, "25–50%": 0, "50–75%": 0, "75–100%": 0 };
  people.forEach(p => {
    if (p.clientProbability == null) return;
    if (p.clientProbability < 0.25) probabilityBuckets["0–25%"]++;
    else if (p.clientProbability < 0.5) probabilityBuckets["25–50%"]++;
    else if (p.clientProbability < 0.75) probabilityBuckets["50–75%"]++;
    else probabilityBuckets["75–100%"]++;
  });

  const growthCounts = {};
  people.forEach(p => {
    const d = new Date(p.createdTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    growthCounts[key] = (growthCounts[key] || 0) + 1;
  });

  charts.push(new Chart(document.getElementById("categoryChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(categoryCounts),
      datasets: [{
        data: Object.values(categoryCounts),
        backgroundColor: Object.keys(categoryCounts).map(k => CATEGORY_COLORS[k] || "#bab9b4")
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  }));

  charts.push(new Chart(document.getElementById("industryChart"), {
    type: "bar",
    data: {
      labels: INDUSTRY_OPTIONS,
      datasets: [{
        label: "Contacts",
        data: INDUSTRY_OPTIONS.map(k => industryCounts[k] || 0),
        backgroundColor: "#01696f"
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { beginAtZero: true } }
    }
  }));

  charts.push(new Chart(document.getElementById("layerChart"), {
    type: "pie",
    data: {
      labels: Object.keys(layerCounts),
      datasets: [{
        data: Object.values(layerCounts),
        backgroundColor: ["#01696f", "#d19900", "#bab9b4"]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  }));

  charts.push(new Chart(document.getElementById("pipelineChart"), {
    type: "bar",
    data: {
      labels: ["Clients"],
      datasets: [
        { label: "Potential Client", data: [clientStatusCounts["Potential Client"] || 0], backgroundColor: "#f472b6" },
        { label: "Already Client", data: [clientStatusCounts["Already Client"] || 0], backgroundColor: "#ef4444" },
        { label: "Former Client", data: [clientStatusCounts["Former Client"] || 0], backgroundColor: "#9ca3af" }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true }
      }
    }
  }));

  charts.push(new Chart(document.getElementById("strengthChart"), {
    type: "bar",
    data: {
      labels: Object.keys(strengthBuckets),
      datasets: [{
        label: "Contacts",
        data: Object.values(strengthBuckets),
        backgroundColor: "#437a22"
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  }));

  charts.push(new Chart(document.getElementById("probabilityChart"), {
    type: "bar",
    data: {
      labels: Object.keys(probabilityBuckets),
      datasets: [{
        label: "Contacts",
        data: Object.values(probabilityBuckets),
        backgroundColor: "#da7101"
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  }));

  const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  charts.push(new Chart(document.getElementById("cityChart"), {
    type: "bar",
    data: {
      labels: topCities.map(([city]) => city),
      datasets: [{
        label: "Contacts",
        data: topCities.map(([, count]) => count),
        backgroundColor: "#7a7974"
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  }));

  const growthKeys = Object.keys(growthCounts).sort();
  charts.push(new Chart(document.getElementById("growthChart"), {
    type: "line",
    data: {
      labels: growthKeys,
      datasets: [{
        label: "Contacts Added",
        data: growthKeys.map(k => growthCounts[k]),
        borderColor: "#01696f",
        backgroundColor: "#01696f",
        tension: 0.25,
        fill: false
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  }));
}

function renderKPIs(people) {
  const total = people.length;
  const alreadyClients = people.filter(p => p.clientStatus === "Already Client").length;
  const potentialClients = people.filter(p => p.clientStatus === "Potential Client").length;
  const averageStrength = total
    ? (people.reduce((sum, p) => sum + (p.relationshipStrength || 0), 0) / total).toFixed(1)
    : "0.0";
  const knownLocationPct = total
    ? Math.round((people.filter(p => p.cityCountry?.trim()).length / total) * 100)
    : 0;

  document.getElementById("kpis").innerHTML = `
    <div class="kpi"><h3>Total Contacts</h3><p>${total}</p></div>
    <div class="kpi"><h3>Already Clients</h3><p>${alreadyClients}</p></div>
    <div class="kpi"><h3>Potential Clients</h3><p>${potentialClients}</p></div>
    <div class="kpi"><h3>Avg Strength</h3><p>${averageStrength}</p></div>
    <div class="kpi"><h3>Known Location</h3><p>${knownLocationPct}%</p></div>
  `;
}
