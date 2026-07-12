import { CATEGORY_COLORS } from "./config.js";
import { countBy } from "./data-utils.js";

export let charts = [];

function clearCharts() {
  charts.forEach(chart => chart.destroy());
  charts = [];
}

const axisColor = "#e5e7eb";
const gridColor = "rgba(255,255,255,0.08)";

const JOBS_INDUSTRY_COLOR_MAP = {
  "Forex": "#4f8df7",
  "Other Financial Instruments": "#27c36a",
  "Broker": "#9b5cff",
  "Communications": "#d49461",
  "Marketing": "#ef4d4d",
  "Public Servant": "#edb81f",
  "Other": "#9aa3b2",
  "Politics": "#ef6aa8",
  "Retiree": "#f28a2d",
  "Unemployed": "#7d776e",
  "Self/Employed": "#74cfa8"
};

export function renderStats(people) {
  clearCharts();
  renderKPIs(people);

  const categoryCounts = countBy(people, p => p.category || []);
  const jobsIndustryCounts = countBy(people, p =>
  (p.industry || [])
    .map(v => typeof v === "object" && v?.name ? v.name : v)
    .filter(Boolean)
);
  const raw = Array.isArray(p.industry) ? p.industry : [p.industry];

  return raw
    .map(item => {
      if (!item) return null;
      if (typeof item === "string") return item.trim();
      if (typeof item === "object" && item.name) return item.name.trim();
      return String(item).trim();
    })
    .filter(Boolean);
});
  const layerCounts = countBy(people, p => [p.layer || "Unknown"]);
  const clientStatusCounts = countBy(people, p => [p.clientStatus || "Unknown"]);
  const cityCounts = countBy(
    people.filter(p => p.cityCountry?.trim()),
    p => [p.cityCountry.split(",")[0].trim()]
  );

  const strengthBuckets = { "1–2": 0, "3–4": 0, "5–6": 0, "7–8": 0, "9–10": 0 };
  people.forEach(p => {
    const v = p.relationshipStrength || 0;
    if (v >= 1 && v <= 2) strengthBuckets["1–2"]++;
    else if (v <= 4) strengthBuckets["3–4"]++;
    else if (v <= 6) strengthBuckets["5–6"]++;
    else if (v <= 8) strengthBuckets["7–8"]++;
    else if (v <= 10) strengthBuckets["9–10"]++;
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
    if (!p.createdTime) return;
    const d = new Date(p.createdTime);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    growthCounts[key] = (growthCounts[key] || 0) + 1;
  });

  charts.push(new Chart(document.getElementById("categoryChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(categoryCounts),
      datasets: [{
        data: Object.values(categoryCounts),
        backgroundColor: Object.keys(categoryCounts).map(
          k => CATEGORY_COLORS[k] || "#9ca3af"
        ),
        borderColor: "#1d2126",
        borderWidth: 2
      }]
    },
    options: doughnutOptions()
  }));

  const jobsIndustryLabels = Object.keys(jobsIndustryCounts);
  const jobsIndustryData = Object.values(jobsIndustryCounts);

  charts.push(new Chart(document.getElementById("jobsIndustryChart"), {
  type: "doughnut",
  data: {
    labels: Object.keys(jobsIndustryCounts),
    datasets: [{
      data: Object.values(jobsIndustryCounts),
      backgroundColor: Object.keys(jobsIndustryCounts).map(
        k => JOBS_INDUSTRY_COLOR_MAP[k] || "#9ca3af"
      ),
      borderColor: "#1d2126",
      borderWidth: 2
    }]
  },
  options: doughnutOptions()
}));

  charts.push(new Chart(document.getElementById("layerChart"), {
    type: "pie",
    data: {
      labels: Object.keys(layerCounts),
      datasets: [{
        data: Object.values(layerCounts),
        backgroundColor: ["#0f8b94", "#d9a514", "#6b7280"],
        borderColor: "#1d2126",
        borderWidth: 2
      }]
    },
    options: baseOptions()
  }));

  charts.push(new Chart(document.getElementById("pipelineChart"), {
    type: "bar",
    data: {
      labels: ["Clients"],
      datasets: [
        {
          label: "Potential Client",
          data: [clientStatusCounts["Potential Client"] || 0],
          backgroundColor: "#f472b6",
          maxBarThickness: 40,
          borderRadius: 6
        },
        {
          label: "Already Client",
          data: [clientStatusCounts["Already Client"] || 0],
          backgroundColor: "#ef4444",
          maxBarThickness: 40,
          borderRadius: 6
        },
        {
          label: "Former Client",
          data: [clientStatusCounts["Former Client"] || 0],
          backgroundColor: "#9ca3af",
          maxBarThickness: 40,
          borderRadius: 6
        }
      ]
    },
    options: {
      ...baseOptions(),
      scales: {
        x: {
          stacked: true,
          ticks: { color: axisColor },
          grid: { color: gridColor }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { color: axisColor },
          grid: { color: gridColor }
        }
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
        backgroundColor: "#5ea83a",
        maxBarThickness: 36,
        borderRadius: 6
      }]
    },
    options: barOptions()
  }));

  charts.push(new Chart(document.getElementById("probabilityChart"), {
    type: "bar",
    data: {
      labels: Object.keys(probabilityBuckets),
      datasets: [{
        label: "Contacts",
        data: Object.values(probabilityBuckets),
        backgroundColor: "#df8b1d",
        maxBarThickness: 36,
        borderRadius: 6
      }]
    },
    options: barOptions()
  }));

  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  charts.push(new Chart(document.getElementById("cityChart"), {
    type: "bar",
    data: {
      labels: topCities.map(([city]) => city),
      datasets: [{
        label: "Contacts",
        data: topCities.map(([, count]) => count),
        backgroundColor: "#6b7280",
        maxBarThickness: 24,
        borderRadius: 6
      }]
    },
    options: {
      ...baseOptions(),
      indexAxis: "y",
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: axisColor },
          grid: { color: gridColor }
        },
        y: {
          ticks: { color: axisColor },
          grid: { color: gridColor }
        }
      }
    }
  }));

  const growthKeys = Object.keys(growthCounts).sort();
  charts.push(new Chart(document.getElementById("growthChart"), {
    type: "line",
    data: {
      labels: growthKeys,
      datasets: [{
        label: "Contacts Added",
        data: growthKeys.map(k => growthCounts[k]),
        borderColor: "#0f8b94",
        backgroundColor: "rgba(15, 139, 148, 0.2)",
        tension: 0.25,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: lineOptions()
  }));
}

function renderKPIs(people) {
  const total = people.length;
  const alreadyClients = people.filter(
    p => p.clientStatus === "Already Client"
  ).length;
  const potentialClients = people.filter(
    p => p.clientStatus === "Potential Client"
  ).length;
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

function baseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        labels: { color: axisColor }
      },
      tooltip: {
        backgroundColor: "#111315",
        titleColor: "#f3f4f6",
        bodyColor: "#f3f4f6",
        borderColor: "#2c3238",
        borderWidth: 1
      }
    }
  };
}

function doughnutOptions() {
  return {
    ...baseOptions(),
    cutout: "58%"
  };
}

function barOptions() {
  return {
    ...baseOptions(),
    scales: {
      x: {
        ticks: { color: axisColor },
        grid: { color: gridColor }
      },
      y: {
        beginAtZero: true,
        ticks: { color: axisColor },
        grid: { color: gridColor }
      }
    }
  };
}

function lineOptions() {
  return {
    ...baseOptions(),
    scales: {
      x: {
        ticks: { color: axisColor },
        grid: { color: gridColor }
      },
      y: {
        beginAtZero: true,
        ticks: { color: axisColor },
        grid: { color: gridColor }
      }
    }
  };
}

function normalizeIndustryLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const v = raw.toLowerCase();
  const map = {
    "forex": "Forex",
    "other financial instruments": "Other Financial Instruments",
    "other financial instrument": "Other Financial Instruments",
    "broker": "Broker",
    "communications": "Communications",
    "marketing": "Marketing",
    "public servant": "Public Servant",
    "public servants": "Public Servant",
    "other": "Other",
    "politics": "Politics",
    "retiree": "Retiree",
    "unemployed": "Unemployed",
    "self/employed": "Self/Employed",
    "self employed": "Self/Employed",
    "self-employed": "Self/Employed",
    "self / employed": "Self/Employed"
  };

  return map[v] || raw;
}
